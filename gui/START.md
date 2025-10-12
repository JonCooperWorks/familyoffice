# Starting the Family Office Research GUI

## Quick Start

### Development Mode

```bash
cd gui
npm run dev
```

This will:
- Start Vite dev server for React
- Compile and watch Electron main process
- Launch the Electron app
- Enable hot reload for UI changes

### Production Build

```bash
cd gui
npm run dist
```

This will:
- Build the React app
- Compile the Electron main process
- Package everything into a .dmg installer
- Output to `gui/release/` directory

### Install the App

After running `npm run dist`:

1. Open `gui/release/`
2. Find the `.dmg` file
3. Double-click to mount
4. Drag "Family Office Research" to Applications
5. Launch from Applications or Spotlight

## First Time Setup

When you first launch the app, it will check for:

1. **Docker Desktop** - Must be installed and running
2. **Codex CLI** - Must be installed and authenticated
3. **npm packages** - Auto-installs if missing
4. **Docker image** - Auto-builds if missing

Follow the on-screen instructions to complete setup.

## Usage

### Research Tab
- Enter ticker symbol (e.g., AAPL)
- Optional: Enter company name
- Choose "New Research" or "Reevaluate Existing"
- Click "Generate Report"
- Wait for AI to complete analysis (2-5 minutes)
- Click "Open Report" when done

### Chat Tab
- Enter ticker symbol
- Optional: Load an existing report for context
- Start chatting about the stock
- Ask questions, get real-time answers

### Reports Tab
- View all generated reports
- Search by ticker or company name
- Open, reevaluate, or chat with any report
- Click "Refresh" to reload the list

## Troubleshooting

### App Won't Launch
- Ensure you're on macOS (app is Mac-only for now)
- Try: `npm run dev` for debug mode
- Check Console.app for crash logs

### Dependencies Not Found
- Click "Check Again" in the dependency checker
- Follow install instructions for Docker/Codex
- Restart the app after installing

### Build Errors
```bash
# Clean and rebuild
rm -rf dist dist-electron node_modules
npm install
npm run build
```

### Development Issues
```bash
# Kill any running processes
pkill -f "electron"
pkill -f "vite"

# Restart dev mode
npm run dev
```

## Project Structure

```
gui/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # App entry, IPC handlers
│   │   ├── deps.ts        # Dependency detection
│   │   ├── docker.ts      # Docker script execution
│   │   └── preload.ts     # Secure IPC bridge
│   ├── renderer/          # React UI (Browser)
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # UI components
│   │   └── main.tsx       # React entry point
│   └── shared/
│       └── types.ts       # Shared TypeScript types
├── dist/                  # Built React app
├── dist-electron/         # Compiled Electron main
├── release/               # Packaged installers
└── package.json
```

## Development Tips

- **Hot Reload**: Edit React components, see changes instantly
- **DevTools**: Press Cmd+Option+I to open Chrome DevTools
- **Logs**: Check terminal output for Electron main process logs
- **Docker Output**: Visible in the app's output panel

## Next Steps

See [USAGE.md](./USAGE.md) for detailed usage instructions.

