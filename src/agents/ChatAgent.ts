import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent.js';
import type { Thread } from '@openai/codex-sdk';

export class ChatAgent extends BaseAgent {
  private chatThreads: Map<string, Thread> = new Map();

  constructor(config: AgentConfig = {}) {
    super(config);
  }

  protected getPromptName(): string {
    return 'prompt-chat-stock';
  }

  async run(
    ticker: string,
    message: string,
    reportContent?: string,
    onProgress?: AgentProgress
  ): Promise<string> {
    // Check if there's an existing thread for this ticker
    let thread = this.chatThreads.get(ticker);
    let tempDir: string | undefined;

    if (!thread) {
      // Create temp directory for this chat session
      tempDir = await this.createWorkingDirectory(ticker, 'chat');

      onProgress?.(`\n💬 Starting new chat thread about ${ticker}...`);
      onProgress?.(`📁 Temp directory: ${tempDir}\n`);

      thread = this.createThread(tempDir);
      this.chatThreads.set(ticker, thread);

      // Load the chat prompt template
      const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());

      // Prepare template variables
      const templateVars: Record<string, string> = {
        currentDate: this.getCurrentDate(),
        ticker: ticker,
        companyName: ticker,
        tempDir: tempDir || ''
      };

      // Add report context if provided
      if (reportContent) {
        templateVars.reportContext = `- **Report Available**: Yes, a research report has been loaded for context and reference
- **Report Content**: Use this report to provide informed analysis and reference specific sections when relevant

---
## Loaded Report:
${reportContent}
---`;
      } else {
        templateVars.reportContext = `- **Report Available**: No specific report loaded
- **Research Mode**: Focus on providing current information through web searches`;
      }

      // Fill in the template and initialize the thread
      const contextMessage = this.promptLoader.fillTemplate(promptTemplate.content, templateVars);
      await thread.run(contextMessage);
    }

    // Run the user's message
    const { events } = await thread.runStreamed(message);

    let finalResponse = '';

    for await (const event of events) {
      switch (event.type) {
        case 'item.started':
        case 'item.updated':
        case 'item.completed':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
          } else if (event.item.type === 'web_search') {
            if (event.type === 'item.started') {
              onProgress?.(`  🔎 Searching: ${event.item.query}...`);
            } else if (event.type === 'item.completed') {
              onProgress?.('  ✓ Search completed');
            }
          }
          break;
        case 'turn.failed':
          throw new Error(`Chat failed: ${event.error.message}`);
      }
    }

    return finalResponse;
  }

  /**
   * Get the chat thread for a specific ticker (if exists)
   */
  getThread(ticker: string): Thread | undefined {
    return this.chatThreads.get(ticker);
  }

  /**
   * Clear all chat threads
   */
  cleanup(): void {
    super.cleanup();
    this.chatThreads.clear();
  }
}

