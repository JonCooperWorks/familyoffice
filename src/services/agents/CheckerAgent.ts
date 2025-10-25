import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent';
import type { App } from 'electron';

export interface CheckerRequest {
  ticker: string;
  reportContent: string;
}

export class CheckerAgent extends BaseAgent {
  constructor(config: AgentConfig = {}, app: App) {
    super(config, app);
  }

  protected getPromptName(): string {
    return 'prompt-checker-pass';
  }

  async run(request: CheckerRequest, onProgress?: AgentProgress): Promise<{ response: string; usage?: { input_tokens: number; output_tokens: number } }> {
    onProgress?.(`✅ Running quality check on ${request.ticker} report...`);

    // Fetch market data
    onProgress?.(`📊 Fetching market data...`);
    const quote = await this.getMarketData(request.ticker, onProgress);
    const marketData = this.formatMarketData(quote);

    // Create temp directory
    const tempDir = await this.createWorkingDirectory(request.ticker, 'checker');
    onProgress?.(`📁 Temp directory: ${tempDir}`);

    if (this.debug) {
      onProgress?.('📝 Preparing checker prompt...');
      onProgress?.(`Report length: ${request.reportContent.length} characters`);
    }

    // Load and fill prompt template
    const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      ticker: request.ticker,
      currentDate: this.getCurrentDate(),
      tempDir: tempDir,
      reportContent: request.reportContent,
      marketData: marketData,
    });

    if (this.debug) {
      onProgress?.(`Final prompt length: ${prompt.length} characters`);
    }

    // Create thread and run
    const thread = this.createThread(tempDir);
    onProgress?.('Running quality checks...');

    try {
      const { events } = await thread.runStreamed(prompt);
      return await this.processEvents(events, onProgress);
    } catch (error) {
      throw new Error(`Checker pass failed: ${(error as Error).message}`);
    }
  }
}

