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
      
      // Load the chat prompt template
      const promptTemplate = this.promptLoader.loadPrompt('prompt-chat-stock');
      
      // Prepare template variables
      const templateVars: Record<string, string> = {
        currentDate: currentDate,
        ticker: ticker,
        companyName: ticker, // Default to ticker, could be enhanced with actual company name
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

      // Fill in the template with the provided values
      const contextMessage = this.promptLoader.fillTemplate(promptTemplate.content, templateVars);
      
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

  async updateReport(ticker: string, chatHistory?: Array<{role: string, content: string, timestamp: string}>, onProgress?: (message: string) => void): Promise<string> {
    console.log(`\n🔄 [DEBUG] Starting updateReport for ticker: ${ticker}`);
    console.log(`💬 [DEBUG] Chat history provided: ${chatHistory ? chatHistory.length : 0} messages`);
    onProgress?.(`updating ${ticker} report`);
    
    // Always create a fresh thread for report updates to avoid thread management issues
    console.log(`🔧 [DEBUG] Creating fresh thread for report update...`);
    onProgress?.(`Creating fresh research session...`);
    
    let thread: Thread | undefined;
    
    // Create a temp directory for this update session
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Use app data directory for temp files
    const tempBaseDir = app.isPackaged 
      ? join(app.getPath('userData'), 'temp')
      : join(__dirname, '../../../temp');
    
    const tempDir = join(tempBaseDir, `${ticker}-update-${timestamp}`);
    await mkdir(tempDir, { recursive: true });
    
    console.log(`📁 [DEBUG] Created temp directory: ${tempDir}`);
    onProgress?.(`Setting up research environment...`);
    
    // Create a new thread for this update session
    console.log(`🔧 [DEBUG] Creating thread for one-shot update...`);
    try {
      thread = this.codex.startThread({
        ...(this.model && { model: this.model }),
        workingDirectory: tempDir,
        skipGitRepoCheck: true,
        sandboxMode: 'danger-full-access',
      });
      
      console.log(`✅ [DEBUG] Thread created successfully`);
      onProgress?.(`Connected to AI research agent...`);
    } catch (threadError) {
      const errorMsg = `Thread creation failed: ${threadError instanceof Error ? threadError.message : 'Unknown error'}`;
      console.error(`❌ [DEBUG] ${errorMsg}`, threadError);
      onProgress?.(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    if (!thread) {
      throw new Error('Thread creation failed - thread is null');
    }

    console.log(`✅ [DEBUG] Thread ready for ${ticker}, thread ID: ${thread?.id || 'undefined'}`);
    onProgress?.(`Generating updated research report...`);

    // Build the chat history section if available
    let chatHistorySection = '';
    if (chatHistory && chatHistory.length > 0) {
      chatHistorySection = `## Chat Conversation History

The following is our complete conversation about ${ticker}:

---
`;
      
      chatHistory.forEach((message) => {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        const timestamp = new Date(message.timestamp).toLocaleString();
        chatHistorySection += `**${role}** (${timestamp}):\n${message.content}\n\n---\n`;
      });
      
      chatHistorySection += `\n`;
    }

    // Load the update report prompt template
    const promptTemplate = this.promptLoader.loadPrompt('prompt-update-report');
    
    // Get current date in readable format
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Fill in the template with the provided values
    const updatePrompt = this.promptLoader.fillTemplate(promptTemplate.content, {
      ticker: ticker,
      currentDate: currentDate,
      tempDir: './temp',
      chatHistorySection: chatHistorySection
    });

    console.log(`📝 [DEBUG] Sending update prompt to thread (${updatePrompt.length} characters)`);
    onProgress?.(`Starting research analysis...`);

    try {
      console.log(`🚀 [DEBUG] Starting thread.runStreamed with prompt length: ${updatePrompt.length}`);
      const { events } = await thread.runStreamed(updatePrompt);
    
    let finalResponse = '';
      let eventCount = 0;
      let hasResponse = false;
      
      console.log(`🚀 [DEBUG] Starting to process events...`);
      onProgress?.(`🚀 [DEBUG] Starting to process events...`);
    
    for await (const event of events) {
        eventCount++;
        
        if (this.debug) {
          console.log(`📊 [DEBUG] Event ${eventCount}: ${event.type}`);
        }
        
      switch (event.type) {
        case 'item.started':
          if (event.item.type === 'web_search') {
              const searchMsg = `🔎 Searching: ${event.item.query}...`;
              console.log(`  ${searchMsg}`);
              onProgress?.(searchMsg);
            } else if (event.item.type === 'reasoning') {
              console.log(`  💭 [DEBUG] Agent is thinking...`);
              onProgress?.(`Analyzing data...`);
            } else if (event.item.type === 'command_execution') {
              console.log(`  ⚙️  [DEBUG] Executing command: ${event.item.command}`);
              onProgress?.(`Processing information...`);
            } else if (this.debug) {
              console.log(`  ⚙️  [DEBUG] Item started: ${event.item.type}`);
              onProgress?.(`Processing ${event.item.type}...`);
          }
          break;
        case 'item.updated':
        case 'item.completed':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
              hasResponse = true;
              console.log(`📄 [DEBUG] Agent message ${event.type}: ${finalResponse.length} characters`);
              onProgress?.(`Report generation in progress...`);
            } else if (event.item.type === 'web_search' && event.type === 'item.completed') {
              console.log(`  ✅ [DEBUG] Search completed`);
            onProgress?.('Search completed');
            } else if (event.item.type === 'reasoning' && event.type === 'item.completed') {
              console.log(`  💭 [DEBUG] Thinking completed: ${event.item.text.substring(0, 100)}...`);
              onProgress?.(`Analysis completed`);
            }
            break;
          case 'turn.completed':
            console.log(`✅ [DEBUG] Turn completed successfully!`);
            onProgress?.(`Report generation completed`);
            if (event.usage) {
              console.log(`   📊 [DEBUG] Token usage: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`);
          }
          break;
        case 'turn.failed':
            const errorMsg = `Report update failed: ${event.error.message}`;
            console.error(`❌ [DEBUG] ${errorMsg}`);
            onProgress?.(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
      }
      
      console.log(`📊 [DEBUG] Processed ${eventCount} events total`);
      console.log(`📄 [DEBUG] Final response: ${hasResponse ? 'RECEIVED' : 'MISSING'} (${finalResponse.length} chars)`);
      onProgress?.(`Finalizing report...`);
      
      if (!hasResponse || !finalResponse) {
        const errorMsg = 'No updated report generated. Please try again.';
        console.error(`❌ [DEBUG] ${errorMsg}`);
        onProgress?.(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`✅ [DEBUG] updateReport completed successfully for ${ticker}`);
      onProgress?.(`Report update completed successfully`);
      return finalResponse;
    } catch (error) {
      console.error(`❌ [DEBUG] updateReport failed for ${ticker}:`, error);
      onProgress?.(`❌ Report update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      // Clean up the temporary thread
      if (thread) {
        try {
          console.log(`🧹 [DEBUG] Cleaning up temporary thread for ${ticker}`);
          // Note: We don't store this thread in the threads map since it's temporary
        } catch (cleanupError) {
          console.log(`⚠️ [DEBUG] Thread cleanup warning: ${cleanupError}`);
        }
      }
    }
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
