import { exec } from "child_process";
import { promisify } from "util";
import type { DependencyStatus } from "../shared/types";

const execAsync = promisify(exec);

export class DependencyManager {
  async checkAll(): Promise<DependencyStatus> {
    const codex = await this.checkCodex();

    return {
      codex,
    };
  }

  private async checkCodex() {
    try {
      const { stdout: version } = await execAsync("codex --version");

      // Check if authenticated by trying to run codex with a simple command
      try {
        // This will fail if not authenticated
        await execAsync("codex --help", { timeout: 5000 });
        return {
          installed: true,
          authenticated: true,
          version: version.trim(),
        };
      } catch {
        return {
          installed: true,
          authenticated: false,
          version: version.trim(),
        };
      }
    } catch {
      return {
        installed: false,
        authenticated: false,
      };
    }
  }

  getInstallInstructions(): string {
    return `To install Codex CLI:
1. Open Terminal
2. Run: brew install codex
   (or) npm install -g @openai/codex
3. Run: codex
4. Select "Sign in with ChatGPT"
5. Return here and click "Check Again"`;
  }
}
