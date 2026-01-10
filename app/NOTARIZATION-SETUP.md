# JDex Notarization Setup - Complete Checklist

## ✅ What Claude Just Did

1. **Added @electron/notarize to package.json** (you still need to install it)
2. **Created scripts/notarize.js** - ES module format notarization script
3. **Updated package.json build config** with:
   - `"afterSign": "scripts/notarize.js"` - Runs notarization after signing
   - Added `scripts/**/*` to files list
   - Added @electron/notarize to devDependencies

## 🎯 Your Action Steps (In Order)

### Step 1: Install Dependencies (1 minute)

```bash
cd /Users/jamescruce/Projects/jdex-complete-package/app
npm install
```

This will install the `@electron/notarize` package.

### Step 2: Get Your Apple Team ID (2 minutes)

**Option A - From Apple Developer Website:**

1. Go to https://developer.apple.com/account
2. Sign in with your Apple ID
3. Click "Membership" in the sidebar
4. Copy your **Team ID** (10 characters, like `ABC1234DEF`)

**Option B - From Command Line:**

```bash
security find-identity -v -p codesigning
```

Look for a line like:

```
1) 4FFFC91C9E1777DDF33ACBE93C97168A96405A29 "Apple Development: Your Name (TEAMID)"
```

The TEAMID is in parentheses at the end.

**Save this Team ID** - you'll need it in Step 4!

### Step 3: Create App-Specific Password (3 minutes)

1. **Go to:** https://appleid.apple.com
2. **Sign in** with your Apple ID
3. **Navigate to:** Security → App-Specific Passwords
4. **Click:** Generate Password (or the + button)
5. **Name it:** `JDex Notarization`
6. **Copy the password** - Format: `xxxx-xxxx-xxxx-xxxx`

**⚠️ IMPORTANT:** This password only shows once! Save it somewhere safe (temporarily).

### Step 4: Store Credentials in Keychain (2 minutes)

Run this command, replacing the placeholders:

```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "YOUR_APPLE_ID@example.com" \
  --team-id "ABC1234DEF" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

**Replace:**

- `YOUR_APPLE_ID@example.com` → Your actual Apple ID email
- `ABC1234DEF` → Your Team ID from Step 2
- `xxxx-xxxx-xxxx-xxxx` → The app-specific password from Step 3

**Expected output:**

```
This process stores your credentials securely in the Keychain. You reference these credentials later using a profile name.

Validating your credentials...
Success. Credentials validated.
Credentials saved to Keychain.
To use them, specify `--keychain-profile "AC_PASSWORD"`
```

**✅ Credentials are now stored!** You won't need to enter them again.

### Step 5: Generate Icons (if not done yet) (1 minute)

If you haven't run this yet:

```bash
brew install librsvg  # If not already installed
chmod +x build-icons.sh
./build-icons.sh
```

### Step 6: Build with Notarization! (5-15 minutes)

```bash
npm run electron:build
```

**What to expect:**

1. **Vite builds** your frontend (30 seconds)
2. **Electron-builder packages** the app (30 seconds)
3. **Code signing** happens (30 seconds)
4. **Notarization starts** - YOU'LL SEE:
   ```
   🔐 Notarizing JDex...
      App path: /Users/.../JDex.app
   ```
5. **Wait for Apple** - This can take 5-15 minutes on first run
6. **Success message:**
   ```
   ✅ Notarization complete!
   • building        target=DMG arch=arm64 file=dist-electron/JDex-2.0.0-arm64.dmg
   • building        target=macOS zip arch=arm64 file=dist-electron/JDex-2.0.0-arm64-mac.zip
   ```

**☕ Grab coffee during notarization** - Apple's servers process this in real-time.

### Step 7: Test the Notarized App (2 minutes)

```bash
open dist-electron/JDex-2.0.0-arm64.dmg
```

1. **Drag JDex to Applications**
2. **Double-click to open** - NO RIGHT-CLICK NEEDED! 🎉
3. **It should open immediately** - No "unidentified developer" warning

**This is the magic moment!** Your app is now officially Apple-approved.

---

## 🎉 Expected Final Build Output

```
vite v5.4.21 building for production...
✓ 1251 modules transformed.
✓ built in 971ms

• electron-builder  version=24.13.3 os=25.2.0
• loaded configuration  file=package.json ("build" field)
• packaging       platform=darwin arch=arm64
• signing         file=dist-electron/mac-arm64/JDex.app
🔐 Notarizing JDex...
   App path: /Users/jamescruce/Projects/jdex-complete-package/app/dist-electron/mac-arm64/JDex.app
✅ Notarization complete!
• building        target=DMG arch=arm64 file=dist-electron/JDex-2.0.0-arm64.dmg
• building        target=macOS zip arch=arm64 file=dist-electron/JDex-2.0.0-arm64-mac.zip
```

**No warnings. No errors. Clean as a whistle.** 🧹

---

## 🐛 Troubleshooting

### Error: "Invalid credentials"

**Problem:** Apple ID, Team ID, or password is wrong

**Solution:**

```bash
# Delete the stored credentials
security delete-generic-password -s "AC_PASSWORD"

# Try storing them again with correct info
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "CORRECT_EMAIL@example.com" \
  --team-id "CORRECT_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

### Error: "Notarization failed"

**Problem:** App doesn't meet Apple's requirements

**Solution:**

```bash
# Check notarization log
xcrun notarytool log <submission-id> --keychain-profile AC_PASSWORD
```

Common issues:

- Missing entitlements (we already set these up)
- Unsigned libraries (shouldn't happen with Electron)
- Hardened runtime not enabled (we already enabled it)

### Notarization takes forever (>30 minutes)

**Problem:** Apple's servers might be slow

**Solution:**

- Check status: https://developer.apple.com/system-status/
- Wait it out, or cancel and retry later
- First notarization is always slowest

### "Cannot find module @electron/notarize"

**Problem:** Package not installed

**Solution:**

```bash
npm install --save-dev @electron/notarize
```

---

## 📊 Before vs After

### Before Notarization:

```
❌ User opens DMG
❌ Drags to Applications
❌ Double-clicks app
❌ Gets scary warning: "App from unidentified developer"
❌ Has to Google "how to open unidentified app mac"
❌ Right-clicks → Open
✅ Finally opens
```

### After Notarization:

```
✅ User opens DMG
✅ Drags to Applications
✅ Double-clicks app
✅ Opens immediately!
```

**User experience:** Seamless and professional. No friction.

---

## 💰 Cost Analysis

- **Apple Developer Account:** $99/year
- **Notarization:** Free (included in developer account)
- **Code signing:** Free (included in developer account)
- **Your time:** ~15 minutes setup, automatic after that

**Worth it for:**

- ✅ Free apps you want widely distributed
- ✅ Any paid apps
- ✅ Apps for clients
- ✅ Professional portfolio pieces

**Skip it for:**

- ❌ Personal-only tools
- ❌ Internal company tools
- ❌ Proof-of-concept projects

---

## 🔄 Future Builds

After this initial setup, every build is automatic:

```bash
npm run electron:build
# Coffee break ☕
# Done! Notarized app ready to distribute.
```

You never need to:

- Re-enter credentials
- Manually notarize
- Right-click to open
- Explain installation to users

---

## 🚀 What This Unlocks

With notarization complete, you can:

1. **Distribute on Gumroad** - Users get a clean install experience
2. **Share via GitHub Releases** - Professional quality
3. **Email to beta testers** - No installation friction
4. **Submit to app directories** - Many require notarization
5. **Build trust** - "Apple approved" gives confidence

---

## 📝 Next: Update Documentation

After successful notarization, update your README:

**Change this:**

> First launch: Right-click → Open (macOS security requirement)

**To this:**

> First launch: Double-click to open - fully notarized!

---

## ✅ Checklist Summary

- [ ] Step 1: Run `npm install`
- [ ] Step 2: Get your Apple Team ID
- [ ] Step 3: Create app-specific password
- [ ] Step 4: Store credentials in Keychain
- [ ] Step 5: Generate icons (if needed)
- [ ] Step 6: Run `npm run electron:build`
- [ ] Step 7: Test the notarized app

**Time estimate:** 15-20 minutes (including Apple's processing time)

---

Ready to run Step 1? 🚀

Type `npm install` in your terminal and let's do this!
