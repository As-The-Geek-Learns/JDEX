# Phase 5: Integration Tests - Plan

**Date**: February 8, 2026
**Status**: In Progress
**Scope**: Comprehensive (5 flows, ~110 tests)

---

## Objective

Add integration tests validating complete user workflows spanning components → services → database.

---

## Target

| Metric | Before | After |
|--------|--------|-------|
| Total tests | 659 | ~770 |
| Integration tests | 0 | ~110 |
| User flows tested | 0 | 5 |

---

## Tasks

### Task 1: Foundation Setup
- [ ] Create `test/integration/flows/` directory
- [ ] Create `test/setup-integration.js`
- [ ] Create `test/helpers/setupAllProviders.jsx`
- [ ] Create `vitest.config.unit.js` and `vitest.config.integration.js`
- [ ] Add npm scripts: `test:unit`, `test:integration`

### Task 2: Fixtures
- [ ] Create `test/fixtures/jdHierarchy.js`
- [ ] Create `test/fixtures/organizationRules.js`
- [ ] Create `test/fixtures/cloudDrives.js`
- [ ] Create `test/fixtures/scannedFiles.js`

### Task 3: Flow 2 - Rules Engine + Matching (~25 tests)
- [ ] Extension/keyword/regex rule matching
- [ ] Rule priority and confidence levels
- [ ] Cache invalidation on CRUD
- [ ] Match count increments
- [ ] Statistics aggregation

### Task 4: Flow 1 - Premium Feature Gating (~22 tests)
- [ ] Free tier feature limits
- [ ] Premium tier full access
- [ ] License activation/deactivation
- [ ] Usage tracking and quotas

### Task 5: Flow 3 - Batch Rename with Undo (~22 tests)
- [ ] Preview generation
- [ ] Conflict detection
- [ ] Undo log persistence
- [ ] Undo operation

### Task 6: Flow 4 - Drag-and-Drop Organization (~20 tests)
- [ ] DragDropContext state
- [ ] DropZone feedback
- [ ] File operations
- [ ] Usage quota enforcement

### Task 7: Flow 5 - Cloud Drive Routing (~22 tests)
- [ ] Platform-specific detection
- [ ] Drive configuration CRUD
- [ ] Path building/validation

### Task 8: Verification & PR
- [ ] All tests passing
- [ ] npm scripts work
- [ ] Create PR

---

## Success Criteria

- [ ] All ~770 tests pass
- [ ] `npm run test:unit` works
- [ ] `npm run test:integration` works
- [ ] Integration suite < 60 seconds
- [ ] No regressions
