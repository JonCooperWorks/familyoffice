export interface AgentConfig {
    model?: string;
    apiKey?: string;
    debug?: boolean;
}
export interface ResearchRequest {
    companyName: string;
    ticker: string;
}
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
export declare class AgentService {
    private codex;
    private promptLoader;
    private model;
    private threads;
    private debug;
    constructor(config?: AgentConfig);
    research(request: ResearchRequest): Promise<string>;
    reevaluate(request: ResearchRequest, existingReport: string): Promise<string>;
    chat(ticker: string, message: string, reportContent?: string): Promise<string>;
    updateReport(ticker: string): Promise<string>;
    getThreadId(key: string): string | null;
    cleanup(): Promise<void>;
}
