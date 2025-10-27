# Bundling Fixes - Complete Summary

## Issues Resolved

### 1. ❌ Error: "spawn ENOTDIR"
**Symptom:** Application crashed when trying to run research operations in packaged app.

**Root Cause:** The app was using a hardcoded path `/opt/homebrew/bin/codex` which doesn't exist inside a packaged `.app` bundle.

**Fix:**
- Created `src/utils/codexBinary.ts` to dynamically detect the correct codex binary path
- Updated both `src/main/index.ts` and `src/services/agentService.ts` to use this utility
- Bundled the codex binary in `Resources/vendor/aarch64-apple-darwin/codex/codex`

### 2. ❌ Error: "Cannot create BrowserWindow before app is ready"
**Symptom:** Application crashed on launch when trying to access `app.isPackaged` too early.

**Root Cause:** `getCodexBinaryPath()` was called at module initialization time, trying to access `app.isPackaged` before the Electron app was ready.

**Fix:**
- Changed detection method from `app.isPackaged` to checking `process.resourcesPath.includes('.app/Contents/Resources')`
- This check works at module load time without requiring the app to be ready

### 3. ❌ Prompts Not Found in Packaged App
**Symptom:** Application couldn't load prompt templates when running from packaged `.app`.

**Root Cause:** `BaseAgent` wasn't passing the `app` parameter to `PromptLoader`, so it couldn't determine the correct prompts path.

**Fix:**
- Updated `BaseAgent` constructor to accept optional `app: App` parameter
- Pass `app` to `PromptLoader` constructor
- All agent classes already pass `app` to `super()`, now it's properly used

## Files Changed

### New Files Created:

1. **`src/utils/codexBinary.ts`**
   ```typescript
   export function getCodexBinaryPath(): string {
     const isPackaged = process.resourcesPath && 
                       process.resourcesPath.includes('.app/Contents/Resources');
     
     if (isPackaged) {
       const bundledCodexPath = join(
         process.resourcesPath,
         "vendor",
         "aarch64-apple-darwin",
         "codex",
         "codex"
       );
       if (existsSync(bundledCodexPath)) {
         return bundledCodexPath;
       }
     }
     
     return "/opt/homebrew/bin/codex";
   }
   ```

### Modified Files:

1. **`src/main/index.ts`**
   - Added import: `import { getCodexBinaryPath } from "../utils/codexBinary"`
   - Changed: `process.env.CODEX_BINARY = getCodexBinaryPath()`

2. **`src/services/agentService.ts`**
   - Added import: `import { getCodexBinaryPath } from "../utils/codexBinary"`
   - Changed: `process.env.CODEX_BINARY = getCodexBinaryPath()`

3. **`src/agents/BaseAgent.ts`**
   - Added import: `import type { App } from "electron"`
   - Updated constructor: `constructor(config: AgentConfig = {}, app?: App)`
   - Pass app to PromptLoader: `this.promptLoader = new PromptLoader(app)`

4. **`package.json`**
   - Added `extraResources` configuration:
   ```json
   "extraResources": [
     {
       "from": "prompts",
       "to": "prompts",
       "filter": ["**/*.md"]
     },
     {
       "from": "dist-electron/vendor",
       "to": "vendor",
       "filter": ["**/*"]
     }
   ]
   ```

## Verification

After building with `npm run dist:mac`, the packaged app now contains:

```
familyoffice.app/
└── Contents/
    ├── MacOS/
    │   └── familyoffice
    └── Resources/
        ├── prompts/
        │   ├── prompt-chat-stock.md (3.9KB)
        │   ├── prompt-checker-pass.md (3.8KB)
        │   ├── prompt-reevaluate-stock.md (2.9KB)
        │   ├── prompt-research-stock.md (1.6KB)
        │   └── prompt-update-report.md (2.4KB)
        └── vendor/
            └── aarch64-apple-darwin/
                └── codex/
                    └── codex (25MB - Mach-O executable)
```

## Testing

### Development Mode:
```bash
npm run start
```
Expected output: `✅ Using system codex binary: /opt/homebrew/bin/codex`

### Production Mode:
```bash
npm run dist:mac
open release/mac-arm64/familyoffice.app
```
Expected output: `✅ Using bundled codex binary: /Applications/familyoffice.app/Contents/Resources/vendor/aarch64-apple-darwin/codex/codex`

## Build Commands

```bash
# Full build and package
npm run dist:mac

# Or step by step
npm run build          # Build TypeScript and React
npm run dist:mac       # Create .dmg and .app
```

## What's Included in the Package

1. **All prompt templates** - No external files needed
2. **Codex binary** - Self-contained, works offline (after authentication)
3. **Electron app** - Complete desktop application
4. **All dependencies** - Bundled in the app

## Benefits

✅ **Self-contained** - No external dependencies except initial codex auth  
✅ **Portable** - Single `.dmg` file can be distributed  
✅ **Consistent** - Same codex version across all installations  
✅ **Reliable** - No path issues or missing files  
✅ **Fallback support** - Uses system codex if bundled version fails  

## Distribution

The packaged app can be found at:
- **DMG**: `release/familyoffice-1.0.0-arm64.dmg`
- **App Bundle**: `release/mac-arm64/familyoffice.app`

Users can:
1. Download the `.dmg`
2. Drag to Applications folder
3. Open and use immediately (after codex authentication)

## Notes

- The app requires macOS 10.12+ (due to APFS requirement for arm64 DMG)
- Initial codex authentication still required (one-time setup)
- Codex binary is 25MB, adding to the total app size
- All prompts and code are bundled, no network requests for these resources

