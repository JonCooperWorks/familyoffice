import { BaseAgent, type AgentConfig, type AgentProgress } from './BaseAgent';
import type { App } from 'electron';

export interface ChatHistoryMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface UpdateRequest {
  ticker: string;
  chatHistory?: ChatHistoryMessage[];
}

export class UpdateAgent extends BaseAgent {
  constructor(config: AgentConfig = {}, app: App) {
    super(config, app);
  }

  protected getPromptName(): string {
    return 'prompt-update-report';
  }

  async run(request: UpdateRequest, onProgress?: AgentProgress): Promise<string> {
    onProgress?.(`updating ${request.ticker} report`);

    if (this.debug) {
      console.log(`💬 [DEBUG] Chat history provided: ${request.chatHistory ? request.chatHistory.length : 0} messages`);
    }

    // Create temp directory
    const tempDir = await this.createWorkingDirectory(request.ticker, 'update');
    onProgress?.(`Setting up research environment...`);

    // Build the chat history section if available
    let chatHistorySection = '';
    if (request.chatHistory && request.chatHistory.length > 0) {
      chatHistorySection = `## Chat Conversation History

The following is our complete conversation about ${request.ticker}:

---
`;

      request.chatHistory.forEach((message) => {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        const timestamp = new Date(message.timestamp).toLocaleString();
        chatHistorySection += `**${role}** (${timestamp}):\n${message.content}\n\n---\n`;
      });

      chatHistorySection += `\n`;
    }

    // Load and fill prompt template
    const promptTemplate = this.promptLoader.loadPrompt(this.getPromptName());
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      ticker: request.ticker,
      currentDate: this.getCurrentDate(),
      tempDir: tempDir,
      chatHistorySection: chatHistorySection
    });

    if (this.debug) {
      console.log(`📝 [DEBUG] Sending update prompt to thread (${prompt.length} characters)`);
    }

    // Create thread and run
    const thread = this.createThread(tempDir);
    onProgress?.('Generating updated report...');

    try {
      const { events } = await thread.runStreamed(prompt);
      return await this.processEvents(events, onProgress);
    } catch (error) {
      throw new Error(`Report update failed: ${(error as Error).message}`);
    }
  }
}

