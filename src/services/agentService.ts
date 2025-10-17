import {
  ResearchAgent,
  ReevaluationAgent,
  ChatAgent,
  UpdateAgent,
  CheckerAgent,
  type AgentConfig,
  type ResearchRequest,
  type ReevaluationRequest,
  type UpdateRequest,
  type CheckerRequest,
  type ChatHistoryMessage
} from '../agents/index.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Main AgentService that orchestrates different agent types
 * This service maintains the same API as before but uses specialized agents internally
 */
export class AgentService {
  private config: AgentConfig;
  private chatAgents: Map<string, ChatAgent> = new Map();

  constructor(config: AgentConfig = {}) {
    this.config = config;
  }

  /**
   * Run research on a stock
   */
  async research(request: ResearchRequest): Promise<string> {
    const agent = new ResearchAgent(this.config);
    try {
      return await agent.run(request, (msg) => console.log(msg));
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Reevaluate an existing research report
   */
  async reevaluate(request: ResearchRequest, existingReport: string): Promise<string> {
    const agent = new ReevaluationAgent(this.config);
    try {
      return await agent.run(
        { ...request, existingReport },
        (msg) => console.log(msg)
      );
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Run a quality checker pass on a report
   */
  async check(ticker: string, reportContent: string): Promise<string> {
    const agent = new CheckerAgent(this.config);
    try {
      return await agent.run(
        { ticker, reportContent },
        (msg) => console.log(msg)
      );
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Chat about a stock (maintains thread state)
   */
  async chat(ticker: string, message: string, reportContent?: string): Promise<string> {
    // Get or create a chat agent for this ticker
    let chatAgent = this.chatAgents.get(ticker);
    if (!chatAgent) {
      chatAgent = new ChatAgent(this.config);
      this.chatAgents.set(ticker, chatAgent);
    }

    return await chatAgent.run(ticker, message, reportContent, (msg) => console.log(msg));
  }

  /**
   * Update report from chat history
   */
  async updateReport(ticker: string, chatHistory?: Array<{role: string, content: string, timestamp: string}>): Promise<string> {
    const agent = new UpdateAgent(this.config);
    try {
      const request: UpdateRequest = {
        ticker,
        ...(chatHistory && { chatHistory })
      };
      return await agent.run(request, (msg) => console.log(msg));
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Get thread ID for a chat session (for compatibility)
   */
  getThreadId(key: string): string | null {
    const chatAgent = this.chatAgents.get(key.replace('chat-', ''));
    const thread = chatAgent?.getThread(key.replace('chat-', ''));
    return thread?.id || null;
  }

  /**
   * Clean up all agents
   */
  async cleanup(): Promise<void> {
    // Clean up all chat agents
    this.chatAgents.forEach(agent => agent.cleanup());
    this.chatAgents.clear();
  }
}

// Re-export types for convenience
export type { AgentConfig, ResearchRequest, ReevaluationRequest, UpdateRequest, CheckerRequest, ChatHistoryMessage };
