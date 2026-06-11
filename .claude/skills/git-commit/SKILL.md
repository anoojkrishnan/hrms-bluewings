---
name: git-commit
description: Use this skill whenever committing code, staging files, writing a commit message,pushing to a branch, or any git workflow step in the HRMS platform. Triggers include:
  "commit this", "commit my changes", "push to branch", "create a branch", "stage and commit",
  "write a commit message", "commit and push", or any request involving git operations.
  This skill defines the exact branch naming format, commit message structure, required
  pre-commit checks, and push procedure — always follow it in full, never skip the
  typecheck/lint step before committing.
---

# Git Commit Workflow

## Pre-commit checks — always run first, no exceptions

```bash
npm run typecheck
npm run lint
```

Both must pass with zero errors before staging anything. If either fails, fix the errors first and report what was fixed. Never commit with typecheck or lint errors.

---

## Branch naming

```
<type>/<short-description>
```

| Type | When to use |
|---|---|
| `feat/` | New feature or module |
| `fix/` | Bug fix |
| `chore/` | Tooling, config, deps, refactor with no behaviour change |
| `docs/` | Documentation only |
| `test/` | Adding or fixing tests |
| `hotfix/` | Urgent production fix |

**Format rules:**
- Short description in kebab-case, max ~40 chars
- No ticket numbers unless user specifies
- No capital letters, no slashes beyond the type prefix

```bash
# Good
feat/documents-module
fix/leave-balance-carry-forward
chore/update-bullmq-connection
docs/add-rbac-skill
test/employee-service-unit

# Bad
feature/DocumentsModule     # wrong type prefix, PascalCase
fix/HRMS-123-bug            # ticket number not requested
feat/add-the-new-documents-module-for-generating-letters  # too long
```

Create branch before committing if not already on the right branch:

```bash
git checkout -b feat/your-description
# or if branch exists remotely
git checkout -t origin/feat/your-description
```

---

## Commit message format

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Type

| Type | When to use |
|---|---|
| `feat` | New feature, new module, new endpoint |
| `fix` | Bug fix |
| `chore` | Config, tooling, deps, minor refactor |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `refactor` | Code change with no feature/fix |
| `perf` | Performance improvement |
| `style` | Formatting only (no logic change) |

### Scope

Use the module or area affected. Match module folder names:

```
feat(employee): ...
fix(leave): ...
feat(payroll): ...
chore(auth): ...
fix(attendance): ...
feat(documents): ...
chore(deps): ...
fix(middleware): ...
```

Use `*` only when the change genuinely spans many modules with no clear owner.

### Short summary

- Imperative mood: "add", "fix", "remove", "update" — not "added", "fixing", "removes"
- No capital first letter
- No period at end
- Max 72 characters on the first line
- Specific enough to understand without reading the diff

```
# Good
feat(documents): add PDF generation endpoint with S3 upload
fix(leave): correct carry-forward balance on year-end rollover
chore(auth): replace deprecated jsonwebtoken verify overload
test(employee): add unit tests for softDelete service method

# Bad
feat: updates                          # too vague
fix(leave): Fixed the bug             # past tense, capital, period
feat(employee, leave, payroll): stuff  # too many scopes
FEAT(EMPLOYEE): Add endpoint           # wrong case
```

### Body (when to include)

Include a body when:
- The _why_ isn't obvious from the summary
- A non-trivial decision was made (e.g. why soft-delete instead of archive)
- A workaround or known limitation exists

```
fix(payroll): prevent double-processing on concurrent run triggers

BullMQ does not guarantee exactly-once delivery if a worker crashes
mid-job. Added a distributed lock (Redis SET NX) around the run
processing step so concurrent triggers for the same runId are safely
no-ops rather than double-processing payroll.
```

### Footer (when to include)

```
# Breaking change
feat(rbac)!: replace flat permission list with scoped permission map

BREAKING CHANGE: permission codes now require organizationId prefix.
All existing role assignments must be migrated.

# Reference an issue if user mentions it
fix(attendance): resolve timezone offset in night-shift OT calc

Closes #214
```

---

## Staging

Stage intentionally — never `git add .` without reviewing what's included.

```bash
# Review what changed first
git status
git diff

# Stage by file or directory — prefer explicit over blanket
git add src/modules/documents/
git add src/app.ts

# If adding everything in a module is truly correct
git add src/modules/documents/

# Verify what's staged before committing
git diff --staged
```

If unrelated changes crept in (e.g. a debug log, an unrelated fix), either:
- Stash them: `git stash -- path/to/file`
- Or commit them separately with their own message

One logical change per commit. Don't bundle a feature and a bug fix in the same commit.

---

## Full workflow — step by step

```bash
# 1. Confirm you're on the right branch
git branch

# 2. Create branch if needed
git checkout -b feat/documents-module

# 3. Run pre-commit checks
npm run typecheck
npm run lint

# 4. Review changes
git status
git diff

# 5. Stage intentionally
git add src/modules/documents/
git add src/app.ts

# 6. Verify staged diff
git diff --staged

# 7. Commit
git commit -m "feat(documents): scaffold module with PDF generation and S3 upload"

# 8. Push
git push origin feat/documents-module
# First push of a new branch:
git push -u origin feat/documents-module
```

---

## Multi-commit example (phase of work)

When scaffolding a full module, prefer one commit per logical unit rather than one giant commit:

```bash
git commit -m "feat(documents): add types, validator, and repository"
git commit -m "feat(documents): add service with PDF generation logic"
git commit -m "feat(documents): add controller, routes, and permissions"
git commit -m "feat(documents): mount router in app.ts and seed permissions"
git commit -m "test(documents): add unit tests for document service"
```

This makes rollback, bisect, and review easier.

---

## What never goes in a commit

- `.env` files or any file containing secrets
- `node_modules/`
- Build output (`dist/`, `build/`)
- Temporary debug logs or `console.log` left in production code
- `*.local` config overrides
- Unrelated changes mixed with the feature being committed

If any of these are tracked, fix `.gitignore` first and remove from index:

```bash
git rm --cached .env
git rm --cached -r dist/
```

---

## Checklist before pushing

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] Branch name matches `<type>/<description>` convention
- [ ] Commit message follows `<type>(<scope>): <summary>` format
- [ ] No `.env`, `node_modules`, or `dist` staged
- [ ] No unrelated changes bundled in the commit
- [ ] Staged diff reviewed with `git diff --staged`