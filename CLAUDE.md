# CLAUDE.md - JDex Project Context
# Location: /jdex-complete-package/CLAUDE.md
# Last Updated: January 2026
# Purpose: Project-specific context for Claude Code sessions

## Project Overview

**JDex** is a desktop application for managing a [Johnny Decimal](https://johnnydecimal.com/) file organization system. It provides a visual index manager with CRUD operations, search, import/export, and premium features for automated file organization.

- **Version**: 2.1.0
- **License**: MIT
- **Author**: James Cruce / As The Geek Learns (astgl.com)
- **Repo**: https://github.com/As-The-Geek-Learns/JDEX
- **Premium Repo**: https://github.com/As-The-Geek-Learns/jdex-premium (Gumroad distribution)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Desktop Framework | Electron 28 | Main process in `app/electron/main.js` |
| Frontend | React 18.2 (JSX, no TypeScript) | Single-page app in `app/src/` |
| Styling | Tailwind CSS 3.4 | Custom JD theme (navy/teal/orange), glass morphism |
| Database | SQLite via sql.js (WebAssembly) | Loaded from CDN, stored in localStorage |
| Build Tool | Vite 6.4 | Config in `app/vite.config.js` |
| Packaging | electron-builder 26.4 | macOS (DMG/ZIP), Windows (NSIS/portable), Linux (AppImage/deb) |
| Icons | Lucide React 0.263 | Consistent icon system throughout UI |
| Charts | Recharts 2.12 | Statistics dashboard visualizations |
| Dates | date-fns 2.30 | Date formatting and manipulation |

### ESM Module System
The project uses ES Modules (`"type": "module"` in package.json). All imports use ESM syntax. The Electron main process files also use ESM.

---

## Repository Structure

```
jdex-complete-package/          # Monorepo root
├── app/                        # The Electron application (ALL source code lives here)
│   ├── electron/               # Electron main process
│   │   ├── main.js             # Main process entry, IPC handlers, window management
│   │   └── electron-main.js    # Entry point config
│   ├── src/                    # React frontend
│   │   ├── App.jsx             # Root component (2,622 lines - monolithic, needs refactoring)
│   │   ├── db.js               # Database layer (3,344 lines - all CRUD + migrations)
│   │   ├── index.css            # Global styles + Tailwind directives
│   │   ├── main.jsx            # React entry point
│   │   ├── components/         # Feature-grouped React components
│   │   │   ├── BatchRename/    # BatchRenameModal, FileSelector, RenamePreview
│   │   │   ├── DragDrop/       # DropZone
│   │   │   ├── FileOrganizer/  # FileOrganizer, RulesManager, ScannerPanel, WatchFolders
│   │   │   ├── Settings/       # CloudDriveSettings, LicenseSettings, FeedbackSettings
│   │   │   └── Stats/          # StatsDashboard, ActivityChart, FileTypeChart, StatCard, TopRulesCard
│   │   ├── services/           # Business logic (no UI)
│   │   │   ├── batchRenameService.js    # Pattern matching, rename operations
│   │   │   ├── cloudDriveService.js     # iCloud/OneDrive/ProtonDrive/Dropbox routing
│   │   │   ├── dragDropService.js       # File drop handling
│   │   │   ├── fileOperations.js        # File system operations (Electron IPC)
│   │   │   ├── fileScannerService.js    # Folder scanning
│   │   │   ├── licenseService.js        # Gumroad premium license validation
│   │   │   ├── matchingEngine.js        # Rule matching logic for file organizer
│   │   │   ├── statisticsService.js     # Activity tracking and metrics
│   │   │   └── watcherService.js        # Folder monitoring (watch folders)
│   │   ├── context/            # React contexts
│   │   │   ├── DragDropContext.jsx       # Global drag state
│   │   │   └── LicenseContext.jsx        # Premium license state
│   │   └── utils/              # Pure utility functions
│   │       ├── errors.js                # Custom error classes (DatabaseError, etc.)
│   │       └── validation.js            # Input sanitization and validation
│   ├── build/                  # Build resources (icons, entitlements)
│   ├── scripts/                # Build scripts (notarize, sign, generate icons)
│   ├── package.json            # App dependencies and build config
│   ├── vite.config.js          # Vite build configuration
│   ├── eslint.config.js        # ESLint flat config (ES2022, React hooks)
│   ├── tailwind.config.js      # Custom JD theme, animations, glass effects
│   └── .prettierrc             # Prettier config (single quotes, 100 width)
├── docs/                       # Project documentation
├── scripts/                    # Root-level utility scripts
├── .github/                    # GitHub Actions CI + security docs
│   └── workflows/ci.yml        # Lint, security scan, build verification
├── .husky/                     # Git hooks (pre-commit: lint-staged)
├── .workflow/                  # Session plans, checklists, templates
├── marketing/                  # Marketing materials
├── rules/                      # Johnny Decimal rule definitions
└── jdex-cursor-config/         # Cursor IDE configuration
```

---

## Data Architecture

### Johnny Decimal 4-Level Hierarchy
```
Areas (10-19, 20-29, ...)       # Broad life/work categories
  └── Categories (11, 12, ...)  # Topic groups within an area
      └── Folders (11.01, 11.02, ...)    # Container folders
          └── Items (11.01.001, ...)      # Individual tracked objects
```

### Database
- **Engine**: sql.js (SQLite compiled to WebAssembly)
- **Storage**: Serialized to `localStorage` key `jdex_database_v2`
- **Schema Version**: 7 (migrations in `db.js`)
- **Key Tables**: areas, categories, folders, items, file_organization_rules, activity_log, statistics
- **All queries use parameterized statements** (no SQL injection risk)

### Key Design Decisions
- **Local-first**: No server, no cloud by default. Data lives in the browser's localStorage.
- **sql.js loaded from CDN**: `https://sql.js.org/dist/sql-wasm.js` (not bundled)
- **No ORM**: Direct SQL via sql.js API. All queries in `db.js`.
- **Single database file**: All tables in one logical unit, exportable as JSON.

---

## Premium vs. Free Features

JDex uses a freemium model with Gumroad licensing.

| Feature | Free Tier | Premium |
|---------|-----------|---------|
| JD Index Management | Full | Full |
| Search | Full | Full |
| Import/Export | Full | Full |
| File Organizer | View only | Full |
| Watch Folders | -- | Full |
| Cloud Drive Routing | -- | Full |
| Drag & Drop | 5/month | Unlimited |
| Batch Rename | 5 files | Unlimited |
| Statistics Dashboard | Basic | Full |

**License validation** happens in `licenseService.js` via `LicenseContext.jsx`. Premium features check `useLicense()` context before enabling full functionality.

---

## Development Commands

All commands run from the `app/` directory:

```bash
# Development
npm run dev              # Vite dev server only (http://localhost:5173)
npm run electron:dev     # Vite + Electron with hot reload

# Build
npm run build            # Vite production build to dist/
npm run electron:build   # Full Electron build for current platform
npm run electron:build:mac    # macOS DMG + ZIP (arm64 + x64)
npm run electron:build:win    # Windows NSIS installer + portable
npm run electron:build:linux  # Linux AppImage + deb

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format all files
npm run format:check     # Prettier check (used in CI)

# Utilities
npm run icons            # Regenerate app icons from source PNG
```

---

## Code Quality & Conventions

### Enforced via Tooling
- **ESLint 9** (flat config): ES2022, React hooks rules, React Refresh
- **Prettier**: Single quotes, 2-space indent, 100 char width, ES5 trailing commas
- **Husky + lint-staged**: Pre-commit hook runs ESLint fix + Prettier on staged files
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `security:`, `chore:`, `refactor:`, `test:`, `release:`

### Coding Patterns in This Project
- **React functional components only** (no class components)
- **useState/useEffect/useCallback** for state management (no Redux or external state library)
- **React Context** for cross-cutting concerns (License, DragDrop)
- **Service layer pattern**: Business logic in `services/`, UI in `components/`
- **Tailwind utility classes** for all styling (no CSS modules, no styled-components)
- **Lucide React** for all icons (consistent import pattern)
- **sql.js parameterized queries** for all database operations

### Custom Tailwind Theme
The project uses a dark theme with custom design tokens in `tailwind.config.js`:
- **Colors**: `jd-navy`, `jd-teal`, `jd-orange`, `surface-base/primary/secondary/tertiary`
- **Fonts**: Inter (sans), JetBrains Mono (mono)
- **Effects**: Glass morphism backgrounds, glow shadows, fade/slide animations

---

## CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`) runs on push to `main` and all PRs:

1. **Quality**: ESLint + Prettier format check
2. **Security**: npm audit (high severity), Semgrep (security/JS/secrets), Gitleaks
3. **Build**: Vite production build + output size check (depends on Quality passing)

**Dependabot** is enabled for npm dependency updates in `app/`.

---

## Security Considerations

### Implemented
- Parameterized SQL queries (no injection)
- Input sanitization via `utils/validation.js` (sanitizeText, validateRequiredString)
- Custom error classes in `utils/errors.js` (no silent error swallowing)
- XSS prevention via React's default HTML escaping
- Gitleaks + Semgrep in CI pipeline
- No secrets in codebase; `.gitignore` covers `.env`, `*.db`, `*.sqlite`

### Known Technical Debt
- **Electron 28 is outdated** (current: 35.x). Upgrade blocked by ESM refactoring needs.
- **sql.js loaded from CDN** at runtime rather than bundled (external dependency risk)
- **localStorage for database storage** has a ~5-10MB limit depending on browser/Electron

---

## Known Structural Debt

These are acknowledged issues, not bugs:

| Issue | File | Lines | Impact |
|-------|------|-------|--------|
| Monolithic root component | `App.jsx` | 2,622 | Hard to navigate, no routing |
| All DB logic in one file | `db.js` | 3,344 | Migrations, queries, schema mixed |
| No automated tests | -- | 0 | No safety net for refactoring |
| No TypeScript | All `.jsx`/`.js` | -- | No compile-time type checking |

---

## Git Workflow

- **Main branch**: `main` (production-ready)
- **Feature branches**: `feature/*` naming convention
- **PRs**: Merged via GitHub Pull Requests
- **Two remotes**: `origin` (public JDEX) and `premium` (private jdex-premium)
- **Branch protection**: CI must pass (quality + security + build)

### Branching Pattern
```
main ─────────────────────────────── (production)
  └── feature/statistics-dashboard ─ (merged via PR)
  └── feature/drag-and-drop ──────── (merged via PR)
  └── feature/batch-rename ────────── (merged via PR)
```

---

## Working With This Codebase

### Adding a New Feature
1. Create a feature branch: `feature/your-feature`
2. If it needs UI: Add component(s) in `app/src/components/YourFeature/`
3. If it needs business logic: Add service in `app/src/services/yourFeatureService.js`
4. If it needs database changes: Add migration in `db.js` (increment `SCHEMA_VERSION`)
5. If it's premium-gated: Check license in component via `useLicense()` from `LicenseContext`
6. Wire into `App.jsx` (currently all top-level routing/state lives here)
7. Run `npm run lint:fix && npm run format` before committing

### Adding a Database Migration
In `db.js`, migrations are numbered. The current schema version is **7**.
```javascript
// In the runMigrations() function:
if (currentVersion < 8) {
  db.run("ALTER TABLE ... ");
  db.run("UPDATE schema_version SET version = 8");
}
```

### Key Files to Read First
When starting a new session, these files give the most context:
1. `app/src/App.jsx` - All UI state, navigation, feature integration
2. `app/src/db.js` - Database schema, queries, migrations
3. `app/src/services/licenseService.js` - Premium feature gating logic
4. `app/tailwind.config.js` - Design system tokens

---

## Environment Setup

### Prerequisites
- **Node.js 20+** (CI uses Node 20)
- **npm** (lockfile at `app/package-lock.json`)
- **macOS** for Electron development (primary dev platform)

### First-Time Setup
```bash
cd app
npm install
npm run electron:dev
```

### Code Signing (Release Builds Only)
- **macOS**: Requires Apple Developer account, certificates, and notarization credentials in env vars
- **Windows**: Requires EV code signing certificate (FTL Consulting LLC)
- See `docs/DISTRIBUTION-SETUP.md` and `docs/NOTARIZATION-SETUP.md` for details

---

## Development Workflow: Ironclad 4-Phase Process

This project uses a structured workflow with mandatory quality gates and AI-powered code review.

### Workflow Phases

#### Phase 1: PLAN
Before writing any code, create or update a plan document.

**Required:**
- Create `.workflow/sessions/SESSION-YYYY-MM-DD-[slug]/plan.md` using the template
- Define problem statement and success criteria
- Complete security considerations section
- Break down tasks with dependencies
- Get human approval before proceeding

**Gate:** Human must approve the plan before EXECUTE phase begins.

#### Phase 2: EXECUTE
Implement the planned tasks systematically.

**Required:**
- Work through tasks in dependency order
- Create feature branch for the work
- Update session documentation as you go
- Mark tasks complete in plan.md as finished
- Run linting and fix issues before proceeding

**Gate:** All planned tasks must be marked complete before VERIFY phase.

#### Phase 3: VERIFY
Validate the implementation thoroughly.

**Required:**
- Run `node scripts/verify.js` to:
  - Generate file hashes
  - Run automated tests
  - Run linter
  - Run security audit (npm audit)
  - **Run AI code review (Gemini)**
- Complete verification checklist
- Address any AI review findings
- Perform visual verification (capture screenshots if UI)
- Get human approval of verification results

**AI Code Review:**
The verification includes automated AI review using Google Gemini that checks for:
- Security vulnerabilities (injection, auth issues, data exposure)
- Code quality issues (clarity, error handling, edge cases)
- Best practices violations

If AI review finds issues:
1. Review the findings in `.workflow/state/ai-review.json`
2. Address CRITICAL and HIGH severity issues before shipping
3. Document any accepted risks in the session notes

**Gate:** Human must approve verification before SHIP phase.

#### Phase 4: SHIP
Merge the verified code.

**Required:**
- Run `node scripts/ship.js` to validate file integrity
- File hashes must match verification state
- Create PR with evidence
- Include AI review summary in PR
- **Get human approval for merge**

**Gate:** File integrity must pass before PR creation.

### Human Checkpoints

The workflow has mandatory human checkpoints:
1. **Plan Approval** - Before any code is written
2. **Verification Approval** - After testing and AI review, before shipping
3. **Ship Approval** - Final merge decision

Never auto-proceed past these checkpoints. Always ask for explicit approval.

### Security Requirements

For every change:
- Review `.workflow/checklists/security-review.md`
- Validate all user inputs
- Sanitize data before storage/display
- Use parameterized queries for database operations
- Never expose sensitive data in errors or logs
- Run `npm audit` before shipping
- **Review AI security findings and address issues**

### AI Review Configuration

The AI review requires a Gemini API key:
```bash
export GEMINI_API_KEY="your-api-key"
```

To run AI review standalone:
```bash
node scripts/ai-review.js           # Full review
node scripts/ai-review.js --diff    # Review git changes only
node scripts/ai-review.js --security-focus  # Security only
```

### Session Management

Each development session should:
1. Reference or create a plan document
2. Create session documentation using the template
3. Track all changes made
4. Document any issues encountered
5. Update verification status
6. **Document AI review findings and resolutions**

### Workflow Commands

- `node scripts/verify.js` - Full verification with AI review
- `node scripts/verify.js --skip-ai-review` - Skip AI review
- `node scripts/ai-review.js` - Run AI review only
- `node scripts/ship.js` - Validate and prepare for shipping

### Enforcing the Workflow

When the user requests changes:
1. Check if a plan exists for this work
2. If no plan, switch to PLAN phase first
3. If plan exists but not approved, request approval
4. If executing, ensure you're following the task order
5. If verifying, run all checks including AI review before proceeding
6. If shipping, validate integrity first

Always be explicit about which phase you're in and what gates need to be satisfied.

---

## Session Documentation

Development sessions are documented in `.workflow/sessions/`. When completing significant work:
1. Update this CLAUDE.md if architecture or conventions change
2. Offer to create a session summary with decisions made and next steps
3. Flag any [ASTGL CONTENT] moments for potential publication
