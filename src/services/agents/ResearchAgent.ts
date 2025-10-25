import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent';
import type { App } from 'electron';

export interface ResearchRequest {
  companyName: string;
  ticker: string;
}

export class ResearchAgent extends BaseAgent {
  constructor(config: AgentConfig = {}, app: App) {
    super(config, app);
  }

  protected getPromptName(): string {
    return 'prompt-research-stock';
  }

  async run(request: ResearchRequest, onProgress?: AgentProgress): Promise<{ response: string; usage?: { input_tokens: number; output_tokens: number } }> {
    onProgress?.(`🔍 Starting research on ${request.companyName} (${request.ticker})...`);

    // Fetch market data
    onProgress?.(`📊 Fetching market data...`);
    const quote = await this.getMarketData(request.ticker, onProgress);
    const marketData = this.formatMarketData(quote);

    // Create temp directory
    const tempDir = await this.createWorkingDirectory(request.ticker, 'research');
    onProgress?.(`📁 Temp directory: ${tempDir}`);

    // Load and fill prompt template
    const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      companyName: request.companyName,
      ticker: request.ticker,
      currentDate: this.getCurrentDate(),
      tempDir: tempDir,
      marketData: marketData,
    });

    // Create thread and run
    const thread = this.createThread(tempDir);
    onProgress?.('🤖 Initializing agent...');

    try {
      const { events } = await thread.runStreamed(prompt);
      return await this.processEvents(events, onProgress);
    } catch (error) {
      throw new Error(`Research failed: ${(error as Error).message}`);
    }
  }
}

