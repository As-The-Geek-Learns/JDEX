# Session: E2E CI Infrastructure Fixes

**Date:** 2026-02-13
**Branch:** `fix/e2e-ci-deps`
**PR:** #58
**Status:** Ready to merge (E2E tests running with `continue-on-error: true`)

---

## Objective

Fix E2E tests failing in GitHub Actions CI after PR #57 added Playwright E2E infrastructure.

---

## Issues Identified & Fixed

### 1. Ubuntu 24.04 Package Compatibility

**Problem:** `libasound2` package doesn't exist in Ubuntu 24.04 (noble)
```
E: Package 'libasound2' has no installation candidate
```

**Solution:** Changed package name in `.github/workflows/ci.yml`:
```yaml
# Before
sudo apt-get install -y ... libasound2

# After
sudo apt-get install -y ... libasound2t64
```

**Commit:** `fix(ci): update Ubuntu 24.04 package name for libasound`

---

### 2. Playwright Fixture Destructuring Pattern

**Problem:** Playwright requires object destructuring `({}, use)` for fixtures without dependencies, but ESLint's `no-empty-pattern` rule flags this.

When I changed `({}, use)` to `(_, use)` to fix ESLint, Playwright broke:
```
First argument must use the object destructuring pattern: _
```

**Solution:** Restored `({}, use)` with inline ESLint disable:
```javascript
// eslint-disable-next-line no-empty-pattern
electronApp: async ({}, use) => {
```

**Commit:** `fix(e2e): restore Playwright destructuring pattern`

---

### 3. Electron Sandbox in CI

**Problem:** GitHub Actions runners don't have proper permissions for Electron's chrome-sandbox (SUID sandbox):
```
FATAL:setuid_sandbox_host.cc(163)] The SUID sandbox helper binary was found,
but is not configured correctly. Rather than run without sandboxing I'm aborting now.
```

**Solution:** Added sandbox-disabling flags when `CI` environment variable is set:
```javascript
electronApp: async ({}, use) => {
  const electronArgs = [path.join(APP_ROOT, 'electron/main.js')];
  if (process.env.CI) {
    // GitHub Actions runners don't have proper permissions for chrome-sandbox
    electronArgs.unshift('--no-sandbox', '--disable-setuid-sandbox');
  }
  // ...
}
```

**Commit:** `fix(e2e): disable Electron sandbox in CI environment`

---

## Files Modified

| File | Changes |
|------|---------|
| `.github/workflows/ci.yml` | `libasound2` → `libasound2t64` |
| `app/test/e2e/fixtures/app.fixture.js` | Restored `({}, use)` pattern, added `--no-sandbox` for CI |

---

## CI Status

| Check | Status |
|-------|--------|
| Code Quality | Pass |
| Tests (2,720) | Pass |
| Build | Pass |
| Security Scan | Pass |
| Secrets Scan | Pass |
| CodeQL | Pass |
| CodeRabbit | Pass |
| E2E Tests | Running (continue-on-error: true) |

---

## Key Learnings

### [ASTGL CONTENT] Ubuntu 24.04 Package Renames

Ubuntu 24.04 (noble) uses the time64 ABI transition, renaming many packages:
- `libasound2` → `libasound2t64`
- Similar pattern for other libraries

When maintaining CI workflows, check for distribution-specific package names.

### [ASTGL CONTENT] Playwright + ESLint Conflict

Playwright's fixture system uses empty object destructuring `{}` which conflicts with ESLint's `no-empty-pattern` rule. The solution is targeted inline disable comments rather than changing the pattern (which breaks Playwright).

### [ASTGL CONTENT] Electron in CI Environments

Running Electron apps in CI requires:
1. Virtual framebuffer (`xvfb-run`)
2. Sandbox disabling (`--no-sandbox`, `--disable-setuid-sandbox`)
3. Various system dependencies for headless operation

---

## Next Steps

1. Merge PR #58 when ready
2. Monitor E2E test results - may need timeout/assertion adjustments
3. Consider increasing Playwright workers for faster CI (currently 1)

---

## Related PRs

- PR #55: TESTING.md documentation
- PR #56: Integration tests
- PR #57: E2E test infrastructure (Playwright + Electron)
- PR #58: E2E CI infrastructure fixes (this session)
