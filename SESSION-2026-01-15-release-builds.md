# Session: Release Builds for Gumroad Distribution

**Date:** January 15, 2026  
**Focus:** Code signing, notarization, and installer creation for JDex and Substack Scheduler

---

## Summary

Successfully built signed and notarized releases of both JDex (Electron) and Substack Scheduler (Tauri) for distribution on Gumroad.

---

## Work Completed

### 1. JDex (Electron App) - v2.0.1

**Build Process:**
1. Ran `npm install` to ensure dependencies up-to-date
2. Generated icons using `./build-icons.sh`
3. Built with `npm run electron:build`
4. Notarization handled automatically via `scripts/notarize.js`

**Output Files:**
| File | Architecture | Size |
|------|-------------|------|
| `JDex-2.0.1-arm64.dmg` | Apple Silicon (M1/M2/M3) | 100 MB |
| `JDex-2.0.1.dmg` | Intel x64 | 107 MB |

**Location:** `/Users/jamescruce/Projects/jdex-complete-package/app/dist-electron/`

**Verification:**
```
source=Notarized Developer ID
origin=Developer ID Application: James Cruce (Z4CHD4858S)
```

---

### 2. Substack Scheduler (Tauri App) - v1.0.0

**Build Script Update:**
Updated `scripts/build-release.sh` to use the existing keychain profile instead of requiring environment variables:

**Before:**
```bash
# Required manual environment variables
export APPLE_ID="..."
export APPLE_PASSWORD="..."
export APPLE_TEAM_ID="..."
```

**After:**
```bash
# Uses keychain profile automatically
KEYCHAIN_PROFILE="notarytool-profile"
xcrun notarytool submit "$DMG_PATH" --keychain-profile "$KEYCHAIN_PROFILE" --wait
```

**Build Process:**
1. Ran `./scripts/build-release.sh`
2. Script automatically:
   - Built Python sidecar with PyInstaller
   - Signed the sidecar binary
   - Built and signed Tauri app with `cargo tauri build`
   - Submitted to Apple for notarization
   - Stapled the notarization ticket

**Output File:**
| File | Architecture | Size |
|------|-------------|------|
| `Substack Scheduler_1.0.0_aarch64.dmg` | Apple Silicon | 61 MB |

**Location:** `/Users/jamescruce/Projects/substack-scheduler/src-tauri/target/release/bundle/dmg/`

**Verification:**
```
source=Notarized Developer ID
origin=Developer ID Application: James Cruce (Z4CHD4858S)
```

---

## Technical Details

### Code Signing Identity
```
Developer ID Application: James Cruce (Z4CHD4858S)
```

### Keychain Profile
Both apps use the same notarization credentials stored as `notarytool-profile` in the macOS Keychain:
- Apple ID: `apple@jamescruce.me`
- Team ID: `Z4CHD4858S`
- App-specific password (stored securely in Keychain)

### JDex Notarization Flow (Electron)
```
npm run electron:build
  → Vite builds frontend
  → electron-builder packages app
  → Code signing via Developer ID
  → scripts/notarize.js runs @electron/notarize
  → DMG created for both arm64 and x64
```

### Substack Scheduler Notarization Flow (Tauri)
```
./scripts/build-release.sh
  → PyInstaller builds Python sidecar
  → codesign signs sidecar with entitlements
  → cargo tauri build
  → Tauri signs app bundle
  → xcrun notarytool submits for notarization
  → xcrun stapler staples ticket to DMG
```

---

## Files Changed

### Substack Scheduler
- **Modified:** `scripts/build-release.sh`
  - Removed requirement for APPLE_* environment variables
  - Added keychain profile verification step
  - Updated notarytool command to use `--keychain-profile`
  - Added better error messages and visual checkmarks

---

## Gumroad Upload Checklist

### JDex v2.0.1
- [ ] Upload `JDex-2.0.1-arm64.dmg` → Label: "Mac (Apple Silicon M1/M2/M3)"
- [ ] Upload `JDex-2.0.1.dmg` → Label: "Mac (Intel)"
- [ ] Update version number in product description

### Substack Scheduler v1.0.0
- [ ] Upload `Substack Scheduler_1.0.0_aarch64.dmg` → Label: "Mac (Apple Silicon)"
- [ ] Update version number in product description

---

## Future Builds

For future releases, both are now one-command operations:

**JDex:**
```bash
cd /Users/jamescruce/Projects/jdex-complete-package/app
npm run electron:build
```

**Substack Scheduler:**
```bash
cd /Users/jamescruce/Projects/substack-scheduler
./scripts/build-release.sh
```

No manual credential entry required - keychain profile handles authentication.

---

## Related Work (Same Session)

Earlier in this session, security improvements were applied to both projects:

### Security Additions
- `SECURITY.md` - Public security policy
- `.github/SECURITY-REVIEW.md` - PR security review checklist  
- Semgrep SAST scanning added to CI pipeline

### Dev Standards Repository
Created reusable templates at `/Users/jamescruce/Projects/dev-standards/`:
- CI templates for JS/TS and Tauri projects
- Security documentation templates
- Validation/error handling utility templates
- New project setup checklists
- `SECURE-WORKFLOW.md` - Master workflow reference

---

## Why Notarization Matters

- ✅ Users can double-click to install (no "unidentified developer" warning)
- ✅ Required for macOS Catalina (10.15) and later
- ✅ Builds trust with customers
- ✅ Required by many software directories
- ✅ Works offline after stapling (no need to phone home to Apple)

---

## Session Duration
~45 minutes (including Apple notarization wait times)
