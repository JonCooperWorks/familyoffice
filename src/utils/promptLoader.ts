import { readFileSync } from "fs";
import { join } from "path";
import type { App } from "electron";

export interface PromptTemplate {
  content: string;
  variables: string[];
}

export class PromptLoader {
  private promptsDir: string;

  constructor(app?: App, projectRoot?: string) {
    // If projectRoot is provided directly, use it
    if (projectRoot) {
      this.promptsDir = join(projectRoot, "prompts");
    }
    // Otherwise use app to determine paths
    else if (app) {
      if (app.isPackaged) {
        // Production: prompts are packaged with the app
        this.promptsDir = join(process.resourcesPath, "prompts");
      } else {
        // Development: get the app path (project root) and append prompts
        this.promptsDir = join(app.getAppPath(), "prompts");
      }
    }
    // Fallback for non-Electron contexts (shouldn't happen but safety first)
    else {
      throw new Error(
        "PromptLoader requires either app or projectRoot parameter",
      );
    }
  }

  loadPrompt(promptName: string): PromptTemplate {
    const promptPath = join(this.promptsDir, `${promptName}.md`);
    try {
      const content = readFileSync(promptPath, "utf-8");
      const variables = this.extractVariables(content);
      return { content, variables };
    } catch (error) {
      throw new Error(
        `Failed to load prompt ${promptName}: ${(error as Error).message}`,
      );
    }
  }

  private extractVariables(content: string): string[] {
    const variableRegex = /\$\{(\w+)\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1]!)) {
        variables.push(match[1]!);
      }
    }
    return variables;
  }

  fillTemplate(template: string, values: Record<string, string>): string {
    let filled = template;
    for (const [key, value] of Object.entries(values)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, "g");
      filled = filled.replace(regex, value);
    }
    return filled;
  }
}
