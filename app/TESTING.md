# Testing Guide

This guide covers how to run, write, and maintain tests for JDex.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests once (CI mode, no watch)
npm run test:ci
```

## Test Statistics

| Metric                | Count  |
| --------------------- | ------ |
| Test Files            | 80+    |
| Total Tests           | 2,720+ |
| Coverage (Statements) | ~82%   |
| Coverage (Branches)   | ~89%   |
| E2E Tests             | 40+    |

---

## Test Organization

### Directory Structure

```
app/
├── test/
│   ├── setup.js                    # Global test setup, mocks
│   ├── integration/
│   │   └── flows/                  # Integration tests
│   │       ├── flow1-premium-feature-gating.test.jsx
│   │       ├── flow2-rules-matching-stats.test.jsx
│   │       ├── flow3-batch-rename-undo.test.jsx
│   │       ├── flow4-drag-drop-organization.test.jsx
│   │       ├── flow5-cloud-drive-routing.test.jsx
│   │       └── flow6-jd-hierarchy-crud.test.jsx
│   │
│   └── e2e/                        # E2E tests (Playwright + Electron)
│       ├── playwright.config.js
│       ├── fixtures/
│       │   └── app.fixture.js
│       └── specs/
│           ├── app-launch.spec.js
│           ├── navigation.spec.js
│           ├── crud-folder.spec.js
│           ├── crud-item.spec.js
│           ├── search.spec.js
│           └── import-export.spec.js
│
├── __mocks__/
│   └── sql.js.js                   # sql.js mock for database tests
│
└── src/
    ├── components/
    │   └── **/*.test.jsx           # Component tests (co-located)
    ├── context/
    │   └── *.test.jsx              # Context tests
    ├── hooks/
    │   └── *.test.js               # Hook tests
    ├── services/
    │   └── *.test.js               # Service tests
    ├── utils/
    │   └── *.test.js               # Utility tests
    └── db/
        ├── core/__tests__/         # Database core tests
        ├── repositories/__tests__/ # Repository tests
        └── schema/__tests__/       # Schema/migration tests
```

### Test Types

| Type            | Location                         | Purpose                      |
| --------------- | -------------------------------- | ---------------------------- |
| **Unit**        | `src/**/*.test.js`               | Pure functions, utilities    |
| **Component**   | `src/components/**/*.test.jsx`   | React component behavior     |
| **Repository**  | `src/db/repositories/__tests__/` | Database CRUD operations     |
| **Integration** | `test/integration/flows/`        | Multi-component workflows    |
| **E2E**         | `test/e2e/specs/`                | Full Electron app user flows |

---

## Writing Tests

### File Naming

- Tests are co-located with source files
- Use `.test.js` for JS files, `.test.jsx` for JSX files
- Name pattern: `ComponentName.test.jsx` or `serviceName.test.js`

### Test Structure

Follow the **AAA pattern**: Arrange, Act, Assert.

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('FunctionName', () => {
  it('should describe expected behavior', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Component Test Example

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent.jsx';

describe('MyComponent', () => {
  it('should render title', () => {
    render(<MyComponent title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClick when button clicked', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Repository Test Example

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAreas, createArea } from '../areas.js';

// Mock the database utilities
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
}));

import { getDB, saveDatabase } from '../utils.js';

describe('areas repository', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      exec: vi.fn(() => [{ columns: ['id', 'name'], values: [[1, 'Test']] }]),
      run: vi.fn(),
    };
    getDB.mockReturnValue(mockDb);
  });

  it('should return all areas', () => {
    const areas = getAreas();

    expect(mockDb.exec).toHaveBeenCalledWith('SELECT * FROM areas ORDER BY range_start');
    expect(areas).toHaveLength(1);
  });
});
```

### Testing Async Code

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('async function', () => {
  it('should resolve with data', async () => {
    const result = await fetchData();

    expect(result).toEqual({ success: true });
  });

  it('should handle errors', async () => {
    vi.mocked(apiCall).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchData()).rejects.toThrow('Network error');
  });
});
```

### Testing with React Context

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LicenseProvider } from '../../context/LicenseContext.jsx';
import PremiumFeature from './PremiumFeature.jsx';

const renderWithLicense = (ui, { isPremium = false } = {}) => {
  return render(<LicenseProvider value={{ isPremium }}>{ui}</LicenseProvider>);
};

describe('PremiumFeature', () => {
  it('should show upgrade prompt for free users', () => {
    renderWithLicense(<PremiumFeature />, { isPremium: false });

    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
  });
});
```

---

## Available Mocks

The test setup (`test/setup.js`) provides these global mocks:

### localStorage

```javascript
// Automatically mocked - works like real localStorage
localStorage.setItem('key', 'value');
localStorage.getItem('key'); // 'value'
localStorage.clear(); // Cleared between tests
```

### Electron IPC

```javascript
import { ipcRenderer } from 'electron';

// All methods are mocked
ipcRenderer.invoke('channel', data); // Returns undefined by default
ipcRenderer.send('channel', data);
ipcRenderer.on('channel', callback);

// To mock a specific return value:
vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce({ success: true });
```

### ResizeObserver / IntersectionObserver

```javascript
// Automatically mocked - no setup needed
// Components using these observers will work without errors
```

### matchMedia

```javascript
// Automatically mocked
// Default: matches = false
// Components using media queries will work
```

### sql.js Database

```javascript
// The database is mocked via __mocks__/sql.js.js
// For repository tests, mock the utils directly:
vi.mock('../utils.js', () => ({
  getDB: vi.fn(),
  saveDatabase: vi.fn(),
}));
```

---

## Coverage Requirements

### Global Thresholds

| Metric     | Minimum |
| ---------- | ------- |
| Statements | 70%     |
| Branches   | 60%     |
| Functions  | 65%     |
| Lines      | 70%     |

### Per-File Thresholds

Critical files have higher requirements:

| File                                | Statements | Lines |
| ----------------------------------- | ---------- | ----- |
| `src/utils/validation.js`           | 90%        | 90%   |
| `src/utils/errors.js`               | 85%        | 85%   |
| `src/components/Stats/StatCard.jsx` | 80%        | 80%   |
| `src/context/LicenseContext.jsx`    | 80%        | 80%   |

### Checking Coverage Locally

```bash
npm run test:coverage
```

Coverage reports are generated in:

- `coverage/` - HTML report (open `index.html` in browser)
- `coverage/lcov.info` - LCOV format for CI tools

---

## CI Integration

Tests run automatically on every PR via GitHub Actions:

1. **Code Quality** - ESLint + Prettier check
2. **Tests** - Full test suite with coverage
3. **Codecov** - Coverage uploaded and tracked

### Coverage Badge

Current coverage is displayed in the README via Codecov badge.

### Failing Tests Block Merge

PRs cannot be merged if:

- Any test fails
- Coverage drops below thresholds

---

## Best Practices

### Do

- Write tests before or alongside code
- Test behavior, not implementation details
- Use descriptive test names: `should [action] when [condition]`
- Keep tests focused (one assertion per concept)
- Use `vi.fn()` for spies and stubs
- Clean up in `afterEach` if needed

### Don't

- Don't test library internals (React, Vitest, etc.)
- Don't use `test.only` in commits (blocks other tests)
- Don't ignore flaky tests - fix the root cause
- Don't mock everything - test real integrations when practical
- Don't write tests that depend on test order

### Testing Priority

1. **Critical paths first** - License validation, data persistence
2. **Business logic** - Services, utilities, repositories
3. **UI components** - User interactions, rendering
4. **Edge cases** - Error states, empty states, boundaries

---

## Troubleshooting

### "Cannot find module" errors

Ensure imports use the correct path aliases:

```javascript
import { something } from '@/utils/something'; // Uses @ alias
```

### React act() warnings

Wrap state updates in `act()`:

```javascript
import { act } from '@testing-library/react';

await act(async () => {
  fireEvent.click(button);
});
```

### Async test timeouts

Increase timeout for slow tests:

```javascript
it('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Mock not being used

Ensure mocks are defined before imports:

```javascript
// ✅ Correct - mock before import
vi.mock('./module');
import { fn } from './module';

// ❌ Wrong - import before mock
import { fn } from './module';
vi.mock('./module');
```

---

## E2E Testing with Playwright

JDex uses Playwright for end-to-end testing of the Electron application.

### Running E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with visible browser
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### E2E Test Structure

```
app/test/e2e/
├── playwright.config.js       # Playwright configuration
├── fixtures/
│   └── app.fixture.js         # Electron app launch fixture
└── specs/
    ├── app-launch.spec.js     # App startup tests
    ├── navigation.spec.js     # Sidebar/breadcrumb navigation
    ├── crud-folder.spec.js    # Folder CRUD operations
    ├── crud-item.spec.js      # Item CRUD operations
    ├── search.spec.js         # Search functionality
    └── import-export.spec.js  # Backup/restore tests
```

### Writing E2E Tests

E2E tests use a custom fixture that launches the Electron app:

```javascript
import { test, expect } from '../fixtures/app.fixture.js';

test('should display the main window', async ({ window }) => {
  // window is the Playwright Page for the Electron window
  const logo = window.locator('text=JDex');
  await expect(logo).toBeVisible();
});

test('should interact with Electron APIs', async ({ electronApp }) => {
  // electronApp provides access to Electron's main process
  const isReady = await electronApp.evaluate(({ app }) => app.isReady());
  expect(isReady).toBe(true);
});
```

### E2E Test Fixtures

The app fixture provides:

- **`electronApp`**: The Electron application instance
- **`window`**: The main BrowserWindow as a Playwright Page
- **`cleanState`**: Resets localStorage/database between tests

### E2E Best Practices

1. **Use proper waits**: Use Playwright's auto-waiting instead of arbitrary timeouts
2. **Reset state**: Use `cleanState` fixture for tests that modify data
3. **Stable selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
4. **Independent tests**: Each test should be able to run in isolation

### CI Integration

E2E tests run in CI using `xvfb-run` for headless Electron testing on Linux:

```yaml
- name: Run E2E tests
  run: xvfb-run --auto-servernum npm run test:e2e
```

Test results and artifacts are uploaded on failure for debugging.

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Electron Guide](https://playwright.dev/docs/api/class-electron)
