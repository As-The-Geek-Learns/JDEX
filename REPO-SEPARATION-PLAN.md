# JDex Repository Separation Plan

## Overview

Split JDex into two repositories:
- **jdex** (Public) - Free, open-source core
- **jdex-premium** (Private) - Full app with premium features

---

## Repository Structure

### 📂 jdex (Public - GitHub)

```
jdex/
├── app/
│   ├── src/
│   │   ├── App.jsx              ✏️ Modified (remove premium imports)
│   │   ├── main.jsx             ✅ Keep as-is
│   │   ├── index.css            ✅ Keep as-is
│   │   ├── db.js                ✏️ Modified (remove premium tables)
│   │   ├── components/          (core components only)
│   │   └── utils/
│   │       ├── errors.js        ✅ Keep as-is
│   │       └── validation.js    ✅ Keep as-is
│   ├── electron/                ✅ Keep as-is
│   ├── public/                  ✅ Keep as-is
│   ├── package.json             ✅ Keep as-is
│   └── vite.config.js           ✅ Keep as-is
├── docs/                        ✅ Keep as-is
├── scripts/                     ✅ Keep as-is
├── LICENSE                      ✅ MIT License
└── README.md                    ✏️ Update for community
```

### 📂 jdex-premium (Private - GitHub/GitLab)

```
jdex-premium/
├── app/
│   ├── src/
│   │   ├── App.jsx              ✅ Full version
│   │   ├── main.jsx             ✅ Same
│   │   ├── index.css            ✅ Same
│   │   ├── db.js                ✅ Full version with all tables
│   │   ├── components/
│   │   │   ├── FileOrganizer/   🔒 PREMIUM ONLY
│   │   │   │   ├── FileOrganizer.jsx
│   │   │   │   ├── RulesManager.jsx
│   │   │   │   ├── ScannerPanel.jsx
│   │   │   │   └── WatchFolders.jsx
│   │   │   └── Settings/        🔒 PREMIUM ONLY
│   │   │       ├── CloudDriveSettings.jsx
│   │   │       └── LicenseSettings.jsx
│   │   ├── context/
│   │   │   └── LicenseContext.jsx  🔒 PREMIUM ONLY
│   │   ├── services/            🔒 PREMIUM ONLY
│   │   │   ├── cloudDriveService.js
│   │   │   ├── fileOperations.js
│   │   │   ├── fileScannerService.js
│   │   │   ├── licenseService.js
│   │   │   ├── matchingEngine.js
│   │   │   └── watcherService.js
│   │   └── utils/
│   │       ├── errors.js        ✅ Same
│   │       └── validation.js    ✅ Same
│   ├── electron/                ✅ Same
│   ├── scripts/
│   │   └── notarize.js          🔒 Keep private (signing)
│   └── ...
├── LICENSE                      ⚠️ Proprietary/Commercial
└── README.md                    ✏️ Internal docs
```

---

## Files Classification

### 🔒 Premium Only (Private Repo Only)

| File | Purpose |
|------|---------|
| `src/services/licenseService.js` | Gumroad license validation |
| `src/services/watcherService.js` | Watch folders auto-organize |
| `src/services/matchingEngine.js` | Smart file matching rules |
| `src/services/fileScannerService.js` | Directory scanning |
| `src/services/fileOperations.js` | File move/copy operations |
| `src/services/cloudDriveService.js` | Cloud drive detection |
| `src/context/LicenseContext.jsx` | License state management |
| `src/components/FileOrganizer/*` | Entire File Organizer UI |
| `src/components/Settings/CloudDriveSettings.jsx` | Cloud settings |
| `src/components/Settings/LicenseSettings.jsx` | License management |
| `scripts/notarize.js` | Apple notarization |

### ✅ Public (Both Repos)

| File | Purpose |
|------|---------|
| `src/utils/errors.js` | Error handling utilities |
| `src/utils/validation.js` | Input validation |
| `src/main.jsx` | React entry point |
| `src/index.css` | Styles |
| `electron/*` | Electron main process |
| `public/*` | Static assets |

### ✏️ Modified for Public

| File | Changes for Public Version |
|------|---------------------------|
| `src/App.jsx` | Remove premium imports, FileOrganizer, License UI |
| `src/db.js` | Remove premium tables (migrations 2-7) |

---

## Database Tables

### Public (Free Tier)
- `areas` - JD Areas (00-09, 10-19, etc.)
- `categories` - JD Categories
- `folders` - JD Folders (XX.XX)
- `items` - JD Items (XX.XX.XX)
- `storage_locations` - Physical storage
- `activity_log` - User activity

### Premium Only
- `cloud_drives` - Cloud storage config
- `area_storage` - Area-to-cloud mapping
- `organization_rules` - Smart matching rules
- `organized_files` - File move history
- `scanned_files` - Scan session data
- `watched_folders` - Auto-watch config
- `watch_activity` - Watch event log
- `schema_version` - Migration tracking

---

## Workflow for Maintaining Both Repos

### Initial Setup

```bash
# 1. Rename current repo to premium
cd /Users/jamescruce/Projects
mv jdex-complete-package jdex-premium
cd jdex-premium
git remote set-url origin git@github.com:yourusername/jdex-premium.git

# 2. Create public repo from premium
cd /Users/jamescruce/Projects
cp -r jdex-premium jdex
cd jdex
# Run the strip script (see below)
git remote set-url origin git@github.com:yourusername/jdex.git
```

### Syncing Core Changes

When you make changes to core functionality:

```bash
# 1. Make changes in jdex-premium (your working repo)
cd jdex-premium
git add .
git commit -m "Fix: improved area color picker"

# 2. Cherry-pick to public repo (if applicable)
cd ../jdex
git fetch origin
git cherry-pick <commit-hash>  # Or manually apply changes
```

### Adding Premium Features

All premium work happens only in `jdex-premium`. Never push premium code to `jdex`.

---

## Release Process

### Premium Release (Gumroad)

```bash
cd jdex-premium/app
npm run build
# Creates signed, notarized DMG for Gumroad
```

### Public Release (GitHub)

```bash
cd jdex/app
npm run build
# Creates free version for GitHub releases
```

---

## Checklist Before First Split

- [ ] Create private `jdex-premium` repo on GitHub
- [ ] Push current full codebase to `jdex-premium`
- [ ] Create public `jdex` repo on GitHub
- [ ] Run strip script to remove premium features
- [ ] Test public version builds and runs
- [ ] Update README for public repo
- [ ] Update LICENSE (MIT for public)
- [ ] Create first public release

---

## Notes

1. **Never commit premium code to public repo** - Double check before pushing
2. **Keep premium remote private** - Verify GitHub repo settings
3. **Session files stay out of both** - Add to .gitignore
4. **Gumroad releases from premium only** - Never distribute public build as paid
