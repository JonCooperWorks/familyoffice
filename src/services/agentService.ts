import { Codex, type Thread } from '@openai/codex-sdk';
import { PromptLoader } from '../utils/promptLoader.js';

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
    // Codex SDK automatically uses your CLI authentication!
    // No API key needed if you're signed in with `codex` CLI
    this.codex = new Codex(config.apiKey ? { apiKey: config.apiKey } : {});
    this.promptLoader = new PromptLoader();
    // Use default model or specified one
    this.model = config.model || '';
    this.debug = config.debug || false;
  }

  async research(request: ResearchRequest): Promise<string> {
    console.log(`\n🔍 Starting research on ${request.companyName} (${request.ticker})...\n`);
    
    // Create a temp directory for this run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const tempDir = `./temp/${request.ticker}-research-${timestamp}`;
    const fs = await import('fs/promises');
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`📁 Temp directory: ${tempDir}\n`);
    
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

    console.log('Running research...');
    
    try {
      // Run the research prompt with streaming
      const { events } = await thread.runStreamed(prompt);
      
      let finalResponse = '';
      let hasResponse = false;
      
      for await (const event of events) {
        switch (event.type) {
          case 'item.started':
            if (event.item.type === 'web_search') {
              console.log(`  🔎 Searching: ${event.item.query}`);
            } else if (event.item.type === 'reasoning') {
              console.log(`  💭 Agent is thinking...`);
            } else if (event.item.type === 'command_execution') {
              console.log(`  ⚙️  Executing command: ${event.item.command}`);
            } else if (this.debug) {
              console.log(`  ⚙️  Item started: ${event.item.type}`);
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
              console.log(`  📋 Plan:\n     ${todos}`);
            } else if (event.item.type === 'reasoning') {
              // Display thinking/chain of thought when completed
              if (event.type === 'item.completed') {
                console.log(`  💭 Thinking: ${event.item.text.substring(0, 150)}...`);
              }
            }
            break;
          case 'turn.completed':
            console.log(`\n✅ Research completed!`);
            if (event.usage) {
              console.log(`   Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out\n`);
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

  async reevaluate(request: ResearchRequest, existingReport: string): Promise<string> {
    console.log(`\n🔄 Starting reevaluation of ${request.companyName} (${request.ticker})...\n`);
    
    // Create a temp directory for this run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const tempDir = `./temp/${request.ticker}-reevaluate-${timestamp}`;
    const fs = await import('fs/promises');
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`📁 Temp directory: ${tempDir}\n`);
    
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
      console.log('📝 Preparing reevaluation prompt with existing report...');
      console.log(`   Report length: ${existingReport.length} characters`);
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
      console.log(`   Final prompt length: ${prompt.length} characters`);
      console.log('🚀 Creating thread and starting reevaluation...');
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

    console.log('Running reevaluation...\n');
    
    try {
      // Run the reevaluation prompt with streaming
      const { events } = await thread.runStreamed(prompt);
      
      let finalResponse = '';
      let hasResponse = false;
      let eventCount = 0;
      
      for await (const event of events) {
        eventCount++;
        
        if (this.debug && eventCount <= 10) {
          console.log(`   [Event ${eventCount}] ${event.type}`);
        }
        
        switch (event.type) {
          case 'item.started':
            if (event.item.type === 'web_search') {
              console.log(`  🔎 Searching: ${event.item.query}`);
            } else if (event.item.type === 'reasoning') {
              console.log(`  💭 Agent is thinking...`);
            } else if (event.item.type === 'command_execution') {
              console.log(`  ⚙️  Executing command: ${event.item.command}`);
            } else if (this.debug) {
              console.log(`  ⚙️  Item started: ${event.item.type}`);
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
              console.log(`  ✓ Search completed`);
            } else if (event.item.type === 'todo_list') {
              const todos = event.item.items.map((t, i) => 
                `${i + 1}. [${t.completed ? '✓' : ' '}] ${t.text}`
              ).join('\n     ');
              console.log(`  📋 Plan:\n     ${todos}`);
            } else if (event.item.type === 'reasoning' && event.type === 'item.completed') {
              // Display thinking/chain of thought when completed
              const thinkingSummary = event.item.text.substring(0, 150);
              console.log(`  💭 ${thinkingSummary}${event.item.text.length > 150 ? '...' : ''}`);
            }
            break;
          case 'turn.completed':
            console.log(`\n✅ Reevaluation completed!`);
            if (event.usage) {
              console.log(`   Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out\n`);
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

  async chat(ticker: string, message: string, reportContent?: string): Promise<string> {
    // Check if there's an existing thread for this ticker
    let thread = this.threads.get(`chat-${ticker}`);
    let tempDir: string | undefined;
    
    if (!thread) {
      // Create a temp directory for this chat session
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      tempDir = `./temp/${ticker}-chat-${timestamp}`;
      const fs = await import('fs/promises');
      await fs.mkdir(tempDir, { recursive: true });
      
      // Create a new thread for chatting about this stock
      console.log(`\n💬 Starting new chat thread about ${ticker}...`);
      console.log(`📁 Temp directory: ${tempDir}\n`);
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
        case 'item.updated':
        case 'item.completed':
          if (event.item.type === 'agent_message') {
            finalResponse = event.item.text;
          } else if (event.item.type === 'web_search') {
            process.stdout.write(`  🔎 Searching: ${event.item.query}...`);
          }
          break;
        case 'item.completed':
          if (event.item.type === 'web_search') {
            process.stdout.write(' Done\n');
          }
          break;
        case 'turn.failed':
          throw new Error(`Chat failed: ${event.error.message}`);
      }
    }
    
    return finalResponse;
  }

  async updateReport(ticker: string, chatHistory?: Array<{role: string, content: string, timestamp: string}>): Promise<string> {
    console.log(`\nupdating ${ticker} report`);
    console.log(`💬 [DEBUG] Chat history provided: ${chatHistory ? chatHistory.length : 0} messages`);
    
    // Always create a fresh thread for report updates to avoid thread management issues
    console.log(`🔧 [DEBUG] Creating fresh thread for report update...`);
    
    let thread: Thread | undefined;
    
    try {
      // Create a temp directory for this update session
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const tempDir = `./temp/${ticker}-update-${timestamp}`;
      const fs = await import('fs/promises');
      await fs.mkdir(tempDir, { recursive: true });
      
      console.log(`📁 [DEBUG] Created temp directory: ${tempDir}`);
      
      // Create a new thread for this update session
      thread = this.codex.startThread({
        ...(this.model && { model: this.model }),
        workingDirectory: tempDir,
        skipGitRepoCheck: true,
        sandboxMode: 'danger-full-access',
      });
      
      if (!thread || !thread.id) {
        const errorMsg = `Failed to create AI thread for ${ticker}. Please check your Codex authentication.`;
        console.error(`❌ [DEBUG] ${errorMsg} - Thread object:`, thread);
        throw new Error(errorMsg);
      }
      
      console.log(`✅ [DEBUG] Created fresh thread for ${ticker}, thread ID: ${thread.id}`);
      
    } catch (error) {
      const errorMsg = `Failed to create AI thread: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ [DEBUG] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`✅ [DEBUG] Thread ready for ${ticker}, thread ID: ${thread.id}`);

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

    try {
      const { events } = await thread.runStreamed(updatePrompt);
      
      let finalResponse = '';
      let eventCount = 0;
      let hasResponse = false;
      
      console.log(`🚀 [DEBUG] Starting to process events...`);
      
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
              process.stdout.write(`  ${searchMsg}`);
            } else if (event.item.type === 'reasoning') {
              console.log(`  💭 [DEBUG] Agent is thinking...`);
            } else if (event.item.type === 'command_execution') {
              console.log(`  ⚙️  [DEBUG] Executing command: ${event.item.command}`);
            } else if (this.debug) {
              console.log(`  ⚙️  [DEBUG] Item started: ${event.item.type}`);
            }
            break;
          case 'item.updated':
          case 'item.completed':
            if (event.item.type === 'agent_message') {
              finalResponse = event.item.text;
              hasResponse = true;
              console.log(`📄 [DEBUG] Agent message ${event.type}: ${finalResponse.length} characters`);
            } else if (event.item.type === 'web_search' && event.type === 'item.completed') {
              console.log(`  ✅ [DEBUG] Search completed`);
              process.stdout.write(' Done\n');
            } else if (event.item.type === 'reasoning' && event.type === 'item.completed') {
              console.log(`  💭 [DEBUG] Thinking completed: ${event.item.text.substring(0, 100)}...`);
            }
            break;
          case 'turn.completed':
            console.log(`✅ [DEBUG] Turn completed successfully!`);
            if (event.usage) {
              console.log(`   📊 [DEBUG] Token usage: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`);
            }
            break;
          case 'turn.failed':
            const errorMsg = `Report update failed: ${event.error.message}`;
            console.error(`❌ [DEBUG] ${errorMsg}`);
            throw new Error(errorMsg);
        }
      }
      
      console.log(`📊 [DEBUG] Processed ${eventCount} events total`);
      console.log(`📄 [DEBUG] Final response: ${hasResponse ? 'RECEIVED' : 'MISSING'} (${finalResponse.length} chars)`);
      
      if (!hasResponse || !finalResponse) {
        const errorMsg = 'No updated report generated. Please try again.';
        console.error(`❌ [DEBUG] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`✅ [DEBUG] updateReport completed successfully for ${ticker}`);
      return finalResponse;
    } catch (error) {
      console.error(`❌ [DEBUG] updateReport failed for ${ticker}:`, error);
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
