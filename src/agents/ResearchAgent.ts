import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent.js';

export interface ResearchRequest {
  companyName: string;
  ticker: string;
}

export class ResearchAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super(config);
  }

  protected getPromptName(): string {
    return 'prompt-research-stock';
  }

  async run(request: ResearchRequest, onProgress?: AgentProgress): Promise<string> {
    onProgress?.(`\n🔍 Starting research on ${request.companyName} (${request.ticker})...\n`);

    // Create temp directory
    const tempDir = await this.createWorkingDirectory(request.ticker, 'research');
    onProgress?.(`📁 Temp directory: ${tempDir}\n`);

    // Load and fill prompt template
    const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      companyName: request.companyName,
      ticker: request.ticker,
      currentDate: this.getCurrentDate(),
      tempDir: tempDir,
    });

    // Create thread and run
    const thread = this.createThread(tempDir);
    onProgress?.('Running research...');

    try {
      const { events } = await thread.runStreamed(prompt);
      return await this.processEvents(events, onProgress);
    } catch (error) {
      throw new Error(`Research failed: ${(error as Error).message}`);
    }
  }
}

