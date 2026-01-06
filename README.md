# JDex - Johnny Decimal Index Manager

<div align="center">
  <img src="public/jdex-icon.svg" alt="JDex Logo" width="128" height="128">
  
  **Personal Knowledge Organization Made Simple**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com/Jmeg8r/JDEX/releases)
  [![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/Jmeg8r/JDEX)
</div>

---

## What is JDex?

JDex is a desktop application that helps you organize your digital life using the [Johnny Decimal System](https://johnnydecimal.com/) - a simple yet powerful framework for structuring files, projects, and knowledge.

### The Johnny Decimal System in 30 Seconds

Instead of deeply nested folders like `Documents/Work/Projects/2024/Q1/ClientA/Reports/Draft/v3.docx`, you organize everything with a simple numbering system:

```
10-19 Administration
  11 Finance
    11.01 Invoices
    11.02 Expenses
  12 HR
    12.01 Policies
    12.02 Benefits

20-29 Projects
  21 Website Redesign
    21.01 Mockups
    21.02 Content
  22 Product Launch
    22.01 Marketing
    22.02 PR Materials
```

Every item has a unique identifier. Need that invoice? It's in `11.01`. Need the website mockups? `21.01`. Simple, memorable, searchable.

---

## Features

- 🗂️ **Visual Index Management** - Browse and manage your Johnny Decimal categories with a clean, modern interface
- 🔍 **Instant Search** - Find any item by number or title in milliseconds
- 📊 **SQLite Backend** - Your index is stored in a portable, reliable database
- 🎨 **Clean UI** - Built with React and Tailwind CSS for a beautiful experience
- 💾 **Local-First** - Your data stays on your machine, no cloud required
- 🔄 **Import/Export** - Backup and share your organizational structure
- 🚀 **Cross-Platform** - Runs on macOS, Windows, and Linux

---

## Installation

### macOS

1. Download the latest `.dmg` file from [Releases](https://github.com/Jmeg8r/JDEX/releases)
2. Open the DMG and drag JDex to Applications
3. First launch: Right-click → Open (macOS security requirement for unsigned apps)
4. Subsequent launches: Just double-click

### Windows (Coming Soon)

Windows builds are in development. Follow this repo for updates!

### Linux (Coming Soon)

Linux builds (AppImage, .deb) are in development. Follow this repo for updates!

---

## Quick Start

1. **Launch JDex** - Open the application
2. **Create Your First Area** - Areas are the top-level (10-19, 20-29, etc.)
3. **Add Categories** - Break down each area into categories
4. **Add Items** - Create specific items within categories
5. **Search & Browse** - Use search or browse your organized index

### Example Structure

```
10-19 Personal Life
  11 Health & Fitness
    11.01 Medical Records
    11.02 Workout Plans
    11.03 Meal Prep Ideas
  12 Finances
    12.01 Budget Spreadsheets
    12.02 Tax Documents
    12.03 Investment Tracking

20-29 Home Projects
  21 Kitchen Renovation
    21.01 Design Inspiration
    21.02 Contractor Quotes
    21.03 Purchase Receipts
```

---

## Building from Source

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Jmeg8r/JDEX.git
cd JDEX

# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Building Distributables

```bash
# Build for your current platform
npm run electron:build

# Output will be in dist-electron/
```

For detailed build instructions, see [DISTRIBUTION-SETUP.md](DISTRIBUTION-SETUP.md)

---

## Technology Stack

- **Frontend:** React 18, Tailwind CSS
- **Desktop Framework:** Electron 28
- **Database:** SQLite (via sql.js)
- **Build System:** Vite, electron-builder
- **Icons:** Lucide React

---

## Project Structure

```
jdex/
├── public/           # Static assets
├── src/              # React application source
│   ├── components/   # React components
│   ├── services/     # Database and business logic
│   └── utils/        # Helper functions
├── electron/         # Electron main process
├── build/            # Build resources (icons, entitlements)
└── dist-electron/    # Build output
```

---

## Roadmap

- [x] Core Johnny Decimal index management
- [x] SQLite database backend
- [x] Search functionality
- [x] macOS distribution
- [ ] Windows distribution
- [ ] Linux distribution
- [ ] File system integration (create/manage actual folders)
- [ ] Cloud sync options
- [ ] Mobile companion app
- [ ] Advanced reporting and analytics
- [ ] Import from existing folder structures

---

## Philosophy

JDex follows the Johnny Decimal philosophy of **"A place for everything, and everything in its place."**

The tool is designed to:
- **Stay out of your way** - Quick to learn, fast to use
- **Respect your data** - Local-first, SQLite-based, easily exportable
- **Be maintainable** - Clean code, well-documented, easy to extend
- **Remain free** - MIT licensed, available to everyone

---

## About the Author

Built by [James Cruce](https://astgl.com), a systems engineer with 25+ years of enterprise IT experience. JDex emerged from a personal need to organize thousands of technical notes, scripts, and project files using a consistent, scalable system.

More projects and technical writing at [As The Geek Learns](https://astgl.com).

---

## Contributing

Contributions welcome! Whether it's:
- 🐛 Bug reports
- 💡 Feature suggestions  
- 📝 Documentation improvements
- 🔧 Code contributions

Please open an issue first to discuss major changes.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Johnny.Decimal](https://johnnydecimal.com/) - The organizational system that inspired this tool
- [Electron](https://www.electronjs.org/) - For making cross-platform desktop apps accessible
- The open-source community for the amazing tools that make projects like this possible

---

## Support

- 📧 Email: james@astgl.com
- 🐛 Issues: [GitHub Issues](https://github.com/Jmeg8r/JDEX/issues)
- 📚 Docs: [Wiki](https://github.com/Jmeg8r/JDEX/wiki) (coming soon)
- 💬 Discussions: [GitHub Discussions](https://github.com/Jmeg8r/JDEX/discussions)

---

<div align="center">
  Made with ☕ by James Cruce
  
  [Download](https://github.com/Jmeg8r/JDEX/releases) • [Documentation](https://github.com/Jmeg8r/JDEX/wiki) • [Report Bug](https://github.com/Jmeg8r/JDEX/issues)
</div>
