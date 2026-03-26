# Plan: TESTING.md Documentation Guide

## Problem Statement

JDex has 2,611 tests across 74 files but no documentation explaining:
- How to run tests
- How tests are organized
- How to write new tests
- Testing conventions and patterns
- Available mocks and utilities

New contributors (including future-James) need a guide to understand and extend the test suite.

## Success Criteria

1. TESTING.md exists at `app/TESTING.md`
2. Covers all test types (unit, component, integration)
3. Documents test setup, mocks, and utilities
4. Includes examples for each test pattern
5. Explains coverage thresholds and CI integration

## Scope

**In Scope:**
- Quick start (running tests)
- Test organization/structure
- Writing tests (patterns, conventions)
- Mocks documentation (localStorage, Electron, sql.js)
- Coverage requirements
- CI integration notes

**Out of Scope:**
- E2E testing (future roadmap item)
- Visual regression testing (future roadmap item)

## Tasks

| # | Task | Dependencies |
|---|------|--------------|
| 1 | Create TESTING.md with quick start section | - |
| 2 | Document test directory structure | 1 |
| 3 | Document test patterns (unit, component, repository) | 2 |
| 4 | Document available mocks (setup.js) | 3 |
| 5 | Document coverage thresholds and CI | 4 |
| 6 | Add examples from existing tests | 5 |
| 7 | Run lint/format and verify | 6 |

## Security Considerations

- [ ] No sensitive data exposed in documentation
- [ ] No credentials or API keys in examples
- [ ] Documentation-only change (no code execution risk)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/TESTING.md` | Create | Main testing documentation |
| `README.md` | Modify | Add link to TESTING.md |

## Research Summary

**Current Test Setup:**
- Framework: Vitest with jsdom environment
- 2,611 tests across 74 files
- Setup file: `app/test/setup.js`
- Mocks: localStorage, Electron IPC, ResizeObserver, sql.js

**Test Locations:**
- `src/**/*.test.{js,jsx}` - Unit and component tests
- `src/db/repositories/__tests__/` - Repository tests
- `src/db/core/__tests__/` - Core database tests
- `src/db/schema/__tests__/` - Schema tests
- `test/integration/flows/` - Integration tests

**Coverage Config:**
- Global thresholds: 70% statements/lines, 60% branches, 65% functions
- Per-file thresholds for critical paths
- CI runs coverage on every PR

## Verification Plan

1. TESTING.md renders correctly in GitHub
2. All code examples are syntactically correct
3. Links work (internal anchors, external refs)
4. README link works

## Risk Assessment

**Low Risk:** Documentation-only change. No functional impact.
