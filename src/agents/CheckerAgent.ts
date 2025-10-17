import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent.js';

export interface CheckerRequest {
  ticker: string;
  reportContent: string;
}

export class CheckerAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super(config);
  }

  protected getPromptName(): string {
    return 'prompt-checker-pass';
  }

  async run(request: CheckerRequest, onProgress?: AgentProgress): Promise<string> {
    onProgress?.(`\n✅ Running quality check on ${request.ticker} report...\n`);

    // Create temp directory
    const tempDir = await this.createWorkingDirectory(request.ticker, 'checker');
    onProgress?.(`📁 Temp directory: ${tempDir}\n`);

    if (this.debug) {
      onProgress?.('📝 Preparing checker prompt...');
      onProgress?.(`   Report length: ${request.reportContent.length} characters`);
    }

    // Load and fill prompt template
    const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      ticker: request.ticker,
      currentDate: this.getCurrentDate(),
      tempDir: tempDir,
      reportContent: request.reportContent,
    });

    if (this.debug) {
      onProgress?.(`   Final prompt length: ${prompt.length} characters`);
    }

    // Create thread and run
    const thread = this.createThread(tempDir);
    onProgress?.('Running quality checks...\n');

    try {
      const { events } = await thread.runStreamed(prompt);
      return await this.processEvents(events, onProgress);
    } catch (error) {
      throw new Error(`Checker pass failed: ${(error as Error).message}`);
    }
  }
}

