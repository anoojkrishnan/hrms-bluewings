/**
 * reset-db.ts — Dev utility: wipes all data from the database.
 *
 * Usage:
 *   npm run db:reset                   # drop all collections (docs + indexes)
 *   npm run db:reset -- --dry-run      # preview what would be dropped
 *   npm run db:reset -- --tenant <id>  # delete one tenant's docs only (keeps indexes)
 *
 * Full reset (no --tenant):
 *   Drops every non-system collection entirely — removes all documents AND indexes.
 *   Mongoose will recreate indexes on next server start.
 *
 * Single-tenant reset (--tenant <id>):
 *   Deletes only that tenant's documents using deleteMany({tenantId}).
 *   Indexes are kept because other tenants may still have data.
 *
 * The global `permissions` collection is always preserved — it is re-seeded
 * automatically when the server starts.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/hrms';

/**
 * Collections that must never be dropped or cleared.
 * 'permissions' is a global system table re-seeded on every boot.
 */
const PROTECTED_COLLECTIONS = new Set(['permissions']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseArgs(): { tenantId: string | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let tenantId: string | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--tenant' || args[i] === '-t') && args[i + 1]) {
      tenantId = args[++i] ?? null;
    }
    if (args[i] === '--dry-run') dryRun = true;
  }

  return { tenantId, dryRun };
}

function sep(char = '─', len = 68) { return char.repeat(len); }

function fmt(n: number, unit: string) {
  return `${n.toLocaleString()} ${unit}${n !== 1 ? 's' : ''}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { tenantId, dryRun } = parseArgs();
  const isFull = !tenantId;

  console.log('\n' + sep('═'));
  console.log('  HRMS Database Reset');
  console.log(sep('═'));
  console.log(`  URI        : ${MONGO_URI.replace(/:\/\/[^@]*@/, '://***@')}`);
  console.log(`  Scope      : ${isFull ? 'ALL collections (drop)' : `single tenant [${tenantId}] (deleteMany)`}`);
  console.log(`  Indexes    : ${isFull ? 'dropped with collections' : 'preserved (other tenants intact)'}`);
  console.log(`  Dry run    : ${dryRun}`);
  console.log(sep('─'));

  if (dryRun) console.log('  [DRY RUN] No changes will be made.\n');

  // ── Pre-flight: check for duplicate permission codes ──────────────────────
  const { ALL_SYSTEM_PERMISSIONS } = await import('../src/modules/rbac/rbac.permissions');
  const allCodes = ALL_SYSTEM_PERMISSIONS.map((p: { code: string }) => p.code);
  const dupCodes = allCodes.filter((c: string, i: number) => allCodes.indexOf(c) !== i);
  if (dupCodes.length > 0) {
    console.error(`  ERROR: Duplicate permission codes found in ALL_SYSTEM_PERMISSIONS:\n    ${[...new Set(dupCodes)].join(', ')}`);
    console.error('  Fix the duplicates in src/modules/rbac/rbac.permissions.ts before resetting.\n');
    process.exit(1);
  }
  console.log(`  ${allCodes.length} permissions OK (no duplicates)\n`);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 6000 });
  console.log('  Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) throw new Error('DB connection not ready');

  // Discover all existing collections dynamically
  const allCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = allCollections
    .map(c => c.name)
    .filter(n => !PROTECTED_COLLECTIONS.has(n))
    .sort();

  if (names.length === 0) {
    console.log('  No collections found — nothing to reset.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`  Found ${names.length} collection${names.length !== 1 ? 's' : ''} (${PROTECTED_COLLECTIONS.size} protected).\n`);

  let totalDocs    = 0;
  let totalIndexes = 0;
  let processed    = 0;
  let skipped      = 0;

  for (const name of names) {
    const col = db.collection(name);

    if (isFull) {
      // ── Full reset: get counts then drop ─────────────────────────────────
      const docCount   = await col.countDocuments();
      const idxCount   = (await col.indexes()).length;

      if (docCount === 0 && idxCount <= 1) {
        // Empty collection with only the default _id index — skip
        process.stdout.write(`  ${name.padEnd(42)} empty   (skipped)\n`);
        skipped++;
        continue;
      }

      if (!dryRun) {
        await col.drop();
        totalDocs    += docCount;
        totalIndexes += idxCount;
        processed++;
        process.stdout.write(
          `  ${name.padEnd(42)} ${fmt(docCount, 'doc')} + ${fmt(idxCount, 'index')} dropped\n`,
        );
      } else {
        process.stdout.write(
          `  ${name.padEnd(42)} ${fmt(docCount, 'doc')} + ${fmt(idxCount, 'index')} would be dropped\n`,
        );
      }
    } else {
      // ── Single-tenant: deleteMany only ───────────────────────────────────
      const filter    = { tenantId };
      const docCount  = await col.countDocuments(filter);

      if (docCount === 0) {
        process.stdout.write(`  ${name.padEnd(42)} 0 docs  (skipped)\n`);
        skipped++;
        continue;
      }

      if (!dryRun) {
        const result = await col.deleteMany(filter);
        totalDocs += result.deletedCount;
        processed++;
        process.stdout.write(`  ${name.padEnd(42)} ${fmt(result.deletedCount, 'doc')} deleted\n`);
      } else {
        process.stdout.write(`  ${name.padEnd(42)} ${fmt(docCount, 'doc')} would be deleted\n`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + sep('─'));

  if (dryRun) {
    console.log(`  Dry run complete — no changes made.\n`);
  } else if (isFull) {
    console.log(`  Done.`);
    console.log(`    Collections dropped : ${processed}  (${skipped} empty skipped)`);
    console.log(`    Documents removed   : ${totalDocs.toLocaleString()}`);
    console.log(`    Indexes removed     : ${totalIndexes.toLocaleString()}`);
    console.log(`\n  Restart the server to re-seed system roles, permissions, and indexes.\n`);
  } else {
    console.log(`  Done.`);
    console.log(`    Collections touched : ${processed}  (${skipped} skipped)`);
    console.log(`    Documents deleted   : ${totalDocs.toLocaleString()}`);
    console.log(`\n  Restart the server to re-seed system roles and permissions.\n`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('\n  Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
