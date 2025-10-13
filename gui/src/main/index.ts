import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, stat, copyFile } from 'fs/promises';
import { DependencyManager } from './deps';
import { AgentManager } from './agentManager';
import type { ResearchRequest, Report } from '../shared/types';
import fixPath from 'fix-path';

// Fix PATH and set Codex binary location early
fixPath();
process.env.CODEX_BINARY = '/opt/homebrew/bin/codex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root (gui/../)
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

let mainWindow: BrowserWindow | null = null;
const depManager = new DependencyManager(PROJECT_ROOT);
const agentManager = new AgentManager(PROJECT_ROOT);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    title: 'familyoffice'
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

app.whenReady().then(createWindow);

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

// IPC Handlers

ipcMain.handle('check-dependencies', async () => {
  return await depManager.checkAll();
});

ipcMain.handle('install-dependency', async (_event, dep: string) => {
  if (dep === 'npm') {
    return await depManager.installNpmPackages();
  }
  return false;
});

ipcMain.handle('build-docker-image', async () => {
  // No longer needed - Codex runs directly in the app
  return true;
});

ipcMain.handle('run-research', async (_event, request: ResearchRequest) => {
  try {
    agentManager.setOutputHandler((type, data) => {
      mainWindow?.webContents.send('docker-output', { type, data });
    });
    
    let result: string;
    
    if (request.reportPath) {
      // This is a reevaluation
      result = await agentManager.runReevaluate(request, request.reportPath);
    } else {
      // This is new research
      result = await agentManager.runResearch(request);
    }
    
    mainWindow?.webContents.send('process-complete', result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    mainWindow?.webContents.send('process-error', errorMsg);
    throw error;
  }
});

ipcMain.handle('run-chat', async (_event, ticker: string, message: string, reportPath?: string) => {
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
      }
    );
    
    mainWindow?.webContents.send('process-complete', result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    mainWindow?.webContents.send('process-error', errorMsg);
    throw error;
  }
});

ipcMain.handle('update-report', async (_event, ticker: string) => {
  try {
    agentManager.setOutputHandler((type, data) => {
      mainWindow?.webContents.send('docker-output', { type, data });
    });
    
    const result = await agentManager.updateReport(ticker);
    
    mainWindow?.webContents.send('process-complete', result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
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

ipcMain.handle('read-report', async (_event, path: string) => {
  try {
    const content = await readFile(path, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading report:', error);
    throw error;
  }
});

ipcMain.handle('export-report', async (_event, reportPath: string) => {
  try {
    if (!mainWindow) return null;
    
    // Extract the report filename for default save name
    const filename = reportPath.split('/').pop() || 'report.md';
    
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Report',
      defaultPath: filename,
      filters: [
        { name: 'Markdown files', extensions: ['md'] },
        { name: 'All files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePath) {
      return null;
    }
    
    // Copy the report file to the chosen location
    await copyFile(reportPath, result.filePath);
    
    return result.filePath;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
});

