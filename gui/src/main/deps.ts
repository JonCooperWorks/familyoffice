import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import type { DependencyStatus } from '../shared/types';

const execAsync = promisify(exec);

export class DependencyManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async checkAll(): Promise<DependencyStatus> {
    const [docker, codex, dockerImage, npmPackages] = await Promise.all([
      this.checkDocker(),
      this.checkCodex(),
      this.checkDockerImage(),
      this.checkNpmPackages()
    ]);

    return {
      docker,
      codex,
      dockerImage,
      npmPackages
    };
  }

  private async checkDocker() {
    try {
      const { stdout: version } = await execAsync('docker --version');
      
      // Check if Docker daemon is running
      try {
        await execAsync('docker ps');
        return {
          installed: true,
          running: true,
          version: version.trim()
        };
      } catch {
        return {
          installed: true,
          running: false,
          version: version.trim()
        };
      }
    } catch {
      return {
        installed: false,
        running: false
      };
    }
  }

  private async checkCodex() {
    try {
      const { stdout: version } = await execAsync('codex --version');
      
      // Check if authenticated by trying to run codex with a simple command
      try {
        // This will fail if not authenticated
        await execAsync('codex --help', { timeout: 5000 });
        return {
          installed: true,
          authenticated: true,
          version: version.trim()
        };
      } catch {
        return {
          installed: true,
          authenticated: false,
          version: version.trim()
        };
      }
    } catch {
      return {
        installed: false,
        authenticated: false
      };
    }
  }

  private async checkDockerImage() {
    try {
      const { stdout } = await execAsync('docker images familyoffice:latest -q');
      const imageId = stdout.trim();
      
      return {
        built: imageId.length > 0,
        version: imageId || undefined
      };
    } catch {
      return {
        built: false
      };
    }
  }

  private async checkNpmPackages() {
    const nodeModulesPath = join(this.projectRoot, 'node_modules');
    return {
      installed: existsSync(nodeModulesPath)
    };
  }

  async installNpmPackages(): Promise<boolean> {
    try {
      console.log('Installing npm packages...');
      await execAsync('npm install', { 
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      return true;
    } catch (error) {
      console.error('Failed to install npm packages:', error);
      return false;
    }
  }

  async buildDockerImage(onOutput?: (data: string) => void): Promise<boolean> {
    return new Promise((resolve) => {
      const scriptPath = join(this.projectRoot, 'scripts', 'docker-build.sh');
      
      const child = exec(`bash "${scriptPath}"`, {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024
      });

      child.stdout?.on('data', (data) => {
        if (onOutput) onOutput(data.toString());
      });

      child.stderr?.on('data', (data) => {
        if (onOutput) onOutput(data.toString());
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  getInstallInstructions(dep: 'docker' | 'codex'): string {
    if (dep === 'docker') {
      return `To install Docker Desktop:
1. Visit https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for Mac
3. Install and start Docker Desktop
4. Return here and click "Check Again"`;
    } else {
      return `To install Codex CLI:
1. Open Terminal
2. Run: brew install codex
   (or) npm install -g @openai/codex
3. Run: codex
4. Select "Sign in with ChatGPT"
5. Return here and click "Check Again"`;
    }
  }
}

