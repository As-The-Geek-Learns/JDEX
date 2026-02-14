# Plan: E2E Tests with Playwright

## Problem Statement

JDex has comprehensive unit tests (2,720) and integration tests (436), but **no end-to-end tests** that verify the full application works as users experience it. E2E tests would catch issues that unit/integration tests miss:

- Electron main process + renderer communication
- Real database operations in the app context
- UI interactions as users perform them
- Application startup and navigation flows

## Current State

| Test Type | Count | Coverage |
|-----------|-------|----------|
| Unit tests | ~2,284 | Components, hooks, utils, services |
| Integration tests | 436 | Multi-component workflows (mocked DB) |
| **E2E tests** | 0 | Full app with real Electron |

## Success Criteria

1. Playwright configured for Electron testing
2. E2E tests cover critical user journeys
3. Tests run in CI (headless mode)
4. Tests are stable and not flaky
5. Documentation for running/writing E2E tests

## Scope

**In Scope:**
- Playwright setup with Electron support
- Core user journey tests (app launch, navigation, CRUD)
- Search functionality test
- Import/Export test
- CI integration (GitHub Actions)

**Out of Scope:**
- Premium feature tests (require license mocking complexity)
- Visual regression tests (separate roadmap item)
- Performance benchmarks

## Technical Approach

### Playwright + Electron

Playwright supports Electron apps via the `electron` launch type:

```javascript
import { _electron as electron } from 'playwright';

const app = await electron.launch({ args: ['electron/main.js'] });
const window = await app.firstWindow();
```

### Test Architecture

```
app/
├── test/
│   └── e2e/
│       ├── playwright.config.js    # Playwright config
│       ├── fixtures/
│       │   └── app.fixture.js      # Electron launch fixture
│       └── specs/
│           ├── app-launch.spec.js
│           ├── navigation.spec.js
│           ├── crud-area.spec.js
│           ├── crud-category.spec.js
│           ├── crud-folder.spec.js
│           ├── crud-item.spec.js
│           ├── search.spec.js
│           └── import-export.spec.js
```

## Tasks

| # | Task | Est. Tests |
|---|------|------------|
| 1 | Install Playwright and dependencies | - |
| 2 | Create Playwright config for Electron | - |
| 3 | Create app launch fixture | - |
| 4 | App launch & initial state tests | ~5 |
| 5 | Navigation flow tests | ~8 |
| 6 | Area CRUD E2E tests | ~5 |
| 7 | Category CRUD E2E tests | ~5 |
| 8 | Folder CRUD E2E tests | ~5 |
| 9 | Item CRUD E2E tests | ~5 |
| 10 | Search E2E tests | ~5 |
| 11 | Import/Export E2E tests | ~5 |
| 12 | Add npm scripts for E2E | - |
| 13 | CI integration | - |
| 14 | Update TESTING.md | - |

**Estimated total: ~43 E2E tests**

## Dependencies

```json
{
  "@playwright/test": "^1.51.0",
  "playwright": "^1.51.0"
}
```

## Security Considerations

- [x] Tests don't expose real file paths
- [x] No credentials in test fixtures
- [x] Tests use isolated test database (reset between tests)
- [x] No network requests to external services

## Files to Create

| File | Purpose |
|------|---------|
| `test/e2e/playwright.config.js` | Playwright configuration |
| `test/e2e/fixtures/app.fixture.js` | Electron app launch fixture |
| `test/e2e/specs/*.spec.js` | E2E test specs |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add Playwright deps, e2e scripts |
| `.github/workflows/ci.yml` | Add E2E test job |
| `TESTING.md` | Document E2E testing |

## Verification Plan

1. Run `npm run test:e2e` locally
2. All E2E tests pass
3. CI workflow runs E2E tests
4. Tests complete in reasonable time (<5 min)

## Risk Assessment

**Medium Risk**: Electron E2E testing can be flaky due to:
- App startup timing
- Database initialization timing
- Window focus issues

**Mitigations:**
- Use proper wait conditions (not arbitrary timeouts)
- Reset database state between tests
- Use Playwright's auto-waiting features
