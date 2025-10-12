import { contextBridge, ipcRenderer } from 'electron';
import type { DependencyStatus, ResearchRequest, Report, DockerOutput } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Dependency management
  checkDependencies: (): Promise<DependencyStatus> => 
    ipcRenderer.invoke('check-dependencies'),
  
  installDependency: (dep: string): Promise<boolean> => 
    ipcRenderer.invoke('install-dependency', dep),
  
  buildDockerImage: (): Promise<boolean> => 
    ipcRenderer.invoke('build-docker-image'),
  
  // Research operations
  runResearch: (request: ResearchRequest): Promise<string> => 
    ipcRenderer.invoke('run-research', request),
  
  // Chat operations
  runChat: (ticker: string, message: string, reportPath?: string): Promise<string> => 
    ipcRenderer.invoke('run-chat', ticker, message, reportPath),
  
  // Report management
  getReports: (): Promise<Report[]> => 
    ipcRenderer.invoke('get-reports'),
  
  openReport: (path: string): Promise<void> => 
    ipcRenderer.invoke('open-report', path),
  
  readReport: (path: string): Promise<string> => 
    ipcRenderer.invoke('read-report', path),
  
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
  }
});

declare global {
  interface Window {
    electronAPI: {
      checkDependencies: () => Promise<DependencyStatus>;
      installDependency: (dep: string) => Promise<boolean>;
      buildDockerImage: () => Promise<boolean>;
      runResearch: (request: ResearchRequest) => Promise<string>;
      runChat: (ticker: string, message: string, reportPath?: string) => Promise<string>;
      getReports: () => Promise<Report[]>;
      openReport: (path: string) => Promise<void>;
      readReport: (path: string) => Promise<string>;
      onDockerOutput: (callback: (output: DockerOutput) => void) => () => void;
      onProcessComplete: (callback: (result: string) => void) => () => void;
      onProcessError: (callback: (error: string) => void) => () => void;
    };
  }
}

