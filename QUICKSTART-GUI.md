# 🚀 Quick Start - Desktop GUI

Your Family Office Research agent now has a beautiful desktop interface!

## Start the GUI in 30 Seconds

```bash
cd gui
npm install    # First time only
npm run dev    # Launches the app
```

That's it! The app will open automatically.

## What You'll See

### First Launch: Setup Wizard
The app checks for required software:
- ✅ Docker Desktop → Install from docker.com if needed
- ✅ Codex CLI → Run `brew install codex` if needed
- ✅ npm packages → Click "Install Now" (auto-installs)
- ✅ Docker image → Click "Build Now" (takes ~2 min)

### After Setup: Three Tabs

**📊 Research Tab**
- Enter ticker (e.g., "AAPL")
- Click "Generate Report"
- Wait 2-5 minutes
- Click "Open Report"

**💬 Chat Tab**
- Enter ticker
- Start chatting about the stock
- Ask questions, get answers

**📁 Reports Tab**
- See all generated reports
- Search by ticker/company
- Open, reevaluate, or chat

## For Your Wife

### Option 1: Share the Folder
1. Copy the entire `familyoffice` folder to her computer
2. Have her open Terminal in the `gui/` directory
3. Run: `npm install` (one time)
4. Run: `npm run dev` (every time she wants to use it)

### Option 2: Build an Installer
1. In the `gui/` directory, run: `npm run dist`
2. Share the `.dmg` file from `gui/release/`
3. She double-clicks it
4. Drags app to Applications
5. Launches like any Mac app

## Troubleshooting

### "Command not found: npm"
Install Node.js from nodejs.org

### "Docker not running"
1. Open Docker Desktop
2. Wait for it to start
3. Click "Check Again" in the app

### "Codex not authenticated"
```bash
codex
# Select "Sign in with ChatGPT"
```

## Documentation

- `gui/START.md` - Detailed start guide
- `gui/USAGE.md` - How to use each feature
- `gui/INSTALL.md` - Installation guide
- `README-GUI.md` - Complete overview
- `gui-summary.md` - Implementation details

## CLI Still Works!

The original command-line interface is unchanged:
```bash
./scripts/docker-run.sh research AAPL
./scripts/docker-run.sh chat TSLA
```

Choose whichever interface you prefer!

---

**Questions?** Check the documentation files listed above.  
**Ready?** Run `cd gui && npm run dev` to start!

