import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  nativeImage,
} from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DependencyManager } from "./deps";
import { AgentManager } from "./agentManager";
import type { ResearchRequest, Report } from "../shared/types";
import fixPath from "fix-path";
import { AlphaVantageService } from "../services/alphaVantageService";
import {
  hasAlphaVantageMcpServer,
  setAlphaVantageMcpServer,
} from "../utils/codexConfig";

// Fix PATH and set Codex binary location early
fixPath();
process.env.CODEX_BINARY = "/opt/homebrew/bin/codex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root - from dist-electron/main/ go up to root
const PROJECT_ROOT = join(__dirname, "..", "..");

// Set app name IMMEDIATELY for dock and menu (MUST be before app.whenReady)
app.name = "familyoffice";
console.log("🏷️  Setting app name to:", app.name);

let mainWindow: BrowserWindow | null = null;
const depManager = new DependencyManager();
const agentManager = new AgentManager(PROJECT_ROOT);

function createWindow() {
  // Set dock icon for macOS (must be done before creating window)
  if (process.platform === "darwin") {
    try {
      // Try PNG first, fallback to ICNS
      const iconPngPath = join(PROJECT_ROOT, "icon.png");
      const iconIcnsPath = join(PROJECT_ROOT, "icon.icns");

      let icon = nativeImage.createFromPath(iconPngPath);
      if (icon.isEmpty()) {
        icon = nativeImage.createFromPath(iconIcnsPath);
      }

      if (!icon.isEmpty()) {
        app.dock.setIcon(icon);
        console.log("✅ Dock icon set successfully");
      } else {
        console.log("❌ Icon file is empty or invalid");
      }
    } catch (error) {
      console.log("❌ Could not set dock icon:", error);
    }
  }

  const iconPath = join(PROJECT_ROOT, "icon.png");
  const windowIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    fullscreen: true,
    icon: windowIcon,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "default",
    title: "familyoffice",
  });

  // Handle external links - open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle navigation requests - intercept external links
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation to our own app (localhost or file://)
    if (
      parsedUrl.protocol === "file:" ||
      (parsedUrl.hostname === "localhost" && parsedUrl.port === "5173")
    ) {
      return;
    }

    // Prevent navigation and open external URLs in system browser
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Load Alpha Vantage API key on startup
  await loadAlphaVantageApiKey();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Alpha Vantage API Key Management

async function loadAlphaVantageApiKey(): Promise<void> {
  try {
    const settingsPath = join(app.getPath("userData"), "settings.json");
    const fs = await import("fs/promises");

    try {
      const data = await fs.readFile(settingsPath, "utf-8");
      const settings = JSON.parse(data);
      if (settings.alphaVantageApiKey) {
        AlphaVantageService.setApiKey(settings.alphaVantageApiKey);
        console.log("✅ Alpha Vantage API key loaded");

        // Check if MCP server is configured, if not, add it
        const hasMcpServer = await hasAlphaVantageMcpServer();
        if (!hasMcpServer) {
          console.log("ℹ️ Configuring Alpha Vantage MCP server in ~/.codex/config.toml");
          await setAlphaVantageMcpServer(settings.alphaVantageApiKey);
        } else {
          console.log("✅ Alpha Vantage MCP server already configured");
        }
      }
    } catch {
      // Settings file doesn't exist yet
      console.log("ℹ️ No Alpha Vantage API key found");
    }
  } catch (error) {
    console.error("Error loading Alpha Vantage API key:", error);
  }
}

async function saveAlphaVantageApiKey(apiKey: string): Promise<void> {
  try {
    const settingsPath = join(app.getPath("userData"), "settings.json");
    const fs = await import("fs/promises");

    let settings: any = {};
    try {
      const data = await fs.readFile(settingsPath, "utf-8");
      settings = JSON.parse(data);
    } catch {
      // File doesn't exist, start fresh
    }

    settings.alphaVantageApiKey = apiKey;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    AlphaVantageService.setApiKey(apiKey);
    console.log("✅ Alpha Vantage API key saved");

    // Also update the Codex config.toml
    await setAlphaVantageMcpServer(apiKey);
  } catch (error) {
    console.error("Error saving Alpha Vantage API key:", error);
    throw error;
  }
}

// IPC Handlers

ipcMain.handle("check-dependencies", async () => {
  return await depManager.checkAll();
});

ipcMain.handle("get-alphavantage-api-key", async () => {
  return AlphaVantageService.getApiKey();
});

ipcMain.handle("set-alphavantage-api-key", async (_event, apiKey: string) => {
  await saveAlphaVantageApiKey(apiKey);
  return true;
});

ipcMain.handle("has-alphavantage-api-key", async () => {
  return AlphaVantageService.hasApiKey();
});

ipcMain.handle("prompt-alphavantage-api-key", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Alpha Vantage API Key Required",
    message: "Please enter your Alpha Vantage API key",
    detail:
      "Get a free API key at: https://www.alphavantage.co/support/#api-key\n\nThe key will be stored securely on your computer.",
    buttons: ["Cancel", "Enter API Key"],
    defaultId: 1,
    cancelId: 0,
  });

  if (result.response === 1) {
    // Show input dialog
    await dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Enter API Key",
      message: "Paste your Alpha Vantage API key:",
      buttons: ["Cancel", "OK"],
      defaultId: 1,
      cancelId: 0,
    });

    // Note: Electron's dialog doesn't have text input
    // We'll need to handle this in the renderer
    return null;
  }

  return null;
});

ipcMain.handle("run-research", async (_event, request: ResearchRequest) => {
  const logs: string[] = [];

  try {
    agentManager.setOutputHandler((type, data) => {
      // Capture logs
      const logLines = data.split("\n").filter((line) => line.trim());
      logs.push(...logLines);
      // Also send to UI
      mainWindow?.webContents.send("docker-output", { type, data });
    });

    let result: {
      path: string;
      content: string;
      filename: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    if (request.reportPath) {
      // This is a reevaluation - note: reportPath may contain existing content in request
      result = await agentManager.runReevaluate(request, request.reportPath, request.reportContent);
    } else {
      // This is new research
      result = await agentManager.runResearch(request);
    }

    if (result.usage) {
      // Metadata will be saved in localStorage by the frontend
      console.log("✅ Metadata will be handled by frontend localStorage");
    }

    mainWindow?.webContents.send("process-complete", result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    mainWindow?.webContents.send("process-error", errorMsg);
    throw error;
  }
});

ipcMain.handle(
  "run-chat",
  async (
    _event,
    ticker: string,
    message: string,
    reportContent?: string,
    referenceReports?: Array<{ ticker: string; content: string }>,
  ) => {
    try {
      agentManager.setOutputHandler((type, data) => {
        mainWindow?.webContents.send("docker-output", { type, data });
      });

      const result = await agentManager.runChat(
        ticker,
        message,
        reportContent,
        (streamedText) => {
          // Send streaming text updates to the renderer
          mainWindow?.webContents.send("chat-stream", streamedText);
        },
        referenceReports,
      );

      mainWindow?.webContents.send("process-complete", result.response);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      mainWindow?.webContents.send("process-error", errorMsg);
      throw error;
    }
  },
);

ipcMain.handle(
  "update-report",
  async (_event, ticker: string, chatHistory?: any[]) => {
    const logs: string[] = [];

    console.log(
      `\n🔄 [IPC DEBUG] Received update-report request for ticker: ${ticker}`,
    );
    console.log(
      `📚 [IPC DEBUG] Chat history provided: ${chatHistory ? `${chatHistory.length} messages` : "none"}`,
    );

    try {
      console.log(`📡 [IPC DEBUG] Setting up output handler`);
      agentManager.setOutputHandler((type, data) => {
        console.log(`📊 [IPC DEBUG] Sending docker-output: ${type} - ${data}`);
        // Capture logs
        const logLines = data.split("\n").filter((line) => line.trim());
        logs.push(...logLines);
        // Also send to UI
        mainWindow?.webContents.send("docker-output", { type, data });
      });

      console.log(
        `📞 [IPC DEBUG] Calling agentManager.updateReport('${ticker}', chatHistory)`,
      );
      const result = await agentManager.updateReport(ticker, chatHistory);

      console.log(
        `✅ [IPC DEBUG] updateReport successful, result path: ${result.path}`,
      );

      if (result.usage) {
        // Metadata will be saved in localStorage by the frontend
        console.log("✅ Metadata will be handled by frontend localStorage");
      }

      console.log(`📡 [IPC DEBUG] Sending process-complete event`);
      mainWindow?.webContents.send("process-complete", result);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ [IPC DEBUG] updateReport failed:`, error);
      console.error(`❌ [IPC DEBUG] Error message: ${errorMsg}`);
      console.log(`📡 [IPC DEBUG] Sending process-error event`);
      mainWindow?.webContents.send("process-error", errorMsg);
      throw error;
    }
  },
);

// Reports are now stored in localStorage only, not on disk
ipcMain.handle("get-reports", async (): Promise<Report[]> => {
  console.log("📊 Reports are stored in localStorage (not disk)");
  return [];
});

ipcMain.handle("open-report", async (_event, path: string) => {
  await shell.openPath(path);
});

// Reports are managed in localStorage, no disk deletion needed
ipcMain.handle(
  "delete-report",
  async (): Promise<boolean> => {
    console.log("Report deletion handled in localStorage");
    return true;
  },
);

// Reports are stored in localStorage with content, no disk read needed
ipcMain.handle("read-report", async () => {
  console.log("Report content is stored in localStorage");
  return ""; // Content should come from localStorage
});

ipcMain.handle(
  "export-report",
  async (_event, reportPath: string, htmlContent: string) => {
    try {
      if (!mainWindow) return null;

      // Extract the report filename for default save name (change extension to PDF)
      const filename = (reportPath.split("/").pop() || "report.md").replace(
        ".md",
        ".pdf",
      );

      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export Report as PDF",
        defaultPath: filename,
        filters: [
          { name: "PDF files", extensions: ["pdf"] },
          { name: "All files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      // Create a hidden window to render the content
      const pdfWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load HTML content with proper styling
      await pdfWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
      );

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5,
        },
        pageSize: "Letter",
      });

      // Write PDF to file
      const { writeFile } = await import("fs/promises");
      await writeFile(result.filePath, pdfData);

      // Clean up
      pdfWindow.close();

      return result.filePath;
    } catch (error) {
      console.error("Error exporting report:", error);
      throw error;
    }
  },
);

// Metadata is stored in localStorage, not on disk
ipcMain.handle("save-metadata", async () => {
  console.log("Metadata is handled in localStorage");
  return true;
});

// Metadata is stored in localStorage, not on disk
ipcMain.handle("get-metadata", async () => {
  console.log("Metadata is handled in localStorage");
  return [];
});

// Metadata is stored in localStorage, not on disk
ipcMain.handle("clear-metadata", async () => {
  console.log("Metadata clearing is handled in localStorage");
  return true;
});
