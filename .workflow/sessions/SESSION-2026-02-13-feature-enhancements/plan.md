# Feature Enhancements Plan
**Session:** 2026-02-13
**Author:** Claude (with James)
**Status:** AWAITING APPROVAL

---

## Overview

This session focuses on three feature enhancement areas in priority order:

| Priority | Feature | Goal |
|----------|---------|------|
| A | File Organizer | Improve rule matching & add bulk preview |
| B | Statistics Dashboard | Add date picker & CSV export |
| C | Watch Folders UX | Better status indicators & activity filtering |

---

## Option A: File Organizer Enhancements

### Current State
- `matchingEngine.js` (639 lines) - Rule matching with extension/keyword/path/regex
- `FileOrganizer.jsx` (866 lines) - UI with Scan/Organize/Rules/Watch tabs
- Confidence levels: HIGH, MEDIUM, LOW, NONE
- Heuristic matching for files without explicit rules
- Batch match capability exists

### Proposed Enhancements

#### A1. Bulk Organization Preview Mode
**Problem:** Users accept files individually without seeing the full picture.

**Solution:** Add a preview panel showing all proposed moves before execution.

```
┌─────────────────────────────────────────────────────────┐
│ Preview Organization (23 files)                    [X]  │
├─────────────────────────────────────────────────────────┤
│ 📁 11.01 Invoices                            (5 files)  │
│    ├── invoice-2026-001.pdf                             │
│    ├── invoice-2026-002.pdf                             │
│    └── ... 3 more                                       │
│ 📁 12.03 Project Files                       (8 files)  │
│    └── ...                                              │
├─────────────────────────────────────────────────────────┤
│                     [Cancel]  [Organize All]            │
└─────────────────────────────────────────────────────────┘
```

**Files to modify:**
- `FileOrganizer.jsx` - Add OrganizationPreview component
- New: `components/FileOrganizer/OrganizationPreview.jsx`

#### A2. Improved Error Handling for Failed Moves
**Problem:** Failed file moves show generic errors.

**Solution:**
- Add specific error types (permission denied, file in use, disk full)
- Add retry option for transient failures
- Show error details in expandable panel

**Files to modify:**
- `services/fileOperations.js` - Enhance error classification
- `FileOrganizer.jsx` - Add error detail UI in ProgressModal

#### A3. Rule Matching Edge Cases
**Problem:** Some file patterns aren't well-matched.

**Solution:**
- Add compound rules (extension + keyword together)
- Add negative matching (exclude files matching pattern)
- Improve date pattern recognition in filenames

**Files to modify:**
- `matchingEngine.js` - Add `compound` and `exclude` rule types
- `RulesManager.jsx` - UI for new rule types

---

## Option B: Statistics Dashboard Polish

### Current State
- `StatsDashboard.jsx` (394 lines) - Premium feature
- Period selector: 7/30/90 days (dropdown)
- Components: StatCard, ActivityChart, FileTypeChart, TopRulesCard
- Watch activity summary

### Proposed Enhancements

#### B1. Custom Date Range Picker
**Problem:** Fixed periods (7/30/90 days) don't allow custom analysis.

**Solution:** Replace dropdown with date picker component.

```
┌────────────────────────────────────────┐
│  📅 Feb 1, 2026 - Feb 13, 2026   [▼]   │
├────────────────────────────────────────┤
│ Quick: [Today] [7d] [30d] [90d] [YTD]  │
│                                        │
│ Custom Range:                          │
│ From: [  Feb 1, 2026  ]               │
│ To:   [  Feb 13, 2026 ]               │
│                                        │
│              [Apply]                   │
└────────────────────────────────────────┘
```

**Files to modify:**
- New: `components/Stats/DateRangePicker.jsx`
- `StatsDashboard.jsx` - Integrate picker, update data fetching
- `services/statisticsService.js` - Add date range filtering

#### B2. CSV Export for Statistics
**Problem:** Can't export data for external analysis.

**Solution:** Add export button that generates CSV with all stats.

**Export includes:**
- Activity by day
- File type distribution
- Rule effectiveness
- Watch folder activity

**Files to modify:**
- New: `services/exportService.js` - CSV generation utilities
- `StatsDashboard.jsx` - Add export button
- New: `utils/csvExport.js` - CSV formatting helpers

#### B3. Time Period Comparison View
**Problem:** Hard to see trends without comparison.

**Solution:** Add "Compare" toggle showing current vs previous period.

```
┌─────────────────────────────────────┐
│ This Period    vs    Previous       │
│    127 files        98 files        │
│               ↑ 29.6%               │
└─────────────────────────────────────┘
```

**Files to modify:**
- `StatCard.jsx` - Add comparison mode
- `ActivityChart.jsx` - Overlay previous period line
- `services/statisticsService.js` - Add comparison data fetching

---

## Option C: Watch Folders UX

### Current State
- `WatchFolders.jsx` (771 lines) - Watch folder management
- `watcherService.js` (660 lines) - File system monitoring
- Status badges: Watching (green), Ready (yellow), Paused (gray)
- Activity log shows recent 20 items

### Proposed Enhancements

#### C1. Enhanced Real-Time Status Indicators
**Problem:** Status changes aren't immediately visible.

**Solution:**
- Add animated pulse for actively watching folders
- Show file count being monitored
- Add connection health indicator
- Toast notifications for events

```
┌─────────────────────────────────────────────┐
│ 📁 Downloads                                │
│ ● Watching (42 files monitored)        ⚙️ 🗑️│
│   /Users/james/Downloads                    │
│   ├─ Last event: 2 minutes ago              │
│   └─ Health: ✅ Connected                   │
└─────────────────────────────────────────────┘
```

**Files to modify:**
- `WatchFolders.jsx` - Enhance WatchedFolderCard
- `watcherService.js` - Add health check and file count

#### C2. Pause/Resume Individual Folders
**Problem:** Current toggle is basic, no visual feedback during transition.

**Solution:**
- Add transition animation
- Show reason if paused automatically (e.g., path unavailable)
- Add bulk pause/resume all

**Files to modify:**
- `WatchFolders.jsx` - Enhance toggle with animations
- Add bulk action buttons in header

#### C3. Activity Log Filtering
**Problem:** Activity log shows all events, hard to find specific items.

**Solution:**
- Add filter by folder
- Add filter by action type (detected/queued/organized/error)
- Add filter by date
- Add search by filename

```
┌─────────────────────────────────────────────┐
│ Activity Log                          [⚙️]  │
├─────────────────────────────────────────────┤
│ Folder: [All ▼]  Action: [All ▼]  🔍 search │
├─────────────────────────────────────────────┤
│ 👀 invoice-2026.pdf        → 11.01  2m ago  │
│ ✅ report.docx             → 12.03  5m ago  │
│ ...                                         │
└─────────────────────────────────────────────┘
```

**Files to modify:**
- `WatchFolders.jsx` - Add ActivityLogFilters component
- `db/repositories/watch-activity.js` - Add filter support to queries

---

## Implementation Order

### Phase 1: File Organizer (Option A)
1. [ ] A2 - Error handling improvements (foundation)
2. [ ] A1 - Bulk preview mode (major feature)
3. [ ] A3 - Rule matching edge cases (enhancement)

### Phase 2: Statistics Dashboard (Option B)
4. [ ] B1 - Custom date range picker (major feature)
5. [ ] B2 - CSV export (new capability)
6. [ ] B3 - Period comparison (enhancement)

### Phase 3: Watch Folders UX (Option C)
7. [ ] C1 - Status indicators (visual polish)
8. [ ] C3 - Activity log filtering (usability)
9. [ ] C2 - Pause/resume improvements (polish)

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `components/FileOrganizer/OrganizationPreview.jsx` | Bulk preview component |
| `components/Stats/DateRangePicker.jsx` | Custom date range selector |
| `utils/csvExport.js` | CSV generation utilities |

### Modified Files
| File | Changes |
|------|---------|
| `FileOrganizer.jsx` | Preview integration, error detail UI |
| `matchingEngine.js` | Compound rules, exclude patterns |
| `RulesManager.jsx` | New rule type UI |
| `fileOperations.js` | Error classification |
| `StatsDashboard.jsx` | Date picker, export button, comparison |
| `StatCard.jsx` | Comparison mode |
| `ActivityChart.jsx` | Previous period overlay |
| `statisticsService.js` | Date filtering, comparison data |
| `WatchFolders.jsx` | Status enhancements, filters |
| `watcherService.js` | Health checks, file counts |
| `watch-activity.js` | Filter support |

---

## Testing Strategy

Each enhancement will include:
1. Unit tests for new logic
2. Component tests for new UI
3. Manual verification in Electron

---

## Security Considerations

- [ ] File paths in preview sanitized before display
- [ ] CSV export escapes special characters
- [ ] Date picker validates input ranges
- [ ] No sensitive data in exported files

---

## Decisions (Approved 2026-02-13)

1. **Scope:** All three options (A → B → C)
2. **Priority:** Confirmed as written
3. **Date Picker:** Custom component (no external library)
4. **CSV Export:** Do NOT include full file paths (privacy)

---

## Approval

- [x] Plan reviewed by James
- [x] Scope confirmed
- [x] Questions answered
- [x] Ready to proceed to EXECUTE phase

**Approved:** 2026-02-13
