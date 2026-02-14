# Next Session Checklist

## Quick Start

```bash
cd ~/Projects/jdex-premium/app
git status  # Should show 6 new test files untracked
npm test    # Verify 3,013 tests pass
```

## Tasks

- [ ] **Verify tests still pass** after any upstream changes
- [ ] **Commit the test files** (see commit message in session-notes.md)
- [ ] **Decide PR strategy**: Merge into `fix/e2e-ci-deps` OR create new branch
- [ ] **Run coverage report**: `npm run test:coverage`
- [ ] **Create PR** with test improvements

## Optional Extensions

- [ ] Add tests for `scanned-files.js` (40% coverage)
- [ ] Add tests for `import-export.js` (42% coverage)
- [ ] Add tests for `cloud-drives.js` (43% coverage)

## Files to Commit

```
app/src/db/repositories/__tests__/
├── statistics.test.js       (NEW - 32 tests)
├── area-storage.test.js     (NEW - 35 tests)
├── organization-rules.test.js (NEW - 59 tests)
├── watched-folders.test.js  (NEW - 51 tests)
├── organized-files.test.js  (NEW - 59 tests)
└── watch-activity.test.js   (NEW - 57 tests)
```

## Key Metrics

| Metric | Value |
|--------|-------|
| Tests added | 293 |
| Total tests | 3,013 |
| Test files | 6 |
| All passing | ✅ |
