# JDex Distribution Setup Guide

## Current Status

✅ Updated package.json with repository info
✅ Created build directory structure  
✅ Created macOS entitlements file
⏳ Need to generate icon files
⏳ Need to configure notarization (optional)

## Step 1: Install Required Tools

You need `librsvg` to convert SVG to PNG. Install with Homebrew:

```bash
brew install librsvg
```

## Step 2: Generate Icon Files

Run the icon generation script:

```bash
cd /Users/jamescruce/Projects/jdex-complete-package/app
chmod +x build-icons.sh
./build-icons.sh
```

This will create:

- `build/icon.icns` (macOS)
- `build/icon.ico` (Windows)
- `build/icon.png` (Linux)

## Step 3: Test the Clean Build

Now try building again:

```bash
npm run electron:build
```

**Expected Results:**

- ✅ No "default Electron icon" warning
- ✅ No "Cannot detect repository" warnings
- ✅ No "Cannot read properties of null" errors
- ⚠️ Still shows "skipped macOS notarization" (this is OK for now)

## Step 4: Verify the Build

Check that your build outputs exist:

```bash
ls -lh dist-electron/
```

You should see:

- `JDex-2.0.0-arm64.dmg` - Disk image for distribution
- `JDex-2.0.0-arm64-mac.zip` - Zip archive for distribution

## Step 5: Test Installation

Double-click the DMG file and test installing JDex.

**What You'll See:**

- Custom JDex icon (teal gradient with "JD")
- macOS may warn "App from unidentified developer" (expected without notarization)
- To open: Right-click → Open (first time only)

---

## Optional: macOS Notarization

**Do you have an Apple Developer Account ($99/year)?**

### If YES - Let's Enable Notarization

1. **Find your Team ID:**

```bash
xcrun altool --list-providers -u "YOUR_APPLE_ID" -p "@keychain:AC_PASSWORD"
```

2. **Create App-Specific Password:**
   - Go to: https://appleid.apple.com
   - Sign In
   - Security → App-Specific Passwords
   - Generate new (save it!)

3. **Store credentials in Keychain:**

```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "your-apple-id@email.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

4. **Install notarization package:**

```bash
npm install --save-dev @electron/notarize
```

5. **Update package.json build section** - add after "entitlementsInherit":

```json
"afterSign": "scripts/notarize.js"
```

6. **Create notarization script** at `scripts/notarize.js`:

```javascript
import { notarize } from '@electron/notarize';
import { build } from '../package.json' assert { type: 'json' };

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    tool: 'notarytool',
    appPath: `${appOutDir}/${appName}.app`,
    keychainProfile: 'AC_PASSWORD',
  });
}
```

7. **Make script directory:**

```bash
mkdir scripts
# Then move the notarize.js content above into scripts/notarize.js
```

Now builds will be automatically notarized!

### If NO - Skip Notarization

That's perfectly fine! Your app works great without it. Users will just need to:

1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog

This is standard for indie Mac apps and only needs to be done once per user.

---

## Next Steps After Clean Build

1. **Test the app thoroughly**
2. **Update README.md** with:
   - What JDex does
   - Installation instructions
   - Screenshots
3. **Create a release on GitHub:**
   - Tag as v2.0.0
   - Upload the DMG and ZIP files
   - Write release notes
4. **Set up Gumroad:**
   - Upload the DMG file
   - Set price to $0 (free)
   - Write product description
   - Link to GitHub for source code

---

## Questions?

- **"The build worked but I see a generic icon in Finder"** - Clear icon cache:

  ```bash
  sudo rm -rf /Library/Caches/com.apple.iconservices.store
  killall Finder
  ```

- **"Notarization is taking forever"** - First notarization can take 5-15 minutes. Check status:

  ```bash
  xcrun notarytool log <submission-id> --keychain-profile AC_PASSWORD
  ```

- **"I want Windows/Linux builds"** - Run on those platforms or use CI/CD (GitHub Actions)

---

Ready to run `./build-icons.sh`?
