import { Codex, type Thread } from "@openai/codex-sdk";
import { PromptLoader } from "../../utils/promptLoader";
import { getCodexBinaryPath } from "../../utils/codexBinary";
import type { App } from "electron";
import { join } from "path";
import { mkdir } from "fs/promises";
import {
  AlphaVantageService,
  type AlphaVantageQuote,
} from "../alphaVantageService";

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
    // Get the correct codex binary path (bundled or system)
    const codexPath = getCodexBinaryPath();
    console.log(`🔧 BaseAgent: Initializing Codex SDK with binary at: ${codexPath}`);
    
    this.codex = new Codex({
      ...(config.apiKey && { apiKey: config.apiKey }),
      codexPathOverride: codexPath
    });
    this.promptLoader = new PromptLoader(app);
    this.model = config.model || "";
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
  protected async createWorkingDirectory(
    ticker: string,
    suffix: string,
  ): Promise<string> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    // Use app data directory for temp files
    const tempBaseDir = this.app.isPackaged
      ? join(this.app.getPath("userData"), "temp")
      : join(this.app.getAppPath(), "temp");

    const tempDir = join(tempBaseDir, `${ticker}-${suffix}-${timestamp}`);
    await mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Get current date in readable format
   */
  protected getCurrentDate(): string {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * Fetch stock data from Alpha Vantage
   */
  protected async getMarketData(
    ticker: string,
    onProgress?: AgentProgress,
  ): Promise<AlphaVantageQuote | null> {
    try {
      if (!AlphaVantageService.hasApiKey()) {
        onProgress?.(
          `⚠️ Alpha Vantage API key not configured - market data unavailable`,
        );
        return null;
      }

      const quote = await AlphaVantageService.getQuote(ticker);
      if (!quote) {
        onProgress?.(`⚠️ Market data not available for ${ticker}`);
      } else {
        onProgress?.(
          `✓ Market data retrieved: $${quote.currentPrice.toFixed(2)}`,
        );
      }
      return quote;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      onProgress?.(`❌ Failed to fetch market data: ${errorMsg}`);
      console.error(`Failed to fetch market data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Format market data as markdown for inclusion in prompts
   */
  protected formatMarketData(quote: AlphaVantageQuote | null): string {
    if (!quote) {
      return "**Market Data**: Not available at this time.";
    }
    return AlphaVantageService.formatQuoteMarkdown(quote);
  }

  /**
   * Create a new thread for agent execution
   */
  protected createThread(workingDirectory: string): Thread {
    const thread = this.codex.startThread({
      ...(this.model && { model: this.model }),
      workingDirectory,
      skipGitRepoCheck: true,
      sandboxMode: "danger-full-access",
    });
    this.thread = thread;
    return thread;
  }

  /**
   * Process streaming events from the thread
   */
  protected async processEvents(
    events: AsyncIterable<any>,
    onProgress?: AgentProgress,
  ): Promise<{
    response: string;
    usage?: { input_tokens: number; output_tokens: number };
  }> {
    return await this.processEventsWithStreaming(events, onProgress);
  }

  /**
   * Process streaming events with optional streaming callback
   */
  protected async processEventsWithStreaming(
    events: AsyncIterable<any>,
    onProgress?: AgentProgress,
    onStream?: (text: string) => void,
  ): Promise<{
    response: string;
    usage?: { input_tokens: number; output_tokens: number };
  }> {
    let finalResponse = "";
    let hasResponse = false;
    let eventCount = 0;
    let usage: { input_tokens: number; output_tokens: number } | undefined;

    for await (const event of events) {
      eventCount++;

      if (this.debug && eventCount <= 10) {
        console.log(`   [Event ${eventCount}] ${event.type}`);
      }

      switch (event.type) {
        case "item.started":
          this.handleItemStarted(event, onProgress);
          break;
        case "item.updated":
          if (event.item.type === "agent_message") {
            finalResponse = event.item.text;
            hasResponse = true;
            // Stream partial response if callback provided
            onStream?.(event.item.text);
          }
          break;
        case "item.completed":
          if (event.item.type === "agent_message") {
            finalResponse = event.item.text;
            hasResponse = true;
            // Stream final response if callback provided
            onStream?.(event.item.text);
          }
          this.handleItemUpdatedOrCompleted(event, onProgress);
          break;
        case "turn.completed":
          onProgress?.(`✅ Task completed!`);
          if (event.usage) {
            usage = {
              input_tokens: event.usage.input_tokens,
              output_tokens: event.usage.output_tokens,
            };
            onProgress?.(
              `📊 Tokens: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`,
            );
          }
          break;
        case "turn.failed":
          throw new Error(`Task failed: ${event.error.message}`);
      }
    }

    if (!hasResponse || !finalResponse) {
      throw new Error(
        "No response generated. The agent may need a different prompt or model configuration.",
      );
    }

    return { response: finalResponse, usage };
  }

  /**
   * Handle item started events
   */
  protected handleItemStarted(event: any, onProgress?: AgentProgress): void {
    if (event.item.type === "web_search") {
      onProgress?.(`🔎 Searching: ${event.item.query}`);
    } else if (event.item.type === "reasoning") {
      onProgress?.(`💭 Agent is thinking...`);
    } else if (event.item.type === "command_execution") {
      onProgress?.(`⚙️ Executing: ${event.item.command}`);
    } else if (event.item.type === "file_read") {
      onProgress?.(`📖 Reading file: ${event.item.path}`);
    } else if (event.item.type === "file_write") {
      onProgress?.(`📝 Writing file: ${event.item.path}`);
    } else if (event.item.type === "file_edit") {
      onProgress?.(`✏️ Editing file: ${event.item.path}`);
    } else if (event.item.type === "directory_list") {
      onProgress?.(`📂 Listing directory: ${event.item.path}`);
    } else if (event.item.type === "bash") {
      onProgress?.(
        `🐚 Running bash: ${event.item.command || event.item.script}`,
      );
    } else if (this.debug) {
      onProgress?.(`⚙️ Item started: ${event.item.type}`);
    }
  }

  /**
   * Handle item updated or completed events
   */
  protected handleItemUpdatedOrCompleted(
    event: any,
    onProgress?: AgentProgress,
  ): void {
    if (event.type === "item.completed") {
      if (event.item.type === "web_search") {
        const resultCount = event.item.results?.length || 0;
        onProgress?.(`✓ Search completed (${resultCount} results)`);
      } else if (event.item.type === "todo_list") {
        const todos = event.item.items
          .map(
            (t: any, i: number) =>
              `${i + 1}. [${t.completed ? "✓" : " "}] ${t.text}`,
          )
          .join("\n     ");
        onProgress?.(`📋 Plan:\n     ${todos}`);
      } else if (event.item.type === "reasoning") {
        const thinkingSummary = event.item.text.substring(0, 150);
        onProgress?.(
          `💭 ${thinkingSummary}${event.item.text.length > 150 ? "..." : ""}`,
        );
      } else if (event.item.type === "command_execution") {
        const exitCode =
          event.item.exit_code !== undefined
            ? ` (exit ${event.item.exit_code})`
            : "";
        onProgress?.(`✓ Command completed${exitCode}`);
        if (event.item.stdout && event.item.stdout.trim()) {
          const output = event.item.stdout.trim().substring(0, 200);
          onProgress?.(
            `   Output: ${output}${event.item.stdout.length > 200 ? "..." : ""}`,
          );
        }
        if (event.item.stderr && event.item.stderr.trim()) {
          onProgress?.(
            `   ⚠️ Error: ${event.item.stderr.trim().substring(0, 200)}`,
          );
        }
      } else if (event.item.type === "bash") {
        const exitCode =
          event.item.exit_code !== undefined
            ? ` (exit ${event.item.exit_code})`
            : "";
        onProgress?.(`✓ Bash completed${exitCode}`);
        if (event.item.output && event.item.output.trim()) {
          const output = event.item.output.trim().substring(0, 200);
          onProgress?.(
            `   Output: ${output}${event.item.output.length > 200 ? "..." : ""}`,
          );
        }
      } else if (event.item.type === "file_write") {
        const size = event.item.size ? ` (${event.item.size} bytes)` : "";
        onProgress?.(`✓ File written${size}: ${event.item.path}`);
      } else if (event.item.type === "file_read") {
        const size = event.item.content?.length
          ? ` (${event.item.content.length} bytes)`
          : "";
        onProgress?.(`✓ File read${size}: ${event.item.path}`);
      } else if (event.item.type === "file_edit") {
        onProgress?.(`✓ File edited: ${event.item.path}`);
      } else if (event.item.type === "directory_list") {
        const count = event.item.entries?.length || 0;
        onProgress?.(
          `✓ Directory listed (${count} entries): ${event.item.path}`,
        );
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
