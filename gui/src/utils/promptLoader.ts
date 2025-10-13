import { readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

export interface PromptTemplate {
  content: string;
  variables: string[];
}

export class PromptLoader {
  private promptsDir: string;

  constructor() {
    // In Electron main process, we need to handle both dev and production paths
    if (app.isPackaged) {
      // Production: prompts are packaged with the app
      this.promptsDir = join(process.resourcesPath, 'prompts');
    } else {
      // Development: prompts are in the project directory
      this.promptsDir = join(__dirname, '../../../prompts');
    }
  }

  loadPrompt(promptName: string): PromptTemplate {
    const promptPath = join(this.promptsDir, `${promptName}.md`);
    try {
      const content = readFileSync(promptPath, 'utf-8');
      const variables = this.extractVariables(content);
      return { content, variables };
    } catch (error) {
      throw new Error(`Failed to load prompt ${promptName}: ${(error as Error).message}`);
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
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      filled = filled.replace(regex, value);
    }
    return filled;
  }
}
