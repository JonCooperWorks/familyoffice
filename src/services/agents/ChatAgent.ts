import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent';
import type { Thread } from '@openai/codex-sdk';
import type { App } from 'electron';

export class ChatAgent extends BaseAgent {
  private chatThreads: Map<string, Thread> = new Map();

  constructor(config: AgentConfig = {}, app: App) {
    super(config, app);
  }

  protected getPromptName(): string {
    return 'prompt-chat-stock';
  }

  async run(
    ticker: string,
    message: string,
    reportContent?: string,
    onProgress?: AgentProgress,
    onStream?: (text: string) => void,
    referenceReports?: Array<{ticker: string, content: string}>
  ): Promise<{ response: string; usage?: { input_tokens: number; output_tokens: number } }> {
    // Check if there's an existing thread for this ticker
    let thread = this.chatThreads.get(ticker);
    let tempDir: string | undefined;

    if (!thread) {
      // Create temp directory for this chat session
      tempDir = await this.createWorkingDirectory(ticker, 'chat');

      onProgress?.(`💬 Starting new chat thread about ${ticker}...`);
      onProgress?.(`📁 Temp directory: ${tempDir}`);

      // Fetch market data
      onProgress?.(`📊 Fetching market data...`);
      const quote = await this.getMarketData(ticker, onProgress);
      const marketData = this.formatMarketData(quote);

      thread = this.createThread(tempDir);
      this.chatThreads.set(ticker, thread);

      // Load the chat prompt template
      const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());

      // Prepare template variables
      const templateVars: Record<string, string> = {
        currentDate: this.getCurrentDate(),
        ticker: ticker,
        companyName: ticker,
        tempDir: tempDir || '',
        marketData: marketData
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

    // Prepare the user's message with reference reports if provided
    let finalMessage = message;
    if (referenceReports && referenceReports.length > 0) {
      const referenceSection = referenceReports.map(ref => 
        `## Reference Report: ${ref.ticker}\n\n${ref.content}`
      ).join('\n\n---\n\n');
      
      finalMessage = `${message}

---
**Reference Reports for Comparison:**

${referenceSection}

---

Please analyze my question in the context of both the main report and the reference reports provided above.`;
      
      onProgress?.(`📚 Including ${referenceReports.length} reference report(s): ${referenceReports.map(r => r.ticker).join(', ')}`);
    }

    // Run the user's message using the unified event processor
    const { events } = await thread.runStreamed(finalMessage);
    return await this.processEventsWithStreaming(events, onProgress, onStream);
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

