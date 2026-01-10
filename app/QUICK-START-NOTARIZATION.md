# JDex Notarization - Quick Start (You're Already Set Up!)

## ✅ You Already Have:

- ✅ Apple Developer Account
- ✅ Team ID: `Z4CHD4858S`
- ✅ Apple ID: `apple@jamescruce.me`
- ✅ Credentials stored in Keychain under `"notarytool-profile"`
- ✅ App-specific password (already used for previous app)

## ✅ What Claude Just Did:

- ✅ Updated `scripts/notarize.js` to use your existing `"notarytool-profile"`

---

## 🚀 Your Simplified Action Steps

### Step 1: Install Dependencies (1 minute)

```bash
cd /Users/jamescruce/Projects/jdex-complete-package/app
npm install
```

This installs `@electron/notarize` and updates all packages.

### Step 2: Generate Icons (1 minute)

```bash
# If you haven't installed librsvg yet
brew install librsvg

# Generate all icon formats
chmod +x build-icons.sh
./build-icons.sh
```

**Expected output:**

```
✅ All icon formats created successfully!
   📁 build/icon.icns (macOS)
   📁 build/icon.ico (Windows)
   📁 build/icon.png (Linux)
```

### Step 3: Build with Notarization (5-15 minutes)

```bash
npm run electron:build
```

**What happens:**

1. Vite builds frontend (~30 sec)
2. Electron-builder packages (~30 sec)
3. Code signing happens (~30 sec)
4. **Notarization starts** - You'll see:
   ```
   🔐 Notarizing JDex...
      App path: /Users/.../JDex.app
   ```
5. **Wait for Apple** (5-15 minutes on first notarization)
6. **Success:**
   ```
   ✅ Notarization complete!
   • building DMG...
   • building ZIP...
   ```

**☕ First notarization takes the longest.** Grab coffee!

### Step 4: Test the Notarized App (2 minutes)

```bash
open dist-electron/JDex-2.0.0-arm64.dmg
```

1. Drag JDex to Applications
2. **Double-click to open** (no right-click needed!)
3. Should open immediately without any warnings

**🎉 If it opens cleanly, you're done!**

---

## 🎯 That's It!

Since you already went through the credential setup for your previous app, you just needed:

- The notarize.js script configured (✅ done)
- The package.json updated (✅ done)
- Icons generated (⏳ step 2)
- One build command (⏳ step 3)

---

## 💡 For Future Apps

Your `"notarytool-profile"` works for:

- ✅ JDex (this app)
- ✅ Income Investor Suite (future)
- ✅ Any other ASTGL apps
- ✅ Forever (until you rotate the password)

Just copy the `scripts/notarize.js` file to other projects and it works automatically!

---

## 🐛 Quick Troubleshooting

### If notarization fails:

**Check credentials are still valid:**

```bash
xcrun notarytool history --keychain-profile "notarytool-profile"
```

This will either:

- ✅ Show your notarization history (credentials work!)
- ❌ Ask you to re-authenticate (credentials expired)

### If you need to update credentials:

```bash
xcrun notarytool store-credentials "notarytool-profile" \
  --apple-id apple@jamescruce.me \
  --team-id Z4CHD4858S \
  --password "your-app-specific-password"
```

---

## 📊 Expected Timeline

- **Step 1:** 1 minute (npm install)
- **Step 2:** 1 minute (icon generation)
- **Step 3:** 5-15 minutes (build + notarization)
- **Step 4:** 2 minutes (testing)

**Total:** ~20 minutes (mostly waiting for Apple)

---

## ✅ Ready?

Run these three commands:

```bash
npm install
./build-icons.sh
npm run electron:build
```

Then test the DMG!

---

🚀 You're basically already done - just need to execute!
