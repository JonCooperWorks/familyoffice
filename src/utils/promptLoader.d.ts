export interface PromptTemplate {
    content: string;
    variables: string[];
}
export declare class PromptLoader {
    private promptsDir;
    constructor();
    loadPrompt(promptName: string): PromptTemplate;
    private extractVariables;
    fillTemplate(template: string, values: Record<string, string>): string;
}
