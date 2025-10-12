# Installation Guide

## For Your Wife (End User)

### Option 1: Run from Source (Easiest)

1. Open Terminal
2. Navigate to the project:
   ```bash
   cd /path/to/familyoffice/gui
   ```

3. Install dependencies (one time only):
   ```bash
   npm install
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

The app will launch automatically!

### Option 2: Build Installer (More Professional)

1. Open Terminal in the gui directory
2. Build the .dmg installer:
   ```bash
   npm run dist
   ```

3. Find the installer:
   - Look in `gui/release/` folder
   - Double-click `Family Office Research-1.0.0.dmg`
   - Drag app to Applications folder
   - Launch from Applications

## First Launch

When you first open the app, it will check for required software:

### 1. Docker Desktop
**What it is:** Software that runs containers for security  
**If missing:** App shows download link  
**Action:** Download from docker.com and install

### 2. Codex CLI  
**What it is:** OpenAI's command-line tool for AI  
**If missing:** App shows install commands  
**Action:** Run these in Terminal:
```bash
brew install codex
codex  # Then select "Sign in with ChatGPT"
```

### 3. Project Dependencies
**What it is:** Required JavaScript libraries  
**If missing:** App shows "Install Now" button  
**Action:** Click the button - it installs automatically!

### 4. Docker Image
**What it is:** The containerized research environment  
**If missing:** App shows "Build Now" button  
**Action:** Click the button - takes ~2 minutes to build

## After Setup

Once all dependencies show green checkmarks ✅, you're ready!

The app will remember everything is installed and won't check again unless something breaks.

## Troubleshooting

### "App can't be opened because it is from an unidentified developer"
**Fix:**
1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog
4. macOS will remember this choice

### "Docker is not running"
**Fix:**
1. Open Docker Desktop from Applications
2. Wait for it to start (whale icon in menu bar)
3. Return to the app and click "Check Again"

### "Codex not authenticated"
**Fix:**
1. Open Terminal
2. Run: `codex`
3. Select "Sign in with ChatGPT"
4. Complete the sign-in in your browser
5. Return to the app and click "Check Again"

### "npm install failed"
**Fix:**
1. Open Terminal in the gui directory:
   ```bash
   cd /path/to/familyoffice/gui
   ```
2. Manually install:
   ```bash
   npm install
   ```
3. Return to the app and click "Check Again"

### App crashes or won't start
**Fix:**
1. Check Console.app for error messages
2. Try running from Terminal:
   ```bash
   cd gui
   npm run dev
   ```
3. Check the terminal output for errors

## Getting Help

If you're stuck:
1. Check the error message in the app
2. Look at terminal output if running `npm run dev`
3. Check `../logs/` directory for detailed logs
4. Make sure Docker Desktop is actually running

## Updating the App

If there's a new version:

1. Pull latest code:
   ```bash
   cd /path/to/familyoffice
   git pull
   ```

2. Update GUI dependencies:
   ```bash
   cd gui
   npm install
   ```

3. Run or rebuild:
   ```bash
   npm run dev
   # or
   npm run dist
   ```

## Uninstalling

To remove the app:

1. Drag "Family Office Research" from Applications to Trash
2. Delete the source folder if desired
3. Optional: Uninstall dependencies if not used elsewhere:
   ```bash
   brew uninstall codex  # If not using Codex otherwise
   # Uninstall Docker Desktop via its app
   ```

## System Requirements

- **OS:** macOS 10.15 (Catalina) or later
- **RAM:** 8GB minimum, 16GB recommended
- **Disk:** 5GB free space (for Docker images)
- **Internet:** Required for AI API calls

## Privacy & Security

- All research runs in isolated Docker containers
- No data sent anywhere except OpenAI API
- Reports saved locally in `../reports/` directory
- Docker provides security sandbox
- No telemetry or tracking

---

**Questions?** Check README-GUI.md for more details.

