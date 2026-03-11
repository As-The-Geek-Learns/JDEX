# Plan: Core CRUD Integration Tests

## Problem Statement

The existing 327 integration tests cover premium features (license gating, rules matching, batch rename, drag-drop, cloud drives), but **core JD hierarchy CRUD operations** lack integration tests:
- Areas: create, read, update, delete
- Categories: create, read, update, delete
- Folders: create, read, update, delete
- Items: create, read, update, delete
- Search: across all entities
- Import/Export: backup and restore

These are the fundamental "free tier" features that every user relies on.

## Current State

| Flow | Integration Tests | Status |
|------|-------------------|--------|
| Premium Feature Gating | 72 tests | ✅ Complete |
| Rules Matching + Stats | 43 tests | ✅ Complete |
| Batch Rename + Undo | 64 tests | ✅ Complete |
| Drag-Drop Organization | 63 tests | ✅ Complete |
| Cloud Drive Routing | 85 tests | ✅ Complete |
| **Core JD CRUD** | 0 tests | ❌ Missing |

## Success Criteria

1. New integration test file: `flow6-jd-hierarchy-crud.test.jsx`
2. Covers full CRUD lifecycle for areas, categories, folders, items
3. Tests relationships (cascading deletes, parent-child)
4. Tests search functionality across entities
5. Tests import/export workflow
6. All tests pass
7. Documentation updated

## Scope

**In Scope:**
- Area CRUD with validation
- Category CRUD with area relationship
- Folder CRUD with category relationship, folder number assignment
- Item CRUD with folder relationship, item number assignment
- Search across all entities
- Import/Export roundtrip

**Out of Scope:**
- UI component interactions (covered by component tests)
- Premium feature limits (covered by flow1)
- File operations (covered by flow4, flow5)

## Tasks

| # | Task | Est. Tests |
|---|------|------------|
| 1 | Create test file with setup/fixtures | - |
| 2 | Area CRUD tests | ~15 |
| 3 | Category CRUD tests (with area relationship) | ~15 |
| 4 | Folder CRUD tests (with number assignment) | ~20 |
| 5 | Item CRUD tests (with number assignment) | ~20 |
| 6 | Search integration tests | ~10 |
| 7 | Import/Export roundtrip tests | ~10 |
| 8 | Cascading relationship tests | ~10 |
| 9 | Run all integration tests, verify | - |

**Estimated total: ~100 new tests**

## Security Considerations

- [ ] Tests don't expose real file paths
- [ ] No credentials in test fixtures
- [ ] Tests use mocked database (no persistence)

## Files to Create

| File | Purpose |
|------|---------|
| `test/integration/flows/flow6-jd-hierarchy-crud.test.jsx` | Core CRUD integration tests |

## Verification Plan

1. Run `npx vitest run --config vitest.config.integration.js`
2. All 6 flow test files pass
3. New tests follow existing patterns
4. Coverage doesn't decrease
