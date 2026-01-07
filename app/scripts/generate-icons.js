/**
 * Cross-platform icon generator for JDex
 * Converts SVG source to platform-specific icon formats
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp png-to-ico --save-dev
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_SOURCE = path.join(__dirname, '../public/jdex-icon.svg');
const BUILD_DIR = path.join(__dirname, '../build');

async function generateIcons() {
  console.log('🎨 Generating JDex icons...\n');

  // Ensure build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Read SVG source
  const svgBuffer = fs.readFileSync(SVG_SOURCE);

  try {
    // Generate PNG at 512x512 (good for Linux and as source for ICO)
    console.log('📐 Generating icon.png (512x512)...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(BUILD_DIR, 'icon.png'));
    console.log('   ✅ icon.png created');

    // Generate multiple PNG sizes for Windows ICO
    console.log('\n🪟 Generating Windows ICO...');
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of icoSizes) {
      console.log(`   📐 Generating ${size}x${size}...`);
      const pngBuffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      pngBuffers.push(pngBuffer);
    }

    // Convert to ICO
    const icoBuffer = await pngToIco(pngBuffers);
    fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer);
    console.log('   ✅ icon.ico created');

    // Generate macOS iconset sizes (if on macOS, iconutil would be used separately)
    console.log('\n🍎 Generating macOS PNG sizes...');
    const macSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' },
    ];

    const iconsetDir = path.join(BUILD_DIR, 'icon.iconset');
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }

    for (const { size, name } of macSizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsetDir, name));
    }
    console.log('   ✅ macOS iconset PNGs created');
    console.log('   ℹ️  Run "iconutil -c icns build/icon.iconset -o build/icon.icns" on macOS to create .icns');

    console.log('\n✅ All icons generated successfully!');
    console.log('\nGenerated files:');
    console.log('   📁 build/icon.png (Linux)');
    console.log('   📁 build/icon.ico (Windows)');
    console.log('   📁 build/icon.iconset/ (macOS - needs iconutil)');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
