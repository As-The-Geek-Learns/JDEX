# Next Session Checklist

## Pre-Session Verification
- [ ] Pull latest from main: `git pull origin main`
- [ ] Install dependencies: `npm install`
- [ ] Run tests: `npm test`
- [ ] Check for open issues: `gh issue list`
- [ ] Check for open PRs: `gh pr list`

## Suggested Focus Areas

### Option A: File Organizer Enhancements
**Goal:** Improve the Premium file organization feature

Tasks:
- [ ] Review current rule matching logic in `matchingEngine.js`
- [ ] Identify edge cases not covered by rules
- [ ] Add preview mode for bulk operations
- [ ] Improve error messages for failed file moves
- [ ] Add tests for new functionality

### Option B: Statistics Dashboard Polish
**Goal:** Enhance the analytics experience

Tasks:
- [ ] Add date range picker for custom periods
- [ ] Implement CSV export for stats
- [ ] Add comparison view (this week vs last week)
- [ ] Fix chart sizing warnings in tests
- [ ] Consider additional chart types (treemap, etc.)

### Option C: Watch Folders UX
**Goal:** Better user experience for folder monitoring

Tasks:
- [ ] Add real-time status indicators (watching/paused/error)
- [ ] Implement pause/resume for individual folders
- [ ] Add activity log filtering by folder
- [ ] Improve error recovery when folders become unavailable
- [ ] Add notification preferences

### Option D: Performance Audit
**Goal:** Identify and fix performance bottlenecks

Tasks:
- [ ] Profile database queries with large datasets
- [ ] Review component re-render patterns
- [ ] Implement React.memo where beneficial
- [ ] Add loading states for slow operations
- [ ] Consider virtualization for long lists

### Option E: Technical Debt
**Goal:** Code quality improvements

Tasks:
- [ ] Address ESLint warnings (7 remaining)
- [ ] Review TODO comments in codebase
- [ ] Update dependencies (check for security updates)
- [ ] Improve error boundary coverage
- [ ] Document complex algorithms

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
| Unit Tests | 3,135 passing |
| E2E Tests | 56 passing |
| Repository Coverage | 97.85% |
| Service Coverage | 94.46% |
| ESLint Warnings | 7 |
| Open Issues | 0 |
| Open PRs | 0 |
