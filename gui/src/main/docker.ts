import { exec } from 'child_process';
import { join, basename, relative } from 'path';
import type { ResearchRequest } from '../shared/types';

export class DockerManager {
  private projectRoot: string;
  private onOutput?: (type: 'stdout' | 'stderr', data: string) => void;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  setOutputHandler(handler: (type: 'stdout' | 'stderr', data: string) => void) {
    this.onOutput = handler;
  }

  /**
   * Convert absolute path to relative path for Docker container
   * Docker container's working directory is /app/reports, so we just need the filename
   */
  private toRelativePath(filePath: string): string {
    // If it's a path containing reports directory, just return the filename
    // since Docker's working directory is already /app/reports
    if (filePath.includes('/reports/') || filePath.includes('reports/')) {
      return basename(filePath);
    }
    
    // For other paths, try to make relative to project root
    if (filePath.startsWith('/')) {
      return relative(this.projectRoot, filePath);
    }
    
    // Already relative
    return filePath;
  }

  async runResearch(request: ResearchRequest): Promise<string> {
    const scriptPath = join(this.projectRoot, 'scripts', 'docker-run.sh');
    
    let args = ['research', request.ticker];
    
    if (request.companyName) {
      args.push('--company', `"${request.companyName}"`);
    }
    
    if (request.reportPath) {
      const relativePath = this.toRelativePath(request.reportPath);
      args.push('--report', relativePath);
    }

    return this.executeScript(scriptPath, args);
  }

  async runChat(ticker: string, message: string, reportPath?: string): Promise<string> {
    const scriptPath = join(this.projectRoot, 'scripts', 'docker-run.sh');
    
    let args = ['chat', ticker];
    
    if (reportPath) {
      const relativePath = this.toRelativePath(reportPath);
      args.push('--report', relativePath);
    }

    // Add message in non-interactive mode
    if (message) {
      args.push('--message', `"${message.replace(/"/g, '\\"')}"`);
    }

    return this.executeScript(scriptPath, args);
  }

  private executeScript(scriptPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = `bash "${scriptPath}" ${args.join(' ')}`;
      
      const child = exec(command, {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (this.onOutput) {
          this.onOutput('stdout', text);
        }
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (this.onOutput) {
          this.onOutput('stderr', text);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process exited with code ${code}\n${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async getGeneratedReportPath(ticker: string): Promise<string | null> {
    // Parse the output to find the generated report filename
    // The script outputs: "✅ Research Report saved to: research-AAPL-2025-10-11T14-30-00.md"
    const reportsDir = join(this.projectRoot, 'reports');
    const fs = await import('fs/promises');
    
    try {
      const files = await fs.readdir(reportsDir);
      const reportFiles = files
        .filter(f => f.startsWith(`research-${ticker}-`) && f.endsWith('.md'))
        .sort()
        .reverse(); // Most recent first
      
      return reportFiles.length > 0 ? join(reportsDir, reportFiles[0]) : null;
    } catch {
      return null;
    }
  }
}

