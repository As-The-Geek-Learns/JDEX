# Phase 3: Service Layer Tests - Plan

**Date**: February 8, 2026
**Phase**: 3 of 5 (Service Layer)
**Target Coverage**: 65% global

---

## Scope

Three service files to test:

| File | Lines | Dependencies | Testability |
|------|-------|--------------|-------------|
| `licenseService.js` | 504 | localStorage, fetch (Gumroad API) | HIGH |
| `batchRenameService.js` | 542 | validation.js, fs/path (Electron), localStorage | MEDIUM-HIGH |
| `statisticsService.js` | 314 | db.js (getDB) | LOW |

---

## Dependency Analysis

### licenseService.js - HIGH Testability
**No db.js dependency!** Uses only:
- `localStorage` - already mocked in test/setup.js
- `fetch` (Gumroad API) - will use msw

Functions by category:
| Category | Functions | Mock Needed |
|----------|-----------|-------------|
| Storage helpers | getStoredData, setStoredData, removeStoredData | localStorage |
| License validation | validateLicenseKey, activateLicense | fetch (msw) |
| License state | deactivateLicense, getStoredLicense, isPremium, getCurrentTier | localStorage |
| Usage tracking | getUsage, incrementUsage, isLimitReached, getRemainingQuota | localStorage + Date |
| Feature gating | hasFeature, canPerformAction | Pure logic |
| React helper | getLicenseState | Combines above |

### batchRenameService.js - MEDIUM-HIGH Testability
**Pure functions** (no mocks needed):
- `getBaseName(filename)` - string manipulation
- `getExtension(filename)` - string manipulation
- `sanitizeFilename(filename)` - pattern matching
- `transformCase(str, caseType)` - string manipulation
- `generateNewName(originalName, options, index)` - pure logic
- `checkBatchLimit(fileCount, isPremium)` - pure logic

**Electron-dependent** (needs window.require mock):
- `generatePreview(files, options)` - uses fs.existsSync, path.join
- `executeBatchRename(preview, options, onProgress)` - uses fs.renameSync
- `undoBatchRename(undoId, onProgress)` - uses fs.renameSync
- `readDirectoryFiles(dirPath)` - uses fs.readdirSync

**localStorage-dependent**:
- `saveUndoLog`, `getUndoLog`, `getMostRecentUndoLog`, `removeUndoLog`

### statisticsService.js - LOW Testability
**All functions call getDB()** which has the CDN loading issue documented in Phase 2.

Strategy options:
1. Mock `getDB()` to return mock db object
2. Test `validateNumericParam()` helper only (not exported, but can test indirectly)
3. Skip to integration tests in Phase 5

**Recommended**: Mock `getDB()` at module level with `vi.mock('../db.js')`

---

## Test Plan

### Task 1: licenseService.js - Pure Logic Tests
Create `app/src/services/licenseService.test.js`

Tests for:
- LICENSE_TIERS constants validation
- FEATURE_INFO constants validation
- `getCurrentTier()` with free vs premium
- `hasFeature()` for each feature type
- `canPerformAction()` for all action types
- `getUsage()` month reset logic
- `incrementUsage()` counter logic
- `isLimitReached()` threshold checks
- `getRemainingQuota()` calculations

### Task 2: licenseService.js - localStorage Tests
Tests for:
- `getStoredLicense()` empty state
- `getStoredLicense()` with data
- `deactivateLicense()` clears storage
- `isPremium()` with valid license
- `isPremium()` with expired validation (>30 days)
- `getLicenseState()` combines all state

### Task 3: licenseService.js - Gumroad API Tests (msw)
Set up msw to mock `https://api.gumroad.com/v2/licenses/verify`

Tests for:
- `validateLicenseKey()` - empty/invalid format
- `validateLicenseKey()` - valid key response
- `validateLicenseKey()` - key not found
- `validateLicenseKey()` - network error with cached license
- `validateLicenseKey()` - network error without cache (offline)
- `activateLicense()` - success flow
- `activateLicense()` - refunded license rejection
- `activateLicense()` - disputed license rejection

### Task 4: batchRenameService.js - Pure Function Tests
Create `app/src/services/batchRenameService.test.js`

Tests for:
- `getBaseName()` - various filenames
- `getExtension()` - with/without extensions
- `sanitizeFilename()` - invalid chars, reserved names, length limits
- `transformCase()` - all case types
- `generateNewName()` - all options combinations
- `checkBatchLimit()` - free vs premium

### Task 5: batchRenameService.js - Electron Mock Tests
Mock `window.require` for fs/path modules

Tests for:
- `generatePreview()` - conflict detection
- `readDirectoryFiles()` - directory reading
- Undo log localStorage operations

### Task 6: statisticsService.js Tests
Mock `getDB()` to return controlled db mock

Tests for:
- `getTotalOrganizedFiles()` - with/without data
- `getFilesOrganizedThisMonth()` - date filtering
- `getActiveRulesCount()` - active filter
- `getFilesOrganizedByDay()` - day filling logic
- `getFilesByType()` - type grouping
- `getTopRules()` - sorting and limiting
- `getWatchActivitySummary()` - aggregation
- `getMostCommonCategory()` - category lookup
- `getDashboardStats()` - complete aggregation
- `hasStatisticsData()` - boolean check

---

## Mock Setup Required

### 1. msw for Gumroad API (new)
```javascript
// test/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.gumroad.com/v2/licenses/verify', async ({ request }) => {
    const body = await request.formData();
    const licenseKey = body.get('license_key');

    if (licenseKey === 'VALID-KEY') {
      return HttpResponse.json({
        success: true,
        purchase: {
          email: 'test@example.com',
          product_name: 'JDex Premium',
          created_at: '2026-01-01T00:00:00Z',
          refunded: false,
          disputed: false,
          chargebacked: false,
        },
      });
    }

    return HttpResponse.json({
      success: false,
      message: 'License key not found',
    });
  }),
];
```

### 2. window.require Mock for Electron
```javascript
// In test file or setup
const mockFs = {
  existsSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
};

const mockPath = {
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
};

vi.stubGlobal('window', {
  ...window,
  require: vi.fn((module) => {
    if (module === 'fs') return mockFs;
    if (module === 'path') return mockPath;
    return null;
  }),
});
```

### 3. getDB Mock for statisticsService
```javascript
vi.mock('../db.js', () => ({
  getDB: vi.fn(() => ({
    exec: vi.fn((sql) => {
      // Return mock results based on SQL query
    }),
  })),
}));
```

---

## Success Criteria

- [ ] licenseService.js: 90%+ coverage
- [ ] batchRenameService.js pure functions: 95%+ coverage
- [ ] batchRenameService.js with mocks: 80%+ coverage
- [ ] statisticsService.js: 70%+ coverage (with getDB mock)
- [ ] Global coverage: 65%+ (up from ~55% after Phase 2)
- [ ] All tests passing in CI
- [ ] msw properly set up for API mocking

---

## Estimated Test Count

| File | Tests |
|------|-------|
| licenseService.js | ~35-40 |
| batchRenameService.js | ~25-30 |
| statisticsService.js | ~15-20 |
| **Total Phase 3** | ~75-90 |

Combined with Phase 1+2: **~400+ total tests**

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| msw setup complexity | Install and configure before writing tests |
| window.require mocking | Test with simple cases first |
| getDB mock may not cover all SQL patterns | Start with basic queries, expand as needed |
| Date mocking for usage tracking | Use vi.setSystemTime() |

---

## Approval Required

Please review this plan before I begin implementation.