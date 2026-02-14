# Service Layer Tests Plan
**Session:** 2026-02-12
**Branch:** `feature/service-tests`
**Objective:** Add unit tests for untested service modules

---

## Problem Statement

Five service modules (2,871 lines) lack automated tests:
- `fileOperations.js` (685 lines) - Electron IPC file operations
- `watcherService.js` (661 lines) - File system monitoring
- `fileScannerService.js` (630 lines) - Folder scanning
- `cloudDriveService.js` (541 lines) - Cloud drive routing
- `dragDropService.js` (354 lines) - Drag & drop handling

## Success Criteria

1. All 5 services have corresponding `.test.js` files
2. Test coverage for core business logic (not Electron-specific mocking)
3. All tests pass (`npm test`)
4. Follows established testing patterns (AAA, mocks, edge cases)

---

## Implementation Phases

### Phase 1: Low Complexity (dragDropService) ✅ COMPLETE
- [x] Create `dragDropService.test.js` (61 tests)
- [x] Test validation functions (blocked paths, sensitive extensions)
- [x] Test path generation logic (buildDestinationPath)
- [x] Test error handling (file operations, conflict detection)
- [x] Test usage tracking (localStorage-based limits)
- [x] Commit: `fc53a86`

### Phase 2: Medium Complexity (cloudDriveService, fileScannerService)
- [ ] Create `cloudDriveService.test.js`
- [ ] Test drive type detection
- [ ] Test path building
- [ ] Create `fileScannerService.test.js`
- [ ] Test file filtering logic
- [ ] Test scan result processing

### Phase 3: High Complexity (fileOperations, watcherService)
- [ ] Create `fileOperations.test.js`
- [ ] Test path validation
- [ ] Test operation result handling
- [ ] Mock Electron IPC appropriately
- [ ] Create `watcherService.test.js`
- [ ] Test watcher configuration
- [ ] Test event handling logic

---

## Testing Approach

### Pattern
Follow the same pattern as `matchingEngine.test.js`:
```javascript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('../some-dependency.js', () => ({
  // ...mocks
}));

describe('ServiceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // ...
    });
  });
});
```

### Mocking Strategy
- Mock Electron IPC calls (window.api)
- Mock database calls (import from db.js)
- Test pure logic functions directly
- Don't test Electron internals

---

## Security Considerations

- [ ] Ensure tests don't expose sensitive paths
- [ ] Mock file system operations (no real file access)
- [ ] No hardcoded credentials in test fixtures

---

## Estimated Effort

| Phase | Service(s) | Lines to Test | Effort |
|-------|-----------|---------------|--------|
| 1 | dragDropService | 354 | ~30 min |
| 2 | cloudDrive, fileScanner | 1,171 | ~1-2 hrs |
| 3 | fileOperations, watcher | 1,346 | ~2-3 hrs |

Total: ~4-5 hours

---

## Approval

- [ ] Plan reviewed by human
- [ ] Approach approved
