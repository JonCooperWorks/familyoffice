import { Codex, type Thread } from '@openai/codex-sdk';
import { PromptLoader } from '../utils/promptLoader';
import { app } from 'electron';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import fixPath from 'fix-path';

export interface AgentConfig {
  model?: string;
  apiKey?: string;
  debug?: boolean;
}

export interface ResearchRequest {
  companyName: string;
  ticker: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AgentService {
  private codex: Codex;
  private promptLoader: PromptLoader;
  private model: string;
  private threads: Map<string, Thread> = new Map();
  private debug: boolean;

  constructor(config: AgentConfig = {}) {
    // Fix PATH environment variable for Electron to find system binaries
    fixPath();
    
    // Set the CODEX_BINARY environment variable to use system codex
    process.env.CODEX_BINARY = '/opt/homebrew/bin/codex';
    
    // Codex SDK automatically uses your CLI authentication!
    // No API key needed if you're signed in with `codex` CLI
    this.codex = new Codex(config.apiKey ? { apiKey: config.apiKey } : {});
    this.promptLoader = new PromptLoader();
    // Use default model or specified one
    this.model = config.model || '';
    this.debug = config.debug || false;
  }

  async research(request: ResearchRequest, onProgress?: (message: string) => void): Promise<string> {
    onProgress?.(`🔍 Starting research on ${request.companyName} (${request.ticker})...`);
    
    // Create a temp directory for this run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Use app data directory for temp files
    const tempBaseDir = app.isPackaged 
      ? join(app.getPath('userData'), 'temp')
      : join(__dirname, '../../../temp');
    
    const tempDir = join(tempBaseDir, `${request.ticker}-research-${timestamp}`);
    await mkdir(tempDir, { recursive: true });
    onProgress?.(`📁 Temp directory: ${tempDir}`);
    
    // Load the research prompt template
    const promptTemplate = this.promptLoader.loadPrompt('prompt-research-stock');
    
    // Get current date in readable format
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Fill in the template with the provided values
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      companyName: request.companyName,
      ticker: request.ticker,
      currentDate: currentDate,
      tempDir: tempDir,
    });

    // Create a new thread for this research with temp directory as working directory
    const thread = this.codex.startThread({
      ...(this.model && { model: this.model }),
      workingDirectory: tempDir,
      skipGitRepoCheck: true,
      sandboxMode: 'danger-full-access',
    });
    
    // Store the thread
    this.threads.set(`research-${request.ticker}`, thread);

    onProgress?.('Running research...');
    
    try {
      // Run the research prompt with streaming
      const { events } = await thread.runStreamed(prompt);
      
      let finalResponse = '';
      let hasResponse = false;
      
      for await (const event of events) {
        switch (event.type) {
          case 'item.started':
            if (event.item.type === 'web_search') {
              onProgress?.(`🔎 Searching: ${event.item.query}`);
            } else if (event.item.type === 'reasoning') {
              onProgress?.(`💭 Agent is thinking...`);
            } else if (event.item.type === 'command_execution') {
              onProgress?.(`⚙️ Executing command: ${event.item.command}`);
            } else if (this.debug) {
              onProgress?.(`⚙️ Item started: ${event.item.type}`);
            }
            break;
          case 'item.updated':
          case 'item.completed':
            if (event.item.type === 'agent_message') {
              finalResponse = event.item.text;
              hasResponse = true;
            }
            // Show progress for other item types
            if (event.item.type === 'todo_list') {
              const todos = event.item.items.map((t, i) => 
                `${i + 1}. [${t.completed ? '✓' : ' '}] ${t.text}`
              ).join('\n     ');
              onProgress?.(`📋 Plan:\n     ${todos}`);
            } else if (event.item.type === 'reasoning') {
              // Display thinking/chain of thought when completed
              if (event.type === 'item.completed') {
                onProgress?.(`💭 Thinking: ${event.item.text.substring(0, 150)}...`);
              }
            }
            break;
          case 'turn.completed':
            onProgress?.(`✅ Research completed!`);
            if (event.usage) {
              onProgress?.(`Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`);
            }
            break;
          case 'turn.failed':
            throw new Error(`Research failed: ${event.error.message}`);
        }
      }
      
      if (!hasResponse || !finalResponse) {
        throw new Error('No response generated from research. The agent may need a different prompt or model configuration.');
      }
      
      return finalResponse;
    } catch (error) {
      throw new Error(`Research failed: ${(error as Error).message}`);
    }
  }

  async reevaluate(request: ResearchRequest, existingReport: string, onProgress?: (message: string) => void): Promise<string> {
    onProgress?.(`🔄 Starting reevaluation of ${request.companyName} (${request.ticker})...`);
    
    // Create a temp directory for this run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Use app data directory for temp files
    const tempBaseDir = app.isPackaged 
      ? join(app.getPath('userData'), 'temp')
      : join(__dirname, '../../../temp');
    
    const tempDir = join(tempBaseDir, `${request.ticker}-reevaluate-${timestamp}`);
    await mkdir(tempDir, { recursive: true });
    onProgress?.(`📁 Temp directory: ${tempDir}`);
    
    // Load the reevaluation prompt template
    const promptTemplate = this.promptLoader.loadPrompt('prompt-reevaluate-stock');
    
    // Get current date in readable format
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (this.debug) {
      onProgress?.('📝 Preparing reevaluation prompt with existing report...');
      onProgress?.(`Report length: ${existingReport.length} characters`);
    }
    
    // Fill in the template with the provided values
    const prompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      companyName: request.companyName,
      ticker: request.ticker,
      currentDate: currentDate,
      reportContent: existingReport,
      tempDir: tempDir,
    });

    if (this.debug) {
      onProgress?.(`Final prompt length: ${prompt.length} characters`);
      onProgress?.('🚀 Creating thread and starting reevaluation...');
    }

    // Create a new thread for this reevaluation with temp directory as working directory
    const thread = this.codex.startThread({
      ...(this.model && { model: this.model }),
      workingDirectory: tempDir,
      skipGitRepoCheck: true,
      sandboxMode: 'danger-full-access',
    });
    
    // Store the thread
    this.threads.set(`reevaluation-${request.ticker}`, thread);

    onProgress?.('Running reevaluation...');
    
    try {
      // Run the reevaluation prompt with streaming
      const { events } = await thread.runStreamed(prompt);
      
      let finalResponse = '';
      let hasResponse = false;
      let eventCount = 0;
      
      for await (const event of events) {
        eventCount++;
        
        if (this.debug && eventCount <= 10) {
          onProgress?.(`[Event ${eventCount}] ${event.type}`);
        }
        
        switch (event.type) {
          case 'item.started':
            if (event.item.type === 'web_search') {
              onProgress?.(`🔎 Searching: ${event.item.query}`);
            } else if (event.item.type === 'reasoning') {
              onProgress?.(`💭 Agent is thinking...`);
            } else if (event.item.type === 'command_execution') {
              onProgress?.(`⚙️ Executing command: ${event.item.command}`);
            } else if (this.debug) {
              onProgress?.(`⚙️ Item started: ${event.item.type}`);
            }
            break;
          case 'item.updated':
          case 'item.completed':
            if (event.item.type === 'agent_message') {
              finalResponse = event.item.text;
              hasResponse = true;
            }
            // Show progress
            if (event.item.type === 'web_search' && event.type === 'item.completed') {
              onProgress?.(`✓ Search completed`);
            } else if (event.item.type === 'todo_list') {
              const todos = event.item.items.map((t, i) => 
                `${i + 1}. [${t.completed ? '✓' : ' '}] ${t.text}`
              ).join('\n     ');
              onProgress?.(`📋 Plan:\n     ${todos}`);
            } else if (event.item.type === 'reasoning' && event.type === 'item.completed') {
              // Display thinking/chain of thought when completed
              const thinkingSummary = event.item.text.substring(0, 150);
              onProgress?.(`💭 ${thinkingSummary}${event.item.text.length > 150 ? '...' : ''}`);
            }
            break;
          case 'turn.completed':
            onProgress?.(`✅ Reevaluation completed!`);
            if (event.usage) {
              onProgress?.(`Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`);
            }
            break;
          case 'turn.failed':
            throw new Error(`Reevaluation failed: ${event.error.message}`);
        }
      }
      
      if (!hasResponse || !finalResponse) {
        throw new Error('No response generated from reevaluation. The agent may need a different prompt or model configuration.');
      }
      
      return finalResponse;
    } catch (error) {
      throw new Error(`Reevaluation failed: ${(error as Error).message}`);
    }
  }

  async chat(ticker: string, message: string, reportContent?: string, onProgress?: (message: string) => void, onStream?: (text: string) => void): Promise<string> {
    // Check if there's an existing thread for this ticker
    let thread = this.threads.get(`chat-${ticker}`);
    let tempDir: string | undefined;
    
    if (!thread) {
      // Create a temp directory for this chat session
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      
      // Use app data directory for temp files
      const tempBaseDir = app.isPackaged 
        ? join(app.getPath('userData'), 'temp')
        : join(__dirname, '../../../temp');
      
      tempDir = join(tempBaseDir, `${ticker}-chat-${timestamp}`);
      await mkdir(tempDir, { recursive: true });
      
      // Create a new thread for chatting about this stock
      onProgress?.(`💬 Starting new chat thread about ${ticker}...`);
      onProgress?.(`📁 Temp directory: ${tempDir}`);
      
      thread = this.codex.startThread({
        ...(this.model && { model: this.model }),
        workingDirectory: tempDir,
        skipGitRepoCheck: true,
        sandboxMode: 'danger-full-access',
      });
      this.threads.set(`chat-${ticker}`, thread);
      
      // Get current date in readable format
      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Set initial context with report if provided
      let contextMessage = `Today's date is ${currentDate}.

I want to chat about the stock ${ticker}. Please help me understand this stock and answer my questions about it. Be conversational but informative. You can search the web for current information.`;
      
      if (reportContent) {
        contextMessage = `Today's date is ${currentDate}.

I have a research report about ${ticker}. Here's the report:

${reportContent}

Based on this report, please help me understand the stock better and answer my questions. Reference specific parts of the report when relevant, and feel free to search for more current information if needed.`;
      }
      
      await thread.run(contextMessage);
    }

    // Run the user's message
    const { events } = await thread.runStreamed(message);
    
    let finalResponse = '';
    
    for await (const event of events) {
      switch (event.type) {
        case 'item.started':
          if (event.item.type === 'web_search') {
            onProgress?.(`🔎 Searching: ${event.item.query}...`);
          }
          break;
        case 'item.updated':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
            // Stream partial response as it's being generated
            onStream?.(event.item.text);
          }
          break;
        case 'item.completed':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
            // Final response update
            onStream?.(event.item.text);
          } else if (event.item.type === 'web_search') {
            onProgress?.('Search completed');
          }
          break;
        case 'turn.failed':
          throw new Error(`Chat failed: ${event.error.message}`);
      }
    }
    
    return finalResponse;
  }

  async updateReport(ticker: string, onProgress?: (message: string) => void): Promise<string> {
    // Get the existing chat thread for this ticker
    const thread = this.threads.get(`chat-${ticker}`);
    
    if (!thread) {
      throw new Error(`No active chat session found for ${ticker}. Start a chat first before updating the report.`);
    }

    // Ask the thread to generate an updated comprehensive report
    const updatePrompt = `Based on our conversation so far, please generate a comprehensive updated research report about ${ticker}. 

The report should:
- Incorporate all the insights and information we've discussed
- Include any new information you've found during our conversation
- Be well-structured with clear sections
- Maintain a professional, analytical tone
- Include specific data points, metrics, and analysis

Please provide the complete updated report now.`;

    const { events } = await thread.runStreamed(updatePrompt);
    
    let finalResponse = '';
    
    for await (const event of events) {
      switch (event.type) {
        case 'item.started':
          if (event.item.type === 'web_search') {
            onProgress?.(`🔎 Searching: ${event.item.query}...`);
          }
          break;
        case 'item.updated':
        case 'item.completed':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
          } else if (event.item.type === 'web_search') {
            onProgress?.('Search completed');
          }
          break;
        case 'turn.failed':
          throw new Error(`Report update failed: ${event.error.message}`);
      }
    }
    
    if (!finalResponse) {
      throw new Error('No updated report generated. Please try again.');
    }
    
    return finalResponse;
  }

  getThreadId(key: string): string | null {
    const thread = this.threads.get(key);
    return thread?.id || null;
  }

  async cleanup(): Promise<void> {
    // Clear thread references
    this.threads.clear();
  }
}
