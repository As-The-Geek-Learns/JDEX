# Next Session Checklist

## Pre-Session Verification
- [ ] Pull latest from main: `git pull origin main`
- [ ] Install dependencies: `npm install`
- [ ] Run tests: `npm test`
- [ ] Check for open issues: `gh issue list`
- [ ] Check for open PRs: `gh pr list`

## Recently Completed

### Feature Enhancements (PR #65 - 2026-02-14)
- [x] File Organizer: Bulk preview, error handling, rule matching
- [x] Statistics Dashboard: Date picker, CSV export, comparison view
- [x] Watch Folders: Status indicators, pause/resume, activity filtering

### Code Quality (2026-02-14)
- [x] Fixed all ESLint warnings (8 → 0)
- [x] Moved `getPreviousPeriodRange` to `utils/dateUtils.js`
- [x] Added eslint-disable for context hook exports (standard React pattern)
- [x] Fixed ResizeObserver mock for Recharts in StatsDashboard tests
- [x] Updated safe dependencies (jsdom 26.1.0, lucide-react 0.564.0, msw 2.12.10, sql.js 1.14.0, @types/react 18.3.28)

## Suggested Focus Areas

### Option A: Performance Audit
**Goal:** Identify and fix performance bottlenecks

Tasks:
- [ ] Profile database queries with large datasets
- [ ] Review component re-render patterns
- [ ] Implement React.memo where beneficial
- [ ] Add loading states for slow operations
- [ ] Consider virtualization for long lists

### Option B: Technical Debt
**Goal:** Code quality improvements

Tasks:
- [x] ~~Address ESLint warnings~~ (Done: 0 warnings)
- [x] ~~Review TODO comments~~ (None found)
- [x] ~~Update safe dependencies~~ (5 packages updated)
- [x] ~~Fix chart sizing warnings~~ (ResizeObserver mock fixed)
- [ ] Improve error boundary coverage
- [ ] Document complex algorithms

#### Major Version Upgrades (Future Planning)

These require careful migration planning:

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| React | 18.3.1 | 19.2.4 | Breaking: new compiler, concurrent features |
| Electron | 35.7.5 | 40.4.1 | Multiple major versions; check breaking changes |
| date-fns | 2.30.0 | 4.1.0 | API changes in v3+ |
| ESLint | 9.39.2 | 10.0.0 | Config format changes |
| Recharts | 2.15.4 | 3.7.0 | Component API changes |
| Tailwind CSS | 3.4.19 | 4.1.18 | Significant architecture changes |
| Vitest | 3.2.4 | 4.0.18 | Test API changes |
| @electron/notarize | 2.5.0 | 3.1.1 | Notarization workflow changes |
| @vitejs/plugin-react | 4.7.0 | 5.1.4 | Check React 19 compatibility |
| concurrently | 8.2.2 | 9.2.1 | CLI changes |
| lint-staged | 15.5.2 | 16.2.7 | Config format changes |
| wait-on | 7.2.0 | 9.0.4 | API changes |

**Recommended upgrade order:**
1. ESLint + related plugins (isolated to tooling)
2. date-fns (isolated utility)
3. Recharts (isolated to Stats components)
4. Vitest + coverage (test tooling)
5. React 19 + related (major effort - needs testing)

### Option C: Platform Distribution
**Goal:** Expand platform support

Tasks:
- [ ] Windows distribution build and testing
- [ ] Linux distribution (AppImage, deb)
- [ ] Update README with download links
- [ ] Set up release automation

### Option D: New Features
**Goal:** Expand functionality

Tasks:
- [ ] Cloud sync options
- [ ] File system integration (create/manage actual folders)
- [ ] Import from existing folder structures
- [ ] Additional chart types (treemap, etc.)
- [ ] Notification preferences for watch folders

## Quick Commands

```bash
# Development
npm run electron:dev     # Run app with hot reload
npm run dev              # Vite only (no Electron)

# Testing
npm test                 # Run unit tests
npm run test:coverage    # Run with coverage report
npm run test:e2e         # Run E2E tests (build first)

# Code Quality
npm run lint             # Check for issues
npm run lint:fix         # Auto-fix issues
npm run format           # Format with Prettier

# Build
npm run build            # Production build
npm run electron:build   # Package for distribution
```

## Current Metrics

| Metric | Value |
|--------|-------|
| Unit Tests | 3,258 passing |
| E2E Tests | 56 passing |
| Repository Coverage | 97.85% |
| Service Coverage | 94.46% |
| ESLint Warnings | 0 |
| Open Issues | 0 |
| Open PRs | 0 |

## Session History

| Date | Focus | Outcome |
|------|-------|---------|
| 2026-02-14 | Technical debt | Chart fix, safe deps updated, major upgrades documented |
| 2026-02-14 | ESLint cleanup | Fixed all 8 warnings |
| 2026-02-14 | Feature enhancements | File organizer, stats, watch folders |
| 2026-02-13 | Repository tests | Full coverage across all repos |
| 2026-02-12 | E2E tests | Playwright tests for Electron |
| 2026-02-11 | DB refactor | Modular repository pattern |
