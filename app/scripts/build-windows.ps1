<# 
.SYNOPSIS
    Build script for JDex Windows application

.DESCRIPTION
    This script handles the complete Windows build process:
    1. Verifies Node.js is installed
    2. Installs dependencies (including icon generation tools)
    3. Generates Windows icons from SVG source
    4. Builds the Electron application for Windows

.NOTES
    Run from the app directory: .\scripts\build-windows.ps1
#>

param(
    [switch]$SkipIconGeneration,
    [switch]$DevMode
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  JDex Windows Build Script v1.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory and set working directory to app folder
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Split-Path -Parent $ScriptDir
Set-Location $AppDir

Write-Host "📁 Working directory: $AppDir" -ForegroundColor Gray
Write-Host ""

# Step 1: Check for Node.js
Write-Host "🔍 Checking for Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   Or use: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check for npm
Write-Host "🔍 Checking for npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes on first run..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# Install icon generation dependencies
Write-Host ""
Write-Host "📦 Installing icon generation tools..." -ForegroundColor Yellow
npm install sharp png-to-ico --save-dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to install icon tools!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Icon tools installed" -ForegroundColor Green

Write-Host ""

# Step 4: Generate icons (unless skipped)
if (-not $SkipIconGeneration) {
    Write-Host "🎨 Generating Windows icons..." -ForegroundColor Yellow
    node scripts/generate-icons.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Icon generation failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⏭️  Skipping icon generation (using existing icons)" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Build the app
if ($DevMode) {
    Write-Host "🚀 Starting development mode..." -ForegroundColor Yellow
    npm run electron:dev
} else {
    Write-Host "🔨 Building Windows application..." -ForegroundColor Yellow
    Write-Host "   Building Vite frontend..." -ForegroundColor Gray
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Vite build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   Packaging Electron app..." -ForegroundColor Gray
    npx electron-builder --win
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Electron build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Build Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Output location: $AppDir\dist-electron\" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Generated installers:" -ForegroundColor Yellow
    
    # List generated files
    $distDir = Join-Path $AppDir "dist-electron"
    if (Test-Path $distDir) {
        Get-ChildItem $distDir -File | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "   📦 $($_.Name) ($size MB)" -ForegroundColor White
        }
    }
}

Write-Host ""
