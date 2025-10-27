# Codex Config.toml Management

This document explains how the application now manages the `~/.codex/config.toml` file to automatically configure the Alpha Vantage MCP server.

## Overview

The application now automatically manages the Alpha Vantage MCP server configuration in `~/.codex/config.toml`. When you provide an Alpha Vantage API key, the app will:

1. Save it to the local `settings.json` file (as before)
2. **NEW:** Automatically add/update the Alpha Vantage MCP server configuration in `~/.codex/config.toml`

## Implementation

### New Utility Module: `src/utils/codexConfig.ts`

This module provides functions to read, parse, and update the Codex configuration file:

#### Functions

- **`readCodexConfig()`**: Reads and parses the `~/.codex/config.toml` file
- **`writeCodexConfig(config)`**: Writes the config back to `~/.codex/config.toml`
- **`hasAlphaVantageMcpServer()`**: Checks if the Alpha Vantage MCP server is already configured
- **`setAlphaVantageMcpServer(apiKey)`**: Adds or updates the Alpha Vantage MCP server configuration
- **`removeAlphaVantageMcpServer()`**: Removes the Alpha Vantage MCP server configuration

### Integration with Main Process

The `src/main/index.ts` file has been updated to automatically manage the Codex config:

#### On Startup (`loadAlphaVantageApiKey`)

When the app starts, it:
1. Loads the API key from `settings.json`
2. Checks if the MCP server is configured in `~/.codex/config.toml`
3. If not configured, automatically adds it
4. If already configured, skips the configuration

#### When Saving API Key (`saveAlphaVantageApiKey`)

When a user provides a new API key:
1. Saves it to `settings.json` (as before)
2. **NEW:** Automatically configures/updates the MCP server in `~/.codex/config.toml`

## TOML Configuration Format

The configuration added to `~/.codex/config.toml` looks like this:

```toml
[mcp_servers.alphavantage]
url = "https://mcp.alphavantage.co/mcp?apikey=YOUR_API_KEY"
```

## Benefits

- **Automatic Configuration**: Users don't need to manually edit the Codex config file
- **Consistency**: The API key is automatically synced between the app and Codex
- **No Manual Steps**: When users provide their API key in the app, it's immediately available to Codex MCP

## Dependencies

Added `@iarna/toml` for TOML file parsing and stringification.

## Testing

You can test the Codex config functionality by running:

```bash
npm run build:electron
node test-codex-config.js
```

This will show the current state of your `~/.codex/config.toml` file and whether the Alpha Vantage MCP server is configured.

## Console Output

When the app runs, you'll see console messages like:

- `✅ Alpha Vantage API key loaded`
- `ℹ️ Configuring Alpha Vantage MCP server in ~/.codex/config.toml`
- `✅ Alpha Vantage MCP server configured in ~/.codex/config.toml`
- `✅ Alpha Vantage MCP server already configured`

## File Locations

- **App Settings**: `~/Library/Application Support/familyoffice/settings.json` (macOS)
- **Codex Config**: `~/.codex/config.toml`

