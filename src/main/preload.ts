import { contextBridge, ipcRenderer } from 'electron';
import type { DependencyStatus, ResearchRequest, Report, DockerOutput } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Dependency management
  checkDependencies: (): Promise<DependencyStatus> => 
    ipcRenderer.invoke('check-dependencies'),
  
  // Research operations
  runResearch: (request: ResearchRequest): Promise<string> => 
    ipcRenderer.invoke('run-research', request),
  
  // Chat operations
  runChat: (ticker: string, message: string, reportPath?: string, referenceReports?: Array<{ticker: string, content: string}>): Promise<{ response: string; usage?: { input_tokens: number; output_tokens: number } }> => 
    ipcRenderer.invoke('run-chat', ticker, message, reportPath, referenceReports),
  
  // Update report from chat session
  updateReport: (ticker: string, chatHistory?: any[]): Promise<string> => 
    ipcRenderer.invoke('update-report', ticker, chatHistory),
  
  // Report management
  getReports: (): Promise<Report[]> => 
    ipcRenderer.invoke('get-reports'),
  
  openReport: (path: string): Promise<void> => 
    ipcRenderer.invoke('open-report', path),
  
  readReport: (path: string): Promise<string> => 
    ipcRenderer.invoke('read-report', path),
  
  exportReport: (path: string, htmlContent: string): Promise<string | null> => 
    ipcRenderer.invoke('export-report', path, htmlContent),
  
  deleteReport: (reportPath: string): Promise<boolean> => 
    ipcRenderer.invoke('delete-report', reportPath),
  
  // Event listeners
  onDockerOutput: (callback: (output: DockerOutput) => void) => {
    const listener = (_event: any, output: DockerOutput) => callback(output);
    ipcRenderer.on('docker-output', listener);
    return () => ipcRenderer.removeListener('docker-output', listener);
  },
  
  onProcessComplete: (callback: (result: string) => void) => {
    const listener = (_event: any, result: string) => callback(result);
    ipcRenderer.on('process-complete', listener);
    return () => ipcRenderer.removeListener('process-complete', listener);
  },
  
  onProcessError: (callback: (error: string) => void) => {
    const listener = (_event: any, error: string) => callback(error);
    ipcRenderer.on('process-error', listener);
    return () => ipcRenderer.removeListener('process-error', listener);
  },
  
  onChatStream: (callback: (text: string) => void) => {
    const listener = (_event: any, text: string) => callback(text);
    ipcRenderer.on('chat-stream', listener);
    return () => ipcRenderer.removeListener('chat-stream', listener);
  },
  
  // Metadata operations
  saveMetadata: (metadata: any): Promise<boolean> =>
    ipcRenderer.invoke('save-metadata', metadata),
  
  getMetadata: (): Promise<any[]> =>
    ipcRenderer.invoke('get-metadata'),
  
  clearMetadata: (): Promise<boolean> =>
    ipcRenderer.invoke('clear-metadata'),
  
  // Alpha Vantage API Key management
  getAlphaVantageApiKey: (): Promise<string | null> =>
    ipcRenderer.invoke('get-alphavantage-api-key'),
  
  setAlphaVantageApiKey: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('set-alphavantage-api-key', apiKey),
  
  hasAlphaVantageApiKey: (): Promise<boolean> =>
    ipcRenderer.invoke('has-alphavantage-api-key')
});

declare global {
  interface Window {
    electronAPI: {
      checkDependencies: () => Promise<DependencyStatus>;
      runResearch: (request: ResearchRequest) => Promise<string>;
      runChat: (ticker: string, message: string, reportPath?: string, referenceReports?: Array<{ticker: string, content: string}>) => Promise<{ response: string; usage?: { input_tokens: number; output_tokens: number } }>;
      updateReport: (ticker: string, chatHistory?: any[]) => Promise<string>;
      getReports: () => Promise<Report[]>;
      openReport: (path: string) => Promise<void>;
      readReport: (path: string) => Promise<string>;
      exportReport: (path: string, htmlContent: string) => Promise<string | null>;
      deleteReport: (reportPath: string) => Promise<boolean>;
      onDockerOutput: (callback: (output: DockerOutput) => void) => () => void;
      onProcessComplete: (callback: (result: string) => void) => () => void;
      onProcessError: (callback: (error: string) => void) => () => void;
      onChatStream: (callback: (text: string) => void) => () => void;
      saveMetadata: (metadata: any) => Promise<boolean>;
      getMetadata: () => Promise<any[]>;
      clearMetadata: () => Promise<boolean>;
      getAlphaVantageApiKey: () => Promise<string | null>;
      setAlphaVantageApiKey: (apiKey: string) => Promise<boolean>;
      hasAlphaVantageApiKey: () => Promise<boolean>;
    };
  }
}

