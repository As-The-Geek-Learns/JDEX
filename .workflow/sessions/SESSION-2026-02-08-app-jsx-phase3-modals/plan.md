# Phase 3 Plan: Modal Components Extraction

**Date:** February 8, 2026
**Branch:** `feat/phase3-modal-components`
**Status:** PLANNING
**Prerequisite:** Phase 2 complete (PR #27 merged)

---

## Problem Statement

App.jsx still contains 1,750 lines. Four modal components are defined inline, totaling ~1,704 lines:

| Modal | Lines | Complexity |
|-------|-------|------------|
| NewFolderModal | 233 | Medium - form with auto-numbering |
| NewItemModal | 268 | Medium - form with auto-numbering |
| EditFolderModal | 146 | Low - edit form |
| EditItemModal | 174 | Low - edit form |
| SettingsModal | 883 | **High** - 6 tabs, 3 already extracted |

**SettingsModal breakdown:**
- Areas tab: ~130 lines (inline, needs extraction)
- Categories tab: ~129 lines (inline, needs extraction)
- Cloud tab: Already extracted (`CloudDriveSettings`)
- License tab: Already extracted (`LicenseSettings`)
- Database tab: ~137 lines (inline, needs extraction)
- Feedback tab: Already extracted (`FeedbackSettings`)

---

## Success Criteria

1. All 4 inline modals extracted to `components/Modals/`
2. SettingsModal tabs extracted to `components/Settings/`
3. App.jsx reduced to ~800-1,000 lines
4. All 986+ tests still passing
5. No functional regressions
6. Lint clean

---

## Implementation Plan

### Phase 3a: Extract Simple CRUD Modals (4 components)

**Task 1:** Create `components/Modals/` directory structure
```
components/Modals/
├── NewFolderModal.jsx    (233 lines)
├── NewItemModal.jsx      (268 lines)
├── EditFolderModal.jsx   (146 lines)
├── EditItemModal.jsx     (174 lines)
└── index.js              (barrel export)
```

**Task 2:** Extract NewFolderModal
- Move function to separate file
- Import Lucide icons, date-fns
- Export as default
- Update App.jsx import

**Task 3:** Extract NewItemModal
- Same pattern as Task 2

**Task 4:** Extract EditFolderModal
- Same pattern as Task 2

**Task 5:** Extract EditItemModal
- Same pattern as Task 2

**Task 6:** Create barrel export and update App.jsx imports

**Checkpoint:** Run tests, verify all modals work

---

### Phase 3b: Extract SettingsModal Tab Components (3 components)

**Task 7:** Create Settings tab components
```
components/Settings/
├── AreasTab.jsx          (~130 lines)
├── CategoriesTab.jsx     (~129 lines)
├── DatabaseTab.jsx       (~137 lines)
├── CloudDriveSettings.jsx  (existing)
├── LicenseSettings.jsx     (existing)
├── FeedbackSettings.jsx    (existing)
└── index.js              (update barrel)
```

**Task 8:** Extract AreasTab
- Area CRUD UI (add, edit, delete areas)
- Receives: areas, onAddArea, onUpdateArea, onDeleteArea

**Task 9:** Extract CategoriesTab
- Category CRUD UI (add, edit, delete categories)
- Receives: areas, categories, onAddCategory, onUpdateCategory, onDeleteCategory

**Task 10:** Extract DatabaseTab
- Import/export/reset functionality
- Receives: onExport, onImport, onReset

**Task 11:** Update SettingsModal to use extracted tabs
- Import all 6 tab components
- SettingsModal becomes a thin shell (~100 lines)

**Checkpoint:** Run tests, verify settings work

---

### Phase 3c: Extract SettingsModal Shell

**Task 12:** Move SettingsModal to components/Modals/SettingsModal.jsx
- Now a thin orchestrator (~100-150 lines)
- All tab content delegated to components

**Task 13:** Final cleanup and verification
- Update all imports in App.jsx
- Run full test suite
- Lint check

---

## Estimated Line Reduction

| Component | Lines Moved |
|-----------|-------------|
| NewFolderModal | 233 |
| NewItemModal | 268 |
| EditFolderModal | 146 |
| EditItemModal | 174 |
| AreasTab | 130 |
| CategoriesTab | 129 |
| DatabaseTab | 137 |
| SettingsModal shell | ~750 (remaining after tabs) |

**Total extraction:** ~1,220 lines from App.jsx
**Projected App.jsx size:** ~530-600 lines

---

## Dependencies

- Phase 3a tasks are independent of each other (can be done in any order)
- Phase 3b tasks depend on Phase 3a completion
- Phase 3c depends on Phase 3b completion

---

## Security Considerations

- [ ] No secrets or credentials in extracted components
- [ ] Database operations remain in db.js service layer
- [ ] Input validation preserved in extracted forms
- [ ] XSS prevention via React's default escaping

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Props mismatch after extraction | Medium | Careful prop interface design |
| Missing state after extraction | Low | Test each modal after extraction |
| Circular dependencies | Low | Use barrel exports carefully |

---

## Decisions Made

1. **Commit strategy:** One commit per modal (atomic, easy to review/revert)
2. **JSDoc types:** Not adding in this phase (can be a future enhancement)
3. **SettingsModal location:** Move to `Modals/SettingsModal.jsx` for consistency

---

## Approval Required

**Human checkpoint:** Approve this plan before proceeding to EXECUTE phase.

---

## Files to Create

```
app/src/components/Modals/
├── NewFolderModal.jsx
├── NewItemModal.jsx
├── EditFolderModal.jsx
├── EditItemModal.jsx
├── SettingsModal.jsx
└── index.js

app/src/components/Settings/
├── AreasTab.jsx
├── CategoriesTab.jsx
├── DatabaseTab.jsx
└── index.js (update existing)
```

## Files to Modify

- `app/src/App.jsx` - Remove inline modals, update imports
- `app/src/components/Settings/index.js` - Add new exports
