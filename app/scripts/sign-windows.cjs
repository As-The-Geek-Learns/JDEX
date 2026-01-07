/**
 * Custom Windows code signing script for electron-builder
 * Uses signtool directly with hardware token (EV certificate)
 */

exports.default = async function(configuration) {
  const { execSync } = require('child_process');
  const path = require('path');
  
  const signtool = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe';
  const timestampServer = 'http://ts.ssl.com';
  const certThumbprint = '57C7E5941CB3FBFB662D2CD28E035561CFE1EBFC';
  
  const filePath = configuration.path;
  
  // Skip if not an executable
  if (!filePath.endsWith('.exe') && !filePath.endsWith('.dll')) {
    return;
  }
  
  console.log(`  • signing        file=${path.basename(filePath)}`);
  
  try {
    const command = `"${signtool}" sign /sha1 ${certThumbprint} /tr ${timestampServer} /td sha256 /fd sha256 "${filePath}"`;
    execSync(command, { stdio: 'pipe' });
    console.log(`  • signed         file=${path.basename(filePath)}`);
  } catch (error) {
    console.error(`  ⨯ signing failed for ${path.basename(filePath)}`);
    console.error(error.message);
    throw error;
  }
};
