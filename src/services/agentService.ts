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
    });

    // Create a new thread for this research
    const thread = this.codex.startThread({
      ...(this.model && { model: this.model }),
      workingDirectory: process.cwd(),
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
    });

    if (this.debug) {
      console.log(`   Final prompt length: ${prompt.length} characters`);
      console.log('🚀 Creating thread and starting reevaluation...');
    }

    // Create a new thread for this reevaluation
    const thread = this.codex.startThread({
      ...(this.model && { model: this.model }),
      workingDirectory: process.cwd(),
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
    
    if (!thread) {
      // Create a new thread for chatting about this stock
      console.log(`\n💬 Starting new chat thread about ${ticker}...`);
      thread = this.codex.startThread({
        ...(this.model && { model: this.model }),
        workingDirectory: process.cwd(),
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

  async updateReport(ticker: string): Promise<string> {
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
