# JDEX

Desktop app for managing a [Johnny Decimal](https://johnnydecimal.com/) file-organization
system: visual index manager with CRUD, search, and import/export. Electron + React (JSX,
no TypeScript), Tailwind, SQLite via sql.js (WASM). This is the free/public repo
(`As-The-Geek-Learns/JDEX`) — the licensed premium build lives in the separate
`jdex-premium` repo, and the two have diverged more than a shared-codebase model implies
(see Gotchas).

## Structure

`app/` is the real project root — all tooling, scripts, and configs live there; the repo
root above it is a leftover monorepo split. `app/src/` is a flat monolith, not a
components/services/context tree:

- `App.jsx` — all UI state, navigation, and feature wiring
- `db.js` — all schema, migrations, and CRUD (see Known Debt)
- `utils/errors.js`, `utils/validation.js` — error classes + input sanitization
- `electron/main.js` — Electron main process, IPC handlers

**Style**: functional components + hooks only — no classes, no Redux, no Context, no
service layer (all logic lives inline in `App.jsx`/`db.js`). Tailwind utilities, Lucide
icons, parameterized sql.js queries throughout.

## Johnny Decimal hierarchy

```
Areas (10-19, 20-29, ...)                  # Broad life/work categories
  └── Categories (11, 12, ...)             # Topic groups within an area
      └── Folders (11.01, 11.02, ...)      # Container folders
          └── Items (11.01.001, ...)       # Individual tracked objects
```

## Gotchas

- **Local-first by design**: no server, no cloud sync. All data lives in the browser's
  localStorage as a single SQLite file (sql.js), exportable as JSON.
- **sql.js loads from a CDN at runtime** (`https://sql.js.org/dist/sql-wasm.js`), not
  bundled — deliberate, not a bug to fix.
- **No premium/license code exists in this repo.** File Organizer, Watch Folders, Cloud
  Drive Routing, Batch Rename, etc. are simply not gated here — this repo IS the free
  tier. `licenseService`/`LicenseContext`/Gumroad code all live only in `jdex-premium`.
- Migrations are tracked via a `SCHEMA_VERSION` constant + `schema_version` table, both
  in `db.js` — bump the constant and add a migration branch when changing the schema.
- Feature branches use `feature/*`, not global's `feat:`/`fix:`/`docs:` prefix
  convention — an older convention that predates the global one. `jdex-premium` is a
  separate repo/checkout, not a git remote of this one (confirmed: only `origin` here).

## Known Debt

- `App.jsx` and `db.js` are both large single-file monoliths — no routing, all SQL
  inline, no ORM.
- No automated tests, no TypeScript — `jdex-premium` has migrated to both; this repo
  hasn't.
- localStorage-backed sql.js has a practical ceiling around 5-10MB.

## Commands (run from `app/`)

| Command | Purpose |
|---|---|
| `npm install && npm run electron:dev` | First-time setup / hot-reload dev |
| `npm run electron:build:mac` (also `:win`, `:linux`) | Platform build |
| `npm run lint:fix && npm run format` | Before every commit |

Code signing (release builds only) — see `app/DISTRIBUTION-SETUP.md` and
`app/NOTARIZATION-SETUP.md`.

## Workflow

Follows the global Ironclad Workflow (`~/.claude/CLAUDE.md`). Unlike `jdex-premium`, this
repo has **no** `verify.js`/`ship.js`/AI-review scripts and no `.workflow/checklists/` or
`.workflow/state/` — `.workflow/sessions/` holds past session notes only. Don't assume the
premium repo's scripted verify/ship pipeline exists here.
