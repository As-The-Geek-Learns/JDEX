# Session: db.js Repository Extraction (Phase 3c - Premium Features)

**Session ID:** SESSION-2026-02-12-db-refactor-phase3c
**Date:** 2026-02-12
**Branch:** feature/db-refactor-phase3c-premium
**Phase:** Plan

---

## Overview

Extract remaining ~1,900 lines of premium feature CRUD operations from `db.js` into 10 dedicated repository modules. This completes the repository pattern refactoring, reducing db.js to a ~100 line facade.

---

## Scope Analysis

| Module | Lines | Functions | Priority |
|--------|-------|-----------|----------|
| cloud-drives.js | ~235 | 7 | High |
| area-storage.js | ~185 | 4 | High |
| organization-rules.js | ~290 | 7 | High |
| organized-files.js | ~320 | 8 | High |
| scanned-files.js | ~320 | 11 | Medium |
| statistics.js | ~40 | 1 | Low |
| watched-folders.js | ~250 | 7 | Medium |
| watch-activity.js | ~170 | 5 | Medium |
| db-utils.js | ~40 | 3 | Low |
| import-export.js | ~60 | 4 | Low |
| **Total** | **~1,910** | **57** | |

---

## Tasks

### 3c.1 Cloud Drives Repository
- [ ] Create `repositories/cloud-drives.js`
- [ ] Extract: getCloudDrives, getCloudDrive, getDefaultCloudDrive, createCloudDrive, updateCloudDrive, deleteCloudDrive, setDefaultCloudDrive
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.2 Area Storage Repository
- [ ] Create `repositories/area-storage.js`
- [ ] Extract: getAreaStorageMappings, getAreaCloudDrive, setAreaCloudDrive, getUnmappedAreas
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.3 Organization Rules Repository
- [ ] Create `repositories/organization-rules.js`
- [ ] Extract: getOrganizationRules, getOrganizationRule, createOrganizationRule, updateOrganizationRule, deleteOrganizationRule, incrementRuleMatchCount, toggleOrganizationRule
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.4 Organized Files Repository
- [ ] Create `repositories/organized-files.js`
- [ ] Extract: getOrganizedFiles, getOrganizedFile, findOrganizedFileByPath, recordOrganizedFile, markFileUndone, updateOrganizedFile, getRecentOrganizedFiles, getOrganizedFilesStats
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.5 Scanned Files Repository
- [ ] Create `repositories/scanned-files.js`
- [ ] Extract: generateScanSessionId, clearScannedFiles, addScannedFile, addScannedFilesBatch, getScannedFiles, updateScannedFileDecision, acceptScannedFileSuggestion, skipScannedFile, changeScannedFileTarget, getScanStats, getFilesReadyToOrganize
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.6 Statistics Repository
- [ ] Create `repositories/statistics.js`
- [ ] Extract: getStats
- [ ] Create unit tests

### 3c.7 Watched Folders Repository
- [ ] Create `repositories/watched-folders.js`
- [ ] Extract: getWatchedFolders, getWatchedFolder, getWatchedFolderByPath, createWatchedFolder, updateWatchedFolder, deleteWatchedFolder, incrementWatchedFolderStats
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.8 Watch Activity Repository
- [ ] Create `repositories/watch-activity.js`
- [ ] Extract: logWatchActivity, getWatchActivity, getRecentWatchActivity, getQueuedFileCounts, clearOldWatchActivity
- [ ] Convert to parameterized queries
- [ ] Create unit tests

### 3c.9 DB Utils Repository
- [ ] Create `repositories/db-utils.js`
- [ ] Extract: executeSQL, getTables, getTableData
- [ ] Create unit tests

### 3c.10 Import/Export Repository
- [ ] Create `repositories/import-export.js`
- [ ] Extract: exportDatabase, importDatabase, exportToJSON, resetDatabase
- [ ] Create unit tests

### 3c.11 Final Integration
- [ ] Update db.js to import/re-export all new modules
- [ ] Verify backward compatibility
- [ ] Run full test suite
- [ ] Create PR

---

## Security Considerations

- [ ] All SQL queries use parameterized statements (no string interpolation)
- [ ] Input validation on all user-provided values
- [ ] No SQL injection vulnerabilities
- [ ] Proper error handling without exposing internals

---

## Success Criteria

1. All 1,422+ existing tests pass
2. New unit tests for all 10 modules (~150+ new tests)
3. db.js reduced to ~100 line facade
4. ESLint passes (warnings only)
5. Prettier formatting verified
6. No security vulnerabilities introduced

---

## Notes

- Follow same patterns established in Phase 3a/3b
- Use shared utilities from `repositories/utils.js`
- Maintain backward compatibility via re-exports
- Each module should be independently testable
