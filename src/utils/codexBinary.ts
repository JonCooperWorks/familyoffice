import { join } from "path";
import { existsSync } from "fs";

/**
 * Get the correct path to the codex binary based on whether the app is packaged or not
 * This function can be called before app.whenReady() by using alternative detection methods
 */
export function getCodexBinaryPath(): string {
  console.log(`🔍 [DEBUG] process.resourcesPath: ${process.resourcesPath}`);
  
  // Check if we're in a packaged app by looking for process.resourcesPath
  // and checking if it points to an app bundle
  const isPackaged = process.resourcesPath && 
                     process.resourcesPath.includes('.app/Contents/Resources');
  
  console.log(`🔍 [DEBUG] isPackaged: ${isPackaged}`);
  
  if (isPackaged) {
    // In production: use the bundled codex binary from Resources
    const bundledCodexPath = join(
      process.resourcesPath,
      "vendor",
      "aarch64-apple-darwin",
      "codex",
      "codex"
    );
    
    console.log(`🔍 [DEBUG] Checking bundled codex at: ${bundledCodexPath}`);
    console.log(`🔍 [DEBUG] Binary exists: ${existsSync(bundledCodexPath)}`);
    
    // Verify the bundled binary exists
    if (existsSync(bundledCodexPath)) {
      console.log(`✅ Using bundled codex binary: ${bundledCodexPath}`);
      return bundledCodexPath;
    } else {
      console.warn(`⚠️ Bundled codex binary not found at: ${bundledCodexPath}`);
      console.warn(`⚠️ Falling back to system codex`);
    }
  }
  
  // In development or fallback: use system codex
  const systemCodexPath = "/opt/homebrew/bin/codex";
  console.log(`✅ Using system codex binary: ${systemCodexPath}`);
  return systemCodexPath;
}

