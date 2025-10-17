import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent.js';

export interface ReevaluationRequest {
  companyName: string;
  ticker: string;
  existingReport: string;
}

export class ReevaluationAgent extends BaseAgent {
  constructor(config: AgentConfig = {}) {
    super(config);
  }

  protected getPromptName(): string {
    return 'prompt-reevaluate-stock';
  }

  async run(request: ReevaluationRequest, onProgress?: AgentProgress): Promise<string> {
    onProgress?.(`\n🔄 Starting reevaluation of ${request.companyName} (${request.ticker})...\n`);

    // Create temp directory
    const tempDir = await this.createWorkingDirectory(request.ticker, 'reevaluate');
    onProgress?.(`📁 Temp directory: ${tempDir}\n`);

    if (this.debug) {
      onProgress?.('📝 Preparing reevaluation prompt with existing report...');
      onProgress?.(`   Report length: ${request.existingReport.length} characters`);
    }

    // Load and fill prompt template
    const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      companyName: request.companyName,
      ticker: request.ticker,
      currentDate: this.getCurrentDate(),
      reportContent: request.existingReport,
      tempDir: tempDir,
    });

    if (this.debug) {
      onProgress?.(`   Final prompt length: ${prompt.length} characters`);
      onProgress?.('🚀 Creating thread and starting reevaluation...');
    }

    // Create thread and run
    const thread = this.createThread(tempDir);
    onProgress?.('Running reevaluation...\n');

    try {
      const { events } = await thread.runStreamed(prompt);
      return await this.processEvents(events, onProgress);
    } catch (error) {
      throw new Error(`Reevaluation failed: ${(error as Error).message}`);
    }
  }
}

