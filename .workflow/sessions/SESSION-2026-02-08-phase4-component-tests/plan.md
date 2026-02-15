# Phase 4: React Component Tests - Plan

**Date**: February 8, 2026
**Status**: In Progress
**Target**: 80% coverage, ~122 tests

## Scope

| Component | Location | Tests | Priority |
|-----------|----------|-------|----------|
| StatCard | `src/components/Stats/` | ~12 | 1 (easiest) |
| LicenseContext | `src/context/` | ~34 | 2 (dependency) |
| LicenseSettings | `src/components/Settings/` | ~19 | 3 |
| FeedbackSettings | `src/components/Settings/` | ~20 | 4 |
| CloudDriveSettings | `src/components/Settings/` | ~37 | 5 (hardest) |

## Prerequisites

1. Update `test/helpers/renderHelpers.jsx` with MockLicenseProvider
2. Existing test infrastructure is ready (vitest, RTL, jsdom)

## Test Categories Per Component

### StatCard
- Snapshot (1)
- Rendering (5)
- Color Variants (3)
- Trend Display (3)

### LicenseContext
- LicenseProvider (8)
- activateLicense (6)
- deactivateLicense (3)
- useLicense hook (3)
- withPremiumFeature HOC (4)
- UpgradePrompt (5)
- UsageLimitWarning (5)

### LicenseSettings
- Free Tier Display (5)
- Premium Tier Display (4)
- License Activation (6)
- Deactivation Flow (4)

### FeedbackSettings
- Rendering (4)
- Type Selection (4)
- Message Input (3)
- Email Submission (4)
- Copy Email (3)
- Design Tip (2)

### CloudDriveSettings
- Loading State (2)
- No Drives State (2)
- Detected Drives (5)
- Configured Drives (6)
- DriveCard (8)
- JDPathModal (8)
- Rescan (3)
- Error Handling (3)

## Success Criteria

- [ ] All 5 test files created
- [ ] Each component has 80%+ coverage
- [ ] All tests pass
- [ ] PR created and merged
