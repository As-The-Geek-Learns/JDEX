#!/bin/bash
# =============================================================================
# Create Public Version of JDex
# =============================================================================
# This script creates a stripped-down public version of JDex by removing
# all premium features. Run this from the jdex-premium root directory.
#
# Usage: ./scripts/create-public-version.sh /path/to/jdex-public
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide destination path${NC}"
    echo "Usage: ./scripts/create-public-version.sh /path/to/jdex-public"
    exit 1
fi

DEST_DIR="$1"
SOURCE_DIR="$(pwd)"

echo ""
echo "=============================================="
echo "  JDex Public Version Creator"
echo "=============================================="
echo ""
echo "Source (Premium): $SOURCE_DIR"
echo "Destination (Public): $DEST_DIR"
echo ""

# Confirm
read -p "This will create/overwrite the public version. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Create destination if needed
mkdir -p "$DEST_DIR"

echo ""
echo -e "${YELLOW}Step 1: Copying base files...${NC}"

# Copy everything except node_modules, dist, and git
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude 'dist-electron' \
    --exclude '.git' \
    --exclude 'build/*.icns' \
    --exclude 'build/*.ico' \
    --exclude 'SESSION-*.md' \
    --exclude 'REPO-SEPARATION-PLAN.md' \
    "$SOURCE_DIR/" "$DEST_DIR/"

echo ""
echo -e "${YELLOW}Step 2: Removing premium services...${NC}"

# Remove premium services
rm -rf "$DEST_DIR/app/src/services"
echo "  Removed: src/services/"

# Remove premium components
rm -rf "$DEST_DIR/app/src/components/FileOrganizer"
rm -rf "$DEST_DIR/app/src/components/Settings"
echo "  Removed: src/components/FileOrganizer/"
echo "  Removed: src/components/Settings/"

# Remove license context
rm -rf "$DEST_DIR/app/src/context"
echo "  Removed: src/context/"

# Remove notarize script (contains signing details)
rm -f "$DEST_DIR/app/scripts/notarize.js"
echo "  Removed: scripts/notarize.js"

echo ""
echo -e "${YELLOW}Step 3: Creating public App.jsx...${NC}"

# Create stripped App.jsx
cat > "$DEST_DIR/app/src/App.jsx" << 'APPEOF'
/**
 * JDex - Johnny Decimal Index Manager
 * ====================================
 * Free, open-source version
 * 
 * Premium features available at: https://jamescruce.gumroad.com/l/jdex-premium
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  initDatabase,
  saveDatabase,
  getAreas,
  getCategories,
  getFolders,
  getItems,
  createFolder,
  createItem,
  updateFolder,
  updateItem,
  deleteFolder,
  deleteItem,
  searchItems,
  getStorageLocations,
  createStorageLocation,
  exportDatabase,
  exportToJSON,
  importDatabase,
  getDashboardStats,
} from './db.js';

// =============================================================================
// Note: Premium features like File Organizer, Cloud Sync, and Watch Folders
// are available in JDex Premium: https://jamescruce.gumroad.com/l/jdex-premium
// =============================================================================

function App() {
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Initialize database
  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        loadData();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadData = useCallback(() => {
    setAreas(getAreas());
    setCategories(getCategories());
    setFolders(getFolders());
    setItems(getItems());
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchItems(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      saveDatabase();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-gray-400">Loading JDex v2.0...</p>
        </div>
      </div>
    );
  }

  // ... Rest of the App component
  // This is a placeholder - the full public App.jsx would need the complete
  // UI code minus the premium features (FileOrganizer, CloudDriveSettings, etc.)
  
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">JDex - Johnny Decimal Index</h1>
        <p className="text-gray-400 mb-8">
          This is the free, open-source version of JDex.
        </p>
        <div className="bg-slate-800 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">🚀 Want More Features?</h2>
          <ul className="text-left text-gray-300 space-y-2 mb-6">
            <li>✨ Smart File Organizer</li>
            <li>👁️ Watch Folders (auto-organize)</li>
            <li>☁️ Cloud Drive Integration</li>
            <li>🔧 Advanced Matching Rules</li>
            <li>📊 Batch Operations</li>
          </ul>
          <a 
            href="https://jamescruce.gumroad.com/l/jdex-premium"
            className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-700 rounded-lg font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get JDex Premium - $19
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
APPEOF

echo "  Created: stripped App.jsx"

echo ""
echo -e "${YELLOW}Step 4: Creating public db.js...${NC}"

# Note: We need to create a stripped db.js that only has core tables
# For now, we'll just note that this needs manual editing
echo "  ⚠️  NOTE: db.js needs manual editing to remove premium tables"
echo "  Remove migrations 2-7 and premium table definitions"

echo ""
echo -e "${YELLOW}Step 5: Updating package.json...${NC}"

# Update package.json to remove afterSign hook
cd "$DEST_DIR/app"
if command -v jq &> /dev/null; then
    jq 'del(.build.afterSign)' package.json > package.json.tmp && mv package.json.tmp package.json
    echo "  Removed afterSign hook from package.json"
else
    echo "  ⚠️  jq not installed - manually remove 'afterSign' from package.json"
fi

echo ""
echo -e "${YELLOW}Step 6: Creating public README...${NC}"

cat > "$DEST_DIR/README.md" << 'READMEEOF'
# JDex - Johnny Decimal Index Manager

A beautiful desktop application for managing your files using the [Johnny Decimal](https://johnnydecimal.com/) system.

## Features (Free Version)

- 📁 **4-Level Structure**: Areas → Categories → Folders → Items
- 🎨 **Beautiful UI**: Modern, dark-themed interface
- 💾 **Local Storage**: Your data stays on your device
- 📤 **Import/Export**: Backup and restore your index
- 🔍 **Search**: Find anything instantly

## Premium Features

Want more power? [JDex Premium](https://jamescruce.gumroad.com/l/jdex-premium) includes:

- 🗂️ **Smart File Organizer** - Scan and organize files with intelligent suggestions
- 👁️ **Watch Folders** - Automatically organize files as they arrive
- ☁️ **Cloud Drive Integration** - iCloud, Dropbox, OneDrive, Google Drive
- 🔧 **Advanced Rules** - Regex, keywords, path-based matching
- 📊 **Batch Operations** - Move hundreds of files at once

[Get JDex Premium - $19](https://jamescruce.gumroad.com/l/jdex-premium) (one-time purchase)

## Installation

### From Release

Download the latest release from the [Releases](https://github.com/yourusername/jdex/releases) page.

### From Source

```bash
cd app
npm install
npm run dev      # Development
npm run build    # Production build
```

## Tech Stack

- React + Vite
- Tailwind CSS
- sql.js (SQLite in browser)
- Electron (desktop)

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Made with ❤️ by [James Cruce](https://jamescruce.me)
READMEEOF

echo "  Created: README.md"

echo ""
echo -e "${YELLOW}Step 7: Setting up git...${NC}"

cd "$DEST_DIR"
if [ -d ".git" ]; then
    rm -rf .git
fi
git init
git add .
git commit -m "Initial commit - JDex public version"
echo "  Initialized git repository"

echo ""
echo "=============================================="
echo -e "${GREEN}  Public version created successfully!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. cd $DEST_DIR"
echo "  2. Manually edit app/src/db.js to remove premium tables"
echo "  3. Complete the App.jsx with full free UI (copy from premium, remove premium parts)"
echo "  4. Test: cd app && npm install && npm run dev"
echo "  5. Create GitHub repo and push"
echo ""
READMEEOF
