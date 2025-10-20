import { app } from 'electron';
import fixPath from 'fix-path';

// Base Agent Classes
import type { AgentConfig } from './agents/BaseAgent';
import { ResearchAgent, type ResearchRequest } from './agents/ResearchAgent';
import { ReevaluationAgent, type ReevaluationRequest } from './agents/ReevaluationAgent';
import { ChatAgent } from './agents/ChatAgent';
import { UpdateAgent, type UpdateRequest, type ChatHistoryMessage } from './agents/UpdateAgent';
import { CheckerAgent, type CheckerRequest } from './agents/CheckerAgent';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Main AgentService for the GUI that orchestrates different agent types
 * This service adapts the CLI agents for use in an Electron environment
 */
export class AgentService {
  private config: AgentConfig;
  private chatAgents: Map<string, ChatAgent> = new Map();

  constructor(config: AgentConfig = {}) {
    // Fix PATH environment variable for Electron to find system binaries
    fixPath();
    
    // Set the CODEX_BINARY environment variable to use system codex
    process.env.CODEX_BINARY = '/opt/homebrew/bin/codex';
    
    this.config = {
      ...config,
      // Ensure we pass the fixed environment
      apiKey: config.apiKey,
      model: config.model || '',
      debug: config.debug || false,
    };
  }

  /**
   * Run research on a stock
   */
  async research(request: ResearchRequest, onProgress?: (message: string) => void): Promise<string> {
    const agent = new ResearchAgent(this.config, app);
    try {
      return await agent.run(request, onProgress);
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Reevaluate an existing research report
   */
  async reevaluate(request: ResearchRequest, existingReport: string, onProgress?: (message: string) => void): Promise<string> {
    const agent = new ReevaluationAgent(this.config, app);
    try {
      return await agent.run(
        { ...request, existingReport },
        onProgress
      );
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Run a quality checker pass on a report
   */
  async check(ticker: string, reportContent: string, onProgress?: (message: string) => void): Promise<string> {
    const agent = new CheckerAgent(this.config, app);
    try {
      return await agent.run(
        { ticker, reportContent },
        onProgress
      );
    } finally {
      agent.cleanup();
    }
  }

  /**
   * Chat about a stock (maintains thread state)
   */
  async chat(
    ticker: string,
    message: string,
    reportContent?: string,
    onProgress?: (message: string) => void,
    onStream?: (text: string) => void
  ): Promise<string> {
    // Get or create a chat agent for this ticker
    let chatAgent = this.chatAgents.get(ticker);
    if (!chatAgent) {
      chatAgent = new ChatAgent(this.config, app);
      this.chatAgents.set(ticker, chatAgent);
    }

    return await chatAgent.run(ticker, message, reportContent, onProgress, onStream);
  }

  /**
   * Update report from chat history
   */
  async updateReport(
    ticker: string,
    chatHistory?: Array<{role: string, content: string, timestamp: string}>,
    onProgress?: (message: string) => void
  ): Promise<string> {
    const agent = new UpdateAgent(this.config, app);
    try {
      return await agent.run(
        { ticker, chatHistory },
        onProgress
      );
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
