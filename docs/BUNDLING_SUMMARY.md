# Bundling Summary

This document describes the changes made to bundle the prompts and codex binary in the macOS executable.

## Changes Made

### 1. Prompts Bundling

**File:** `package.json`

Added the prompts directory to the electron-builder's `extraResources`:

```json
"extraResources": [
  {
    "from": "prompts",
    "to": "prompts",
    "filter": ["**/*.md"]
  }
]
```

**How it works:**
- During the build process, all `.md` files from the `prompts/` directory are copied to the app's `Resources/prompts/` folder
- The existing `PromptLoader` class already handles this by checking `app.isPackaged` and using `process.resourcesPath/prompts` in production

**Bundled prompts:**
- `prompt-chat-stock.md`
- `prompt-checker-pass.md`
- `prompt-reevaluate-stock.md`
- `prompt-research-stock.md`
- `prompt-update-report.md`

### 2. Codex Binary Bundling

**New File:** `src/utils/codexBinary.ts`

Created a utility function to dynamically determine the correct codex binary path:

```typescript
export function getCodexBinaryPath(): string {
  if (app.isPackaged) {
    // Production: use bundled binary from Resources/vendor/...
    return join(process.resourcesPath, "vendor", "aarch64-apple-darwin", "codex", "codex");
  }
  // Development: use system codex
  return "/opt/homebrew/bin/codex";
}
```

**Modified Files:**

1. `src/main/index.ts` - Updated to use `getCodexBinaryPath()`
2. `src/services/agentService.ts` - Updated to use `getCodexBinaryPath()`
3. `package.json` - Added vendor directory to `extraResources`:

```json
"extraResources": [
  {
    "from": "dist-electron/vendor",
    "to": "vendor",
    "filter": ["**/*"]
  }
]
```

**How it works:**
- The existing `copy-codex` build script copies the codex binary to `dist-electron/vendor/aarch64-apple-darwin/codex/codex`
- During packaging, electron-builder copies the entire `vendor` directory to `Resources/vendor/`
- At runtime, the app detects if it's packaged and uses the bundled binary or falls back to the system binary

## Build Process

The build process now includes:

1. **TypeScript compilation** (`npm run build:electron`)
   - Compiles all TypeScript files including the new `codexBinary.ts` utility

2. **Codex binary copy** (`npm run copy-codex`)
   - Copies `/opt/homebrew/bin/codex` to `dist-electron/vendor/aarch64-apple-darwin/codex/codex`
   - Sets executable permissions

3. **Vite build** (`vite build`)
   - Builds the React frontend

4. **Electron packaging** (when running `npm run dist`)
   - Packages everything into a `.app` bundle
   - Copies `extraResources` (prompts and vendor directory) to the app's Resources folder

## File Structure in Packaged App

```
familyoffice.app/
└── Contents/
    ├── MacOS/
    │   └── familyoffice (main executable)
    └── Resources/
        ├── prompts/
        │   ├── prompt-chat-stock.md
        │   ├── prompt-checker-pass.md
        │   ├── prompt-reevaluate-stock.md
        │   ├── prompt-research-stock.md
        │   └── prompt-update-report.md
        └── vendor/
            └── aarch64-apple-darwin/
                └── codex/
                    └── codex (25MB executable)
```

## Testing

### Development Mode

Run in development mode (should use system codex):

```bash
npm run start
```

Expected console output:
```
✅ Using system codex binary: /opt/homebrew/bin/codex
```

### Production Mode

Build and package the app:

```bash
npm run dist:mac
```

Open the packaged app from `release/mac-arm64/familyoffice.app`

Expected console output:
```
✅ Using bundled codex binary: /Applications/familyoffice.app/Contents/Resources/vendor/aarch64-apple-darwin/codex/codex
```

### Verify Resources

After building, verify the resources are included:

```bash
# Check prompts
ls -la release/mac-arm64/familyoffice.app/Contents/Resources/prompts/

# Check codex binary
ls -lh release/mac-arm64/familyoffice.app/Contents/Resources/vendor/aarch64-apple-darwin/codex/codex
```

## Benefits

1. **Self-contained application**: No external dependencies required (except initial codex authentication)
2. **Portable**: Can be distributed as a single `.dmg` or `.app` file
3. **Consistent behavior**: Uses the same codex binary across all installations
4. **Fallback support**: Gracefully falls back to system codex if bundled binary is missing

## Troubleshooting

### Issue: "spawn ENOTDIR" error

This error occurs when the codex binary path is incorrect. The fix implemented:
- Created `src/utils/codexBinary.ts` to detect if app is packaged without requiring `app.isReady()`
- Uses `process.resourcesPath` detection instead of `app.isPackaged` to avoid timing issues
- Logs the path being used for debugging

**Root Causes Fixed:**
1. **Hardcoded paths**: Replaced `/opt/homebrew/bin/codex` with dynamic path resolution
2. **App ready timing**: Used `process.resourcesPath` check instead of `app.isPackaged` to avoid "Cannot create BrowserWindow before app is ready" errors

### Issue: "Cannot create BrowserWindow before app is ready"

This error occurred when `getCodexBinaryPath()` tried to access `app.isPackaged` at module initialization time.

**Fix Applied:**
- Changed detection to use `process.resourcesPath.includes('.app/Contents/Resources')`
- This works at module load time without requiring the app to be ready

### Issue: Prompts not found

**Fix Applied:**
- Updated `BaseAgent` to accept optional `app` parameter
- Pass `app` to `PromptLoader` constructor
- All agent classes (ResearchAgent, ReevaluationAgent, ChatAgent, UpdateAgent, CheckerAgent) now pass `app` to `super()`

### Issue: Codex binary not executable

The `copy-codex` script sets executable permissions:
```bash
chmod +x dist-electron/vendor/aarch64-apple-darwin/codex/codex
```

If issues persist, verify permissions in the packaged app.

## Changes Summary

### Files Modified:

1. **`src/utils/codexBinary.ts`** (NEW)
   - Dynamically detects packaged vs development environment
   - Returns correct codex binary path
   - Uses `process.resourcesPath` check (safe at module load time)

2. **`src/main/index.ts`**
   - Import and use `getCodexBinaryPath()`
   - Set `process.env.CODEX_BINARY` dynamically

3. **`src/services/agentService.ts`**
   - Import and use `getCodexBinaryPath()`
   - Set `process.env.CODEX_BINARY` dynamically

4. **`src/agents/BaseAgent.ts`**
   - Accept optional `app: App` parameter
   - Pass `app` to `PromptLoader` constructor

5. **`package.json`**
   - Added `prompts/` to `extraResources`
   - Added `dist-electron/vendor/` to `extraResources`

### All Agent Classes Updated:
- ResearchAgent
- ReevaluationAgent  
- ChatAgent
- UpdateAgent
- CheckerAgent

All now properly pass the `app` parameter to BaseAgent constructor.

