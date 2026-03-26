# Plan: Statistics Dashboard

**Session ID:** SESSION-2026-01-19-statistics-dashboard  
**Created:** 2026-01-19  
**Status:** Completed

---

## 1. Problem Statement

### What are we solving?
JDex Premium users organize files but have no visibility into their organization patterns, productivity gains, or which rules are most effective. Users need a visual dashboard showing their file organization statistics to understand the value they're getting from the tool.

### Why does it matter?
- **Value Demonstration:** Visual proof of organization activity justifies the $29 premium price
- **User Engagement:** Seeing statistics encourages continued use and organization habits
- **Marketing Asset:** Dashboard screenshots make excellent Gumroad promotional material
- **Rule Optimization:** Shows which rules are most effective, helping users improve their setup

### Success Criteria
- [ ] Dashboard displays total files organized (all time and this month)
- [ ] Files organized over time shown as a line/area chart (last 30 days)
- [ ] File type breakdown shown as a pie/donut chart
- [ ] Top rules by match count displayed
- [ ] Watch folder activity summary displayed
- [ ] Dashboard accessible from main navigation (premium feature)
- [ ] Dashboard renders correctly in Electron window
- [ ] No performance impact on app startup

---

## 2. Security Considerations

### Data Handling
- [x] No sensitive data exposed in logs or errors (file paths may be aggregated but not exposed individually)
- [x] User inputs will be validated at: N/A - dashboard is read-only
- [x] Data sanitization applied before: Display (aggregate counts only, no raw paths in charts)

### Attack Surface
- [x] No new external dependencies with known vulnerabilities (using lightweight charting)
- [x] No new API endpoints without authentication (all local data)
- [x] No file system access without path validation (read-only from existing DB)

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with large datasets | Medium | Low | Limit queries, use aggregations |
| Chart library vulnerabilities | Low | Low | Use well-maintained library |
| Memory usage with chart rendering | Low | Medium | Lazy load, limit data points |

---

## 3. Approach Selection

### Option A: Recharts (React charting library)
**Description:** Use Recharts, a composable charting library built on React components and D3.
**Pros:**
- Built specifically for React
- Declarative, component-based API
- Good documentation
- ~200KB bundle size (tree-shakeable)
- MIT license
**Cons:**
- Another dependency to maintain
**Effort:** Medium

### Option B: Chart.js with react-chartjs-2
**Description:** Use Chart.js, a popular canvas-based charting library.
**Pros:**
- Very popular, well-maintained
- Canvas-based (potentially better performance)
- Good animation support
**Cons:**
- Larger bundle size (~350KB)
- Requires wrapper for React
**Effort:** Medium

### Option C: Custom CSS/SVG charts
**Description:** Build simple charts using CSS (for bar charts) and inline SVG (for pies).
**Pros:**
- No external dependencies
- Smallest bundle impact
- Full control over styling
**Cons:**
- More development time
- Limited chart types
- No built-in animations/tooltips
**Effort:** High

### Selected Approach
**Choice:** Option A (Recharts)  
**Rationale:** Best balance of features, React integration, and bundle size. The declarative API matches the existing codebase style. Tree-shakeable to minimize impact.

---

## 4. Task Breakdown

| # | Task | Files Affected | Dependencies | Status |
|---|------|----------------|--------------|--------|
| 1 | Add Recharts dependency | `app/package.json` | - | [x] |
| 2 | Create statistics service (DB queries) | `app/src/services/statisticsService.js` | - | [x] |
| 3 | Create StatsDashboard component | `app/src/components/Stats/StatsDashboard.jsx` | 1, 2 | [x] |
| 4 | Create StatCard component (reusable) | `app/src/components/Stats/StatCard.jsx` | 1 | [x] |
| 5 | Create FileTypeChart component | `app/src/components/Stats/FileTypeChart.jsx` | 1 | [x] |
| 6 | Create ActivityChart component | `app/src/components/Stats/ActivityChart.jsx` | 1 | [x] |
| 7 | Create TopRulesCard component | `app/src/components/Stats/TopRulesCard.jsx` | 2 | [x] |
| 8 | Integrate dashboard into App.jsx | `app/src/App.jsx` | 3 | [x] |
| 9 | Add premium gate for Statistics | `app/src/components/Stats/StatsDashboard.jsx` | 3, LicenseContext | [x] |
| 10 | Style with Tailwind | Various | 3-7 | [x] |
| 11 | Test with real data | - | All | [x] |

---

## 5. Component Design

### StatsDashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│  Statistics Dashboard                              [Period]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Total    │  │ This     │  │ Active   │  │ Top      │   │
│  │ Organized│  │ Month    │  │ Rules    │  │ Category │   │
│  │   247    │  │    42    │  │    8     │  │ Documents│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                            │
│  ┌─────────────────────────────┐  ┌──────────────────────┐│
│  │  Files Organized Over Time  │  │   Files by Type      ││
│  │  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  │  │     ┌────┐          ││
│  │  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  │  │   ┌─┴────┴─┐        ││
│  │  (Area chart, 30 days)      │  │   │        │        ││
│  │                             │  │   └────────┘        ││
│  └─────────────────────────────┘  │  (Pie/Donut)       ││
│                                    └──────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Top Rules by Matches                                   ││
│  │  1. *.pdf → Documents        ████████████  156          ││
│  │  2. invoice* → Finance       ██████       42           ││
│  │  3. IMG_* → Photos           ████         28           ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Data Queries Needed

```javascript
// statisticsService.js

// Total files organized
SELECT COUNT(*) FROM organized_files WHERE status = 'moved';

// Files this month
SELECT COUNT(*) FROM organized_files 
WHERE status = 'moved' 
AND organized_at >= date('now', 'start of month');

// Files by day (last 30 days)
SELECT DATE(organized_at) as date, COUNT(*) as count 
FROM organized_files 
WHERE status = 'moved' AND organized_at >= date('now', '-30 days')
GROUP BY DATE(organized_at)
ORDER BY date;

// Files by type
SELECT file_type, COUNT(*) as count 
FROM organized_files 
WHERE status = 'moved'
GROUP BY file_type
ORDER BY count DESC;

// Top rules
SELECT name, match_count 
FROM organization_rules 
WHERE is_active = 1
ORDER BY match_count DESC
LIMIT 5;

// Active rules count
SELECT COUNT(*) FROM organization_rules WHERE is_active = 1;
```

---

## 6. Verification Plan

### Automated Tests
- [ ] Unit tests for: statisticsService.js query functions
- [ ] Integration tests for: Dashboard renders with mock data

### Visual Verification
- [ ] UI component renders correctly in Electron
- [ ] Charts display correctly with various data sizes
- [ ] Screenshots captured for: Empty state, populated state, edge cases
- [ ] Responsive behavior in different window sizes

### Manual Review
- [ ] Code review checklist completed
- [ ] Security review checklist completed
- [ ] Premium gate working (shows upgrade prompt for free users)
- [ ] Performance acceptable with 500+ organized files

---

## 7. Approval

### Planning Phase Approval
- [x] **Human checkpoint:** Plan reviewed and approved
- Approved by: James Cruce
- Date: 2026-01-19 

---

## Notes

### Existing Data Sources
From `db.js` schema:
- `organized_files` - Has `filename`, `file_type`, `organized_at`, `status`
- `organization_rules` - Has `name`, `match_count`, `is_active`
- `watch_activity` - Has `filename`, `action`, `created_at`
- `activity_log` - General logging

### Design Considerations
- Match existing JDex UI style (Tailwind, dark mode support)
- Use consistent color palette from existing components
- Charts should have proper loading states
- Empty state should encourage action (e.g., "Start organizing to see stats!")

### Future Enhancements (Out of Scope)
- Export statistics as PDF/image
- Custom date range selection
- Organization streaks/gamification
- Comparison to previous periods
