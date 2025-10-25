import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, stat } from 'fs/promises';
import { DependencyManager } from './deps';
import { AgentManager } from './agentManager';
import type { ResearchRequest, Report } from '../shared/types';
import fixPath from 'fix-path';
import { AlphaVantageService } from '../services/alphaVantageService';

// Fix PATH and set Codex binary location early
fixPath();
process.env.CODEX_BINARY = '/opt/homebrew/bin/codex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root - from dist-electron/main/ go up to root
const PROJECT_ROOT = join(__dirname, '..', '..');

// Set app name IMMEDIATELY for dock and menu (MUST be before app.whenReady)
app.name = 'familyoffice';
console.log('🏷️  Setting app name to:', app.name);

let mainWindow: BrowserWindow | null = null;
const depManager = new DependencyManager();
const agentManager = new AgentManager(PROJECT_ROOT);

function createWindow() {
  // Set dock icon for macOS (must be done before creating window)
  if (process.platform === 'darwin') {
    try {
      // Try PNG first, fallback to ICNS
      const iconPngPath = join(PROJECT_ROOT, 'icon.png');
      const iconIcnsPath = join(PROJECT_ROOT, 'icon.icns');
      
      let icon = nativeImage.createFromPath(iconPngPath);
      if (icon.isEmpty()) {
        icon = nativeImage.createFromPath(iconIcnsPath);
      }
      
      if (!icon.isEmpty()) {
        app.dock.setIcon(icon);
        console.log('✅ Dock icon set successfully');
      } else {
        console.log('❌ Icon file is empty or invalid');
      }
    } catch (error) {
      console.log('❌ Could not set dock icon:', error);
    }
  }

  const iconPath = join(PROJECT_ROOT, 'icon.png');
  const windowIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    fullscreen: true,
    icon: windowIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    title: 'familyoffice'
  });

  // Handle external links - open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation requests - intercept external links
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow navigation to our own app (localhost or file://)
    if (parsedUrl.protocol === 'file:' || 
        (parsedUrl.hostname === 'localhost' && parsedUrl.port === '5173')) {
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
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Load Alpha Vantage API key on startup
  await loadAlphaVantageApiKey();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Alpha Vantage API Key Management

async function loadAlphaVantageApiKey(): Promise<void> {
  try {
    const settingsPath = join(app.getPath('userData'), 'settings.json');
    const fs = await import('fs/promises');
    
    try {
      const data = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(data);
      if (settings.alphaVantageApiKey) {
        AlphaVantageService.setApiKey(settings.alphaVantageApiKey);
        console.log('✅ Alpha Vantage API key loaded');
      }
    } catch {
      // Settings file doesn't exist yet
      console.log('ℹ️ No Alpha Vantage API key found');
    }
  } catch (error) {
    console.error('Error loading Alpha Vantage API key:', error);
  }
}

async function saveAlphaVantageApiKey(apiKey: string): Promise<void> {
  try {
    const settingsPath = join(app.getPath('userData'), 'settings.json');
    const fs = await import('fs/promises');
    
    let settings: any = {};
    try {
      const data = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(data);
    } catch {
      // File doesn't exist, start fresh
    }
    
    settings.alphaVantageApiKey = apiKey;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    AlphaVantageService.setApiKey(apiKey);
    console.log('✅ Alpha Vantage API key saved');
  } catch (error) {
    console.error('Error saving Alpha Vantage API key:', error);
    throw error;
  }
}

// IPC Handlers

ipcMain.handle('check-dependencies', async () => {
  return await depManager.checkAll();
});

ipcMain.handle('get-alphavantage-api-key', async () => {
  return AlphaVantageService.getApiKey();
});

ipcMain.handle('set-alphavantage-api-key', async (_event, apiKey: string) => {
  await saveAlphaVantageApiKey(apiKey);
  return true;
});

ipcMain.handle('has-alphavantage-api-key', async () => {
  return AlphaVantageService.hasApiKey();
});

ipcMain.handle('prompt-alphavantage-api-key', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Alpha Vantage API Key Required',
    message: 'Please enter your Alpha Vantage API key',
    detail: 'Get a free API key at: https://www.alphavantage.co/support/#api-key\n\nThe key will be stored securely on your computer.',
    buttons: ['Cancel', 'Enter API Key'],
    defaultId: 1,
    cancelId: 0
  });
  
  if (result.response === 1) {
    // Show input dialog
    await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Enter API Key',
      message: 'Paste your Alpha Vantage API key:',
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0
    });
    
    // Note: Electron's dialog doesn't have text input
    // We'll need to handle this in the renderer
    return null;
  }
  
  return null;
});



ipcMain.handle('run-research', async (_event, request: ResearchRequest) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const logs: string[] = [];
  
  try {
    agentManager.setOutputHandler((type, data) => {
      // Capture logs
      const logLines = data.split('\n').filter(line => line.trim());
      logs.push(...logLines);
      // Also send to UI
      mainWindow?.webContents.send('docker-output', { type, data });
    });
    
    let result: { path: string; usage?: { input_tokens: number; output_tokens: number } };
    
    if (request.reportPath) {
      // This is a reevaluation
      result = await agentManager.runReevaluate(request, request.reportPath);
    } else {
      // This is new research
      result = await agentManager.runResearch(request);
    }
    
    // Calculate cost and duration
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result.usage) {
      // Claude 3.5 Sonnet pricing
      const INPUT_COST_PER_MILLION = 3.00;
      const OUTPUT_COST_PER_MILLION = 15.00;
      
      const input_cost = (result.usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
      const output_cost = (result.usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
      const total_cost = input_cost + output_cost;
      
      // Save metadata
      const metadata = {
        id: `${request.ticker}-${timestamp}`,
        ticker: request.ticker,
        type: request.reportPath ? 'reevaluate' : 'research',
        timestamp,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        usage: {
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
          total_tokens: result.usage.input_tokens + result.usage.output_tokens
        },
        cost: {
          input_cost,
          output_cost,
          total_cost
        },
        logs: logs,
        reportPath: result.path
      };
      
      // Save to metadata storage
      try {
        const metadataDir = join(app.getPath('userData'), 'metadata');
        const { mkdir, readFile: fsReadFile, writeFile: fsWriteFile } = await import('fs/promises');
        
        await mkdir(metadataDir, { recursive: true });
        const metadataPath = join(metadataDir, 'research-metadata.json');
        
        let existingData: any[] = [];
        try {
          const data = await fsReadFile(metadataPath, 'utf-8');
          existingData = JSON.parse(data);
        } catch {
          // File doesn't exist, start with empty array
        }
        
        existingData.push(metadata);
        await fsWriteFile(metadataPath, JSON.stringify(existingData, null, 2));
        console.log('✅ Metadata saved successfully');
      } catch (error) {
        console.error('❌ Failed to save metadata:', error);
      }
    }
    
    mainWindow?.webContents.send('process-complete', result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    mainWindow?.webContents.send('process-error', errorMsg);
    throw error;
  }
});

ipcMain.handle('run-chat', async (_event, ticker: string, message: string, reportPath?: string, referenceReports?: Array<{ticker: string, content: string}>) => {
  try {
    agentManager.setOutputHandler((type, data) => {
      mainWindow?.webContents.send('docker-output', { type, data });
    });
    
    const result = await agentManager.runChat(
      ticker, 
      message, 
      reportPath,
      (streamedText) => {
        // Send streaming text updates to the renderer
        mainWindow?.webContents.send('chat-stream', streamedText);
      },
      referenceReports
    );
    
    mainWindow?.webContents.send('process-complete', result.response);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    mainWindow?.webContents.send('process-error', errorMsg);
    throw error;
  }
});

ipcMain.handle('update-report', async (_event, ticker: string, chatHistory?: any[]) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const logs: string[] = [];
  
  console.log(`\n🔄 [IPC DEBUG] Received update-report request for ticker: ${ticker}`);
  console.log(`📚 [IPC DEBUG] Chat history provided: ${chatHistory ? `${chatHistory.length} messages` : 'none'}`);
  
  try {
    console.log(`📡 [IPC DEBUG] Setting up output handler`);
    agentManager.setOutputHandler((type, data) => {
      console.log(`📊 [IPC DEBUG] Sending docker-output: ${type} - ${data}`);
      // Capture logs
      const logLines = data.split('\n').filter(line => line.trim());
      logs.push(...logLines);
      // Also send to UI
      mainWindow?.webContents.send('docker-output', { type, data });
    });
    
    console.log(`📞 [IPC DEBUG] Calling agentManager.updateReport('${ticker}', chatHistory)`);
    const result = await agentManager.updateReport(ticker, chatHistory);
    
    console.log(`✅ [IPC DEBUG] updateReport successful, result path: ${result.path}`);
    
    // Calculate cost and duration
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result.usage) {
      // Claude 3.5 Sonnet pricing
      const INPUT_COST_PER_MILLION = 3.00;
      const OUTPUT_COST_PER_MILLION = 15.00;
      
      const input_cost = (result.usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
      const output_cost = (result.usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
      const total_cost = input_cost + output_cost;
      
      // Save metadata
      const metadata = {
        id: `${ticker}-${timestamp}`,
        ticker: ticker,
        type: 'update',
        timestamp,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        usage: {
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
          total_tokens: result.usage.input_tokens + result.usage.output_tokens
        },
        cost: {
          input_cost,
          output_cost,
          total_cost
        },
        logs: logs,
        reportPath: result.path
      };
      
      // Save to metadata storage
      try {
        const metadataDir = join(app.getPath('userData'), 'metadata');
        const { mkdir, readFile: fsReadFile, writeFile: fsWriteFile } = await import('fs/promises');
        
        await mkdir(metadataDir, { recursive: true });
        const metadataPath = join(metadataDir, 'research-metadata.json');
        
        let existingData: any[] = [];
        try {
          const data = await fsReadFile(metadataPath, 'utf-8');
          existingData = JSON.parse(data);
        } catch {
          // File doesn't exist, start with empty array
        }
        
        existingData.push(metadata);
        await fsWriteFile(metadataPath, JSON.stringify(existingData, null, 2));
        console.log('✅ Metadata saved successfully');
      } catch (error) {
        console.error('❌ Failed to save metadata:', error);
      }
    }
    
    console.log(`📡 [IPC DEBUG] Sending process-complete event`);
    mainWindow?.webContents.send('process-complete', result);
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [IPC DEBUG] updateReport failed:`, error);
    console.error(`❌ [IPC DEBUG] Error message: ${errorMsg}`);
    console.log(`📡 [IPC DEBUG] Sending process-error event`);
    mainWindow?.webContents.send('process-error', errorMsg);
    throw error;
  }
});

ipcMain.handle('get-reports', async (): Promise<Report[]> => {
  const reportsDir = join(PROJECT_ROOT, 'reports');
  
  try {
    const files = await readdir(reportsDir);
    const reports: Report[] = [];
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = join(reportsDir, file);
      const stats = await stat(filePath);
      
      // Parse filename: research-AAPL-2025-10-11T14-30-00.md
      const match = file.match(/^research-([A-Z]+)-(.+)\.md$/);
      if (!match) continue;
      
      const ticker = match[1];
      
      // Try to extract company name from file content
      let company: string | undefined;
      try {
        const content = await readFile(filePath, 'utf-8');
        const companyMatch = content.match(/\*\*Company:\*\*\s*(.+)/);
        if (companyMatch) {
          company = companyMatch[1].trim();
        }
      } catch {
        // Ignore errors reading file content
      }
      
      reports.push({
        filename: file,
        path: filePath,
        ticker,
        company,
        date: stats.mtime,
        type: file.includes('reevaluation') ? 'reevaluation' : 'research'
      });
    }
    
    // Sort by date, most recent first
    reports.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return reports;
  } catch (error) {
    console.error('Error reading reports:', error);
    return [];
  }
});

ipcMain.handle('open-report', async (_event, path: string) => {
  await shell.openPath(path);
});

ipcMain.handle('delete-report', async (_event, reportPath: string): Promise<boolean> => {
  try {
    const fs = await import('fs/promises');
    
    // Check if file exists
    try {
      await fs.access(reportPath);
    } catch {
      console.log('Report file does not exist:', reportPath);
      return true; // File doesn't exist, consider it "deleted"
    }
    
    // Delete the file
    await fs.unlink(reportPath);
    console.log('Successfully deleted report:', reportPath);
    
    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
});

ipcMain.handle('read-report', async (_event, path: string) => {
  try {
    const content = await readFile(path, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading report:', error);
    throw error;
  }
});

ipcMain.handle('export-report', async (_event, reportPath: string, htmlContent: string) => {
  try {
    if (!mainWindow) return null;
    
    // Extract the report filename for default save name (change extension to PDF)
    const filename = (reportPath.split('/').pop() || 'report.md').replace('.md', '.pdf');
    
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Report as PDF',
      defaultPath: filename,
      filters: [
        { name: 'PDF files', extensions: ['pdf'] },
        { name: 'All files', extensions: ['*'] }
      ]
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
        contextIsolation: true
      }
    });
    
    // Load HTML content with proper styling
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate PDF
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      },
      pageSize: 'Letter'
    });
    
    // Write PDF to file
    const { writeFile } = await import('fs/promises');
    await writeFile(result.filePath, pdfData);
    
    // Clean up
    pdfWindow.close();
    
    return result.filePath;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
});

// Metadata storage handler
ipcMain.handle('save-metadata', async (_event, metadata: any) => {
  try {
    // Store metadata in userData directory
    const metadataDir = join(app.getPath('userData'), 'metadata');
    const fs = await import('fs/promises');
    
    // Ensure directory exists
    await fs.mkdir(metadataDir, { recursive: true });
    
    const metadataPath = join(metadataDir, 'research-metadata.json');
    
    // Read existing metadata
    let existingData: any[] = [];
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      existingData = JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid, start with empty array
    }
    
    // Add new metadata
    existingData.push(metadata);
    
    // Write back to file
    await fs.writeFile(metadataPath, JSON.stringify(existingData, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error);
    return false;
  }
});

// Get all metadata
ipcMain.handle('get-metadata', async () => {
  try {
    const metadataDir = join(app.getPath('userData'), 'metadata');
    const metadataPath = join(metadataDir, 'research-metadata.json');
    const fs = await import('fs/promises');
    
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
});

// Clear all metadata
ipcMain.handle('clear-metadata', async () => {
  try {
    const metadataDir = join(app.getPath('userData'), 'metadata');
    const metadataPath = join(metadataDir, 'research-metadata.json');
    const fs = await import('fs/promises');
    
    await fs.writeFile(metadataPath, JSON.stringify([], null, 2));
    return true;
  } catch (error) {
    console.error('Error clearing metadata:', error);
    return false;
  }
});

