import { notarize } from '@electron/notarize';

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`🔐 Notarizing ${appName}...`);
  console.log(`   App path: ${appPath}`);

  try {
    await notarize({
      tool: 'notarytool',
      appPath: appPath,
      // Use your existing notarytool profile
      keychainProfile: 'notarytool-profile',
    });

    console.log(`✅ Notarization complete!`);
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}
