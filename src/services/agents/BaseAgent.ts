import { Codex, type Thread } from '@openai/codex-sdk';
import { PromptLoader } from '../../utils/promptLoader';
import type { App } from 'electron';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export interface AgentConfig {
  model?: string;
  apiKey?: string;
  debug?: boolean;
  workingDirectory?: string;
}

export interface AgentProgress {
  (message: string): void;
}

export abstract class BaseAgent {
  protected codex: Codex;
  protected promptLoader: PromptLoader;
  protected model: string;
  protected debug: boolean;
  protected thread?: Thread;
  protected app: App;

  constructor(config: AgentConfig = {}, app: App) {
    this.codex = new Codex(config.apiKey ? { apiKey: config.apiKey } : {});
    this.promptLoader = new PromptLoader(app);
    this.model = config.model || '';
    this.debug = config.debug || false;
    this.app = app;
  }

  /**
   * Get the name of the prompt file to load (without extension)
   */
  protected abstract getPromptName(): string;

  /**
   * Create the working directory for this agent run
   */
  protected async createWorkingDirectory(ticker: string, suffix: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Use app data directory for temp files
    const tempBaseDir = this.app.isPackaged 
      ? join(this.app.getPath('userData'), 'temp')
      : join(this.app.getAppPath(), 'temp');
    
    const tempDir = join(tempBaseDir, `${ticker}-${suffix}-${timestamp}`);
    await mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Get current date in readable format
   */
  protected getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Create a new thread for agent execution
   */
  protected createThread(workingDirectory: string): Thread {
    const thread = this.codex.startThread({
      ...(this.model && { model: this.model }),
      workingDirectory,
      skipGitRepoCheck: true,
      sandboxMode: 'danger-full-access',
    });
    this.thread = thread;
    return thread;
  }

  /**
   * Process streaming events from the thread
   */
  protected async processEvents(
    events: AsyncIterable<any>,
    onProgress?: AgentProgress
  ): Promise<{ response: string; usage?: { input_tokens: number; output_tokens: number } }> {
    let finalResponse = '';
    let hasResponse = false;
    let eventCount = 0;
    let usage: { input_tokens: number; output_tokens: number } | undefined;

    for await (const event of events) {
      eventCount++;

      if (this.debug && eventCount <= 10) {
        console.log(`   [Event ${eventCount}] ${event.type}`);
      }

      switch (event.type) {
        case 'item.started':
          this.handleItemStarted(event, onProgress);
          break;
        case 'item.updated':
        case 'item.completed':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
            hasResponse = true;
          }
          this.handleItemUpdatedOrCompleted(event, onProgress);
          break;
        case 'turn.completed':
          onProgress?.(`✅ Task completed!`);
          if (event.usage) {
            usage = {
              input_tokens: event.usage.input_tokens,
              output_tokens: event.usage.output_tokens
            };
            onProgress?.(`📊 Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`);
          }
          break;
        case 'turn.failed':
          throw new Error(`Task failed: ${event.error.message}`);
      }
    }

    if (!hasResponse || !finalResponse) {
      throw new Error('No response generated. The agent may need a different prompt or model configuration.');
    }

    return { response: finalResponse, usage };
  }

  /**
   * Handle item started events
   */
  protected handleItemStarted(event: any, onProgress?: AgentProgress): void {
    if (event.item.type === 'web_search') {
      onProgress?.(`🔎 Searching: ${event.item.query}`);
    } else if (event.item.type === 'reasoning') {
      onProgress?.(`💭 Agent is thinking...`);
    } else if (event.item.type === 'command_execution') {
      onProgress?.(`⚙️ Executing command: ${event.item.command}`);
    } else if (this.debug) {
      onProgress?.(`⚙️ Item started: ${event.item.type}`);
    }
  }

  /**
   * Handle item updated or completed events
   */
  protected handleItemUpdatedOrCompleted(event: any, onProgress?: AgentProgress): void {
    if (event.type === 'item.completed') {
      if (event.item.type === 'web_search') {
        onProgress?.(`✓ Search completed`);
      } else if (event.item.type === 'todo_list') {
        const todos = event.item.items.map((t: any, i: number) =>
          `${i + 1}. [${t.completed ? '✓' : ' '}] ${t.text}`
        ).join('\n     ');
        onProgress?.(`📋 Plan:\n     ${todos}`);
      } else if (event.item.type === 'reasoning') {
        const thinkingSummary = event.item.text.substring(0, 150);
        onProgress?.(`💭 ${thinkingSummary}${event.item.text.length > 150 ? '...' : ''}`);
      }
    }
  }

  /**
   * Clean up thread resources
   */
  cleanup(): void {
    // Thread will be garbage collected
    // Child classes can override for additional cleanup
  }
}

