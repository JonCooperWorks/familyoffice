# Family Office Research - GUI Application

## Quick Start

The Family Office Research agent now has a beautiful desktop GUI!

### For End Users (Your Wife)

1. **Install the App**
   ```bash
   cd gui
   npm install
   npm run dist
   ```
   
2. **Open the installer**
   - Find the `.dmg` file in `gui/release/`
   - Double-click to mount
   - Drag "Family Office Research" to Applications
   
3. **Launch the app**
   - Open from Applications folder or Spotlight
   - The app will guide you through any missing dependencies

### For Developers

```bash
cd gui
npm install
npm run dev        # Development mode with hot reload
npm run build      # Build for production
npm run package    # Create unpacked app
npm run dist       # Create .dmg installer
```

## Features

✨ **Modern Desktop Interface**
- Clean, intuitive UI with Inter font
- Three main tabs: Research, Chat, and Reports
- Real-time progress indicators
- Dark mode compatible

🔍 **Research Tab**
- Generate comprehensive stock research reports
- Reevaluate existing reports with current data
- Live Docker output streaming
- One-click report opening

💬 **Chat Tab**
- Interactive AI conversations about stocks
- Load existing reports for context
- Message history with timestamps
- Clean chat interface

📊 **Reports Tab**
- Browse all generated reports
- Search and filter by ticker/company
- Quick actions: Open, Reevaluate, Chat
- Sorted by date (newest first)

🔧 **Smart Dependency Management**
- Auto-detects Docker Desktop
- Checks Codex CLI authentication
- Auto-installs npm packages
- Auto-builds Docker image
- Guided setup for missing dependencies

🔒 **Security**
- Maintains Docker isolation
- No changes to existing CLI
- Uses existing docker-compose.yml
- All operations sandboxed

## Architecture

```
gui/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # App entry, IPC, window management
│   │   ├── deps.ts        # Dependency detection & installation
│   │   ├── docker.ts      # Docker script execution wrapper
│   │   └── preload.ts     # Secure IPC bridge
│   ├── renderer/          # React UI (Browser)
│   │   ├── App.tsx        # Main app with tab navigation
│   │   ├── components/    # Research, Chat, Reports, DepsCheck
│   │   └── main.tsx       # React entry point
│   └── shared/
│       └── types.ts       # Shared TypeScript types
├── dist/                  # Built React app
├── dist-electron/         # Compiled Electron main
└── release/               # Packaged .dmg installers
```

## Integration with Existing Project

The GUI wraps the existing CLI - **no changes needed** to:
- `src/cli.ts` - CLI still works exactly the same
- `scripts/docker-*.sh` - Scripts called directly by GUI
- `src/services/agentService.ts` - Service layer unchanged
- `prompts/*.md` - Prompts still loaded from same location
- `docker-compose.yml` - Same Docker configuration

The GUI simply:
1. Calls `scripts/docker-run.sh` via Node.js `child_process`
2. Streams output to the UI in real-time
3. Reads reports from `./reports/` directory
4. Opens reports using macOS default app

## Tech Stack

- **Electron 28** - Desktop framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Lightning-fast builds
- **Inter Font** - Clean typography
- **electron-builder** - Packaging & distribution

## File Structure

```
familyoffice/
├── gui/                   # NEW: Desktop GUI
│   ├── src/
│   ├── dist/
│   ├── release/
│   └── package.json
├── src/                   # Existing CLI (unchanged)
├── scripts/               # Docker scripts (unchanged)
├── reports/               # Shared reports directory
└── docker-compose.yml     # Shared Docker config
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- macOS (for building .dmg)

### Running in Dev Mode
```bash
cd gui
npm run dev
```

Changes to React components hot-reload instantly.
Changes to Electron main process require restart.

### Building for Production
```bash
cd gui
npm run dist
```

Creates a signed, notarized .dmg (if certificates configured).

### Debugging
- **React DevTools**: Cmd+Option+I in the app
- **Console logs**: Check terminal output
- **Electron logs**: Check dist-electron/*.js
- **Docker output**: Visible in app UI

## Distribution

### For Your Wife's Computer

1. **Simple way**: Share the entire `gui/` folder
   ```bash
   cd gui
   npm install  # She runs this once
   npm run dev  # Then this to start
   ```

2. **Better way**: Build a .dmg
   ```bash
   cd gui
   npm run dist
   # Share the .dmg from gui/release/
   ```

3. **Best way**: Sign & notarize (requires Apple Developer account)
   - Get Apple Developer certificates
   - Update electron-builder config
   - App will install without security warnings

### Auto-Install Dependencies

The app checks for and helps install:
- ✅ Docker Desktop (with download link)
- ✅ Codex CLI (with install commands)
- ✅ npm packages (auto-installs)
- ✅ Docker image (auto-builds)

## Usage Examples

### Generate Research Report
1. Launch app
2. Click "Research" tab
3. Enter ticker (e.g., "AAPL")
4. Optional: Enter company name
5. Click "Generate Report"
6. Wait 2-5 minutes
7. Click "Open Report"

### Reevaluate Existing Report
1. Go to "Reports" tab
2. Find existing report
3. Click "Reevaluate"
4. Verify ticker/report path
5. Click "Generate Report"

### Chat About a Stock
1. Click "Chat" tab
2. Enter ticker
3. Optional: Load existing report
4. Click "Start Chat Session"
5. Type questions, get answers

### Browse Reports
1. Click "Reports" tab
2. See all reports sorted by date
3. Search by ticker or company
4. Click any report to Open/Reevaluate/Chat

## Troubleshooting

### App Won't Start
```bash
cd gui
rm -rf node_modules dist dist-electron
npm install
npm run dev
```

### Dependencies Not Found
- Install Docker Desktop from docker.com
- Install Codex: `brew install codex`
- Authenticate: Run `codex` and sign in
- Restart the app

### Build Errors
```bash
# Clean everything
cd gui
rm -rf node_modules dist dist-electron release
npm install
npm run build
```

### Docker Errors
- Ensure Docker Desktop is running
- Try rebuilding image in the app
- Check `../logs/` for error details

## Documentation

- `gui/START.md` - Quick start guide
- `gui/USAGE.md` - Detailed usage instructions
- `gui/README.md` - Technical documentation
- `../README.md` - Main project README

## Support

For issues:
1. Check Console.app for crash logs
2. Check terminal output for errors
3. Verify Docker is running
4. Verify Codex is authenticated

## Future Enhancements

Potential improvements:
- [ ] Windows & Linux support
- [ ] Code signing & notarization
- [ ] Auto-updater
- [ ] Dark mode toggle
- [ ] Export reports to PDF
- [ ] Batch processing UI
- [ ] Settings/preferences panel
- [ ] Keyboard shortcuts
- [ ] Report comparison view

## License

ISC

---

**Made with ❤️ for easy family office research**

