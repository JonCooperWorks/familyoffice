import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import * as TOML from "@iarna/toml";

const CODEX_CONFIG_PATH = join(homedir(), ".codex", "config.toml");

interface CodexConfig {
  mcp_servers?: {
    [key: string]: {
      url?: string;
      [key: string]: any;
    };
  };
  [key: string]: any;
}

/**
 * Read and parse the ~/.codex/config.toml file
 */
export async function readCodexConfig(): Promise<CodexConfig> {
  try {
    const content = await readFile(CODEX_CONFIG_PATH, "utf-8");
    return TOML.parse(content) as CodexConfig;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File doesn't exist, return empty config
      return {};
    }
    throw error;
  }
}

/**
 * Write the config back to ~/.codex/config.toml
 */
export async function writeCodexConfig(config: CodexConfig): Promise<void> {
  try {
    // Ensure .codex directory exists
    const codexDir = join(homedir(), ".codex");
    await mkdir(codexDir, { recursive: true });

    const content = TOML.stringify(config);
    await writeFile(CODEX_CONFIG_PATH, content, "utf-8");
  } catch (error) {
    console.error("Error writing Codex config:", error);
    throw error;
  }
}

/**
 * Check if the Alpha Vantage MCP server is already configured
 */
export async function hasAlphaVantageMcpServer(): Promise<boolean> {
  try {
    const config = await readCodexConfig();
    return !!(
      config.mcp_servers &&
      config.mcp_servers.alphavantage &&
      config.mcp_servers.alphavantage.url
    );
  } catch (error) {
    console.error("Error checking Alpha Vantage MCP server:", error);
    return false;
  }
}

/**
 * Add or update the Alpha Vantage MCP server configuration
 */
export async function setAlphaVantageMcpServer(
  apiKey: string
): Promise<void> {
  try {
    const config = await readCodexConfig();

    // Initialize mcp_servers if it doesn't exist
    if (!config.mcp_servers) {
      config.mcp_servers = {};
    }

    // Set the Alpha Vantage MCP server
    config.mcp_servers.alphavantage = {
      url: `https://mcp.alphavantage.co/mcp?apikey=${apiKey}`,
    };

    await writeCodexConfig(config);
    console.log("✅ Alpha Vantage MCP server configured in ~/.codex/config.toml");
  } catch (error) {
    console.error("Error setting Alpha Vantage MCP server:", error);
    throw error;
  }
}

/**
 * Remove the Alpha Vantage MCP server configuration
 */
export async function removeAlphaVantageMcpServer(): Promise<void> {
  try {
    const config = await readCodexConfig();

    if (config.mcp_servers && config.mcp_servers.alphavantage) {
      delete config.mcp_servers.alphavantage;
      await writeCodexConfig(config);
      console.log("✅ Alpha Vantage MCP server removed from ~/.codex/config.toml");
    }
  } catch (error) {
    console.error("Error removing Alpha Vantage MCP server:", error);
    throw error;
  }
}

