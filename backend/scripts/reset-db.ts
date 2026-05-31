/**
 * reset-db.ts — Dev utility: wipes all tenant/org data from every collection.
 *
 * Usage:
 *   npm run db:reset                  # wipe everything
 *   npm run db:reset -- --tenant <id> # wipe one tenant only
 *
 * The global `permissions` collection is preserved (re-seeded on server start).
 * Safe to run repeatedly — the server will re-seed roles/permissions on next boot.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/hrms';

// ── All tenant-scoped collections ────────────────────────────────────────────
// 'permissions' is intentionally excluded — it's global and re-seeded on boot.
const TENANT_COLLECTIONS = [
  // Tenant & access
  'tenants',
  'tenant_settings',
  'tenant_modules',
  'usage_counters',
  // Users & sessions
  'users',
  'user_tenant_memberships',
  'user_sessions',
  // RBAC
  'roles',
  'role_permissions',
  'user_roles',
  'delegation_rules',
  // Org structure
  'companies',
  'departments',
  'designations',
  'grades',
  'locations',
  // Employees
  'employees',
  'employee_personal_details',
  'employee_bank_details',
  'employee_documents',
  'employee_status_history',
  'employee_code_counters',
  // Leave
  'leave_types',
  'leave_balances',
  'leave_applications',
  'holiday_lists',
  'holidays',
  'weekend_policies',
  // Attendance
  'attendance_logs',
  'raw_swipes',
  'attendance_exceptions',
  'shifts',
  // Workflow & rules
  'workflows',
  'workflow_instances',
  'rule_sets',
  'rules',
  // Forms & notifications
  'dynamic_forms',
  'form_submissions',
  'notifications',
  'notification_templates',
  'user_notification_preferences',
  // Audit
  'audit_logs',
] as const;

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

function separator(char = '─', len = 60) {
  return char.repeat(len);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { tenantId, dryRun } = parseArgs();

  console.log('\n' + separator('═'));
  console.log('  HRMS Database Reset Utility');
  console.log(separator('═'));
  console.log(`  URI        : ${MONGO_URI.replace(/:\/\/[^@]*@/, '://***@')}`);
  console.log(`  Mode       : ${tenantId ? `single tenant [${tenantId}]` : 'ALL tenants'}`);
  console.log(`  Dry run    : ${dryRun}`);
  console.log(separator('─'));

  if (dryRun) {
    console.log('  [DRY RUN] No changes will be made.\n');
  }

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('  ✓ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) throw new Error('DB connection not ready');

  const results: Array<{ collection: string; deleted: number }> = [];
  let totalDeleted = 0;

  for (const name of TENANT_COLLECTIONS) {
    let collection;
    try {
      collection = db.collection(name);
    } catch {
      continue; // collection might not exist yet
    }

    const filter = tenantId ? { tenantId } : {};
    const count = await collection.countDocuments(filter);

    if (count === 0) {
      process.stdout.write(`  ${name.padEnd(36)} 0 docs  (skipped)\n`);
      continue;
    }

    if (!dryRun) {
      const result = await collection.deleteMany(filter);
      results.push({ collection: name, deleted: result.deletedCount });
      totalDeleted += result.deletedCount;
      process.stdout.write(`  ${name.padEnd(36)} ${result.deletedCount} deleted\n`);
    } else {
      process.stdout.write(`  ${name.padEnd(36)} ${count} would be deleted\n`);
    }
  }

  console.log('\n' + separator('─'));
  if (!dryRun) {
    console.log(`  ✓ Done. ${totalDeleted} documents deleted across ${results.length} collections.`);
    console.log('  ℹ  Restart the backend server to re-seed system permissions and roles.\n');
  } else {
    console.log('  Dry run complete — no changes made.\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('\n  ✗ Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
