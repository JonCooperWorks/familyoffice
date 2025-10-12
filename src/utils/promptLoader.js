import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class PromptLoader {
    constructor() {
        // Navigate from src/utils to prompts directory
        this.promptsDir = join(__dirname, '../../prompts');
    }
    loadPrompt(promptName) {
        const promptPath = join(this.promptsDir, `${promptName}.md`);
        try {
            const content = readFileSync(promptPath, 'utf-8');
            const variables = this.extractVariables(content);
            return { content, variables };
        }
        catch (error) {
            throw new Error(`Failed to load prompt ${promptName}: ${error.message}`);
        }
    }
    extractVariables(content) {
        const variableRegex = /\$\{(\w+)\}/g;
        const variables = [];
        let match;
        while ((match = variableRegex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }
        return variables;
    }
    fillTemplate(template, values) {
        let filled = template;
        for (const [key, value] of Object.entries(values)) {
            const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
            filled = filled.replace(regex, value);
        }
        return filled;
    }
}
