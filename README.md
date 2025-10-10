# Family Office - AI Stock Research Agent

An AI-powered TypeScript agent that uses **OpenAI Codex** to provide comprehensive stock research and interactive chat capabilities.

> ⚠️ **SECURITY NOTICE**: This agent executes AI-generated commands and searches the web. Always run in Docker for isolation to protect against prompt injection attacks. See [Security](#security) section below.

## Features

- **Research Command**: Generate detailed equity research reports for any stock
- **Chat Command**: Interactive chat interface to ask questions about specific stocks  
- **Thread-based Conversations**: Uses Codex's thread system for context-aware conversations
- **Template-based Prompts**: Easily customizable research prompts stored in markdown files
- **Automatic Authentication**: Uses your existing Codex CLI authentication - no API keys to manage!
- **Docker Isolation**: Complete containerization for security and system protection

## 🐳 Recommended Setup (Docker - Secure & Isolated)

**This is the recommended way to run the agent for security and isolation.**

### Prerequisites

1. **Install Docker Desktop** (if not already installed):
   - macOS: Download from [docker.com](https://docker.com) or `brew install docker`
   - Linux: Follow [Docker installation guide](https://docs.docker.com/engine/install/)
   - Windows: Download Docker Desktop

2. **Install Codex CLI** (if not already installed):
```bash
brew install codex
# or
npm install -g @openai/codex
```

3. **Sign in to Codex**:
```bash
codex
# Then select "Sign in with ChatGPT"
```

### Quick Start

1. **Build the secure container**:
```bash
./scripts/docker-build.sh
```

2. **You're ready!** The container uses your existing Codex authentication automatically and runs in complete isolation.

### Why Docker?

- **🔒 Security**: Protects against prompt injection attacks
- **🏗️ Isolation**: Agent cannot access your host system files
- **🚀 Clean**: No dependencies or files installed on your system
- **📦 Portable**: Identical environment across different machines

## 🚀 Usage (Docker - Recommended)

All commands run in a secure, isolated container that protects your system.

### Research Command (Non-Interactive)

Generate a comprehensive research report for a stock:

```bash
# Basic research
./scripts/docker-run.sh research AAPL

# With company name
./scripts/docker-run.sh research TSLA --company "Tesla Inc."

# With custom output file
./scripts/docker-run.sh research NVDA --output my-nvidia-research.md

# Reevaluate existing report (fact-check and update with current data)
./scripts/docker-run.sh research MSFT --report ./reports/research-MSFT-2024-01-01.md
```

**Output:** Creates a markdown file like `research-AAPL-2025-10-09T14-30-00.md` in your `./reports/` directory.

The research command generates a detailed report including:
- Company overview and business model
- Revenue streams and competitive advantages  
- Investment thesis and valuation analysis
- Key risks (tailwinds and headwinds)
- Exit strategy and price targets
- Sources and citations with current data

### Chat Command (Interactive)

Start an interactive chat about a specific stock:

```bash
# Basic chat
./scripts/docker-run.sh chat AAPL

# Load existing research report for context  
./scripts/docker-run.sh chat AAPL --report ./reports/research-AAPL-2024-10-10.md

# Show help
./scripts/docker-run.sh --help
```

**Smart Features:**
- **Context Awareness**: References specific parts of loaded reports
- **Current Data**: Searches web for latest information  
- **Conversational**: Ask follow-up questions naturally
- **Secure**: All web searches and command execution isolated in container

**Example Questions:**
- "What are the key risks mentioned in the report?"
- "How does the valuation compare to competitors?"
- "What's changed since this report was written?"
- "Should I buy, sell, or hold based on recent developments?"

### Container Management

```bash
# Rebuild container (after code changes)
./scripts/docker-build.sh

# Clean up all Docker resources
./scripts/docker-cleanup.sh

# Debug shell (for troubleshooting)
./scripts/docker-shell.sh
```

## 🔒 Security

### Why Containerization Matters

AI agents like this one can be vulnerable to **prompt injection attacks**, where malicious input could potentially:
- Execute harmful commands on your system
- Access or modify sensitive files  
- Exfiltrate data or install malware
- Compromise your development environment

### Docker Protection

Running in Docker provides multiple layers of security:

- **🏗️ File System Isolation**: Agent cannot access host files outside mounted volumes
- **🌐 Network Isolation**: Dedicated bridge network prevents lateral movement
- **👤 User Isolation**: Runs as non-root user with minimal privileges  
- **💾 Resource Limits**: CPU and memory constraints prevent system exhaustion
- **📝 Read-Only Root**: Container filesystem is immutable at runtime
- **🔍 Audit Trail**: All outputs saved to `./reports/` for review

### Safe Usage Guidelines

1. **Always use Docker** for running the agent (recommended approach above)
2. **Review outputs** in `./reports/` before acting on recommendations
3. **Keep containers updated** by rebuilding regularly
4. **Limit network access** if running in production environments
5. **Monitor resource usage** to detect unusual behavior

## 📋 Advanced Setup (Host Installation - Development Only)

> ⚠️ **WARNING**: Host installation bypasses security isolation. Only use for development or in trusted environments. Production usage should always use Docker.

<details>
<summary>Click to expand host installation instructions</summary>

### Prerequisites
1. Install Codex CLI and sign in (same as Docker setup above)
2. Install project dependencies:
```bash
npm install
```

3. (Optional) Install globally:
```bash
npm link
```

### Usage
```bash
# Direct usage (if installed globally)
familyoffice research AAPL
familyoffice chat TSLA

# Or via npm scripts
npm run research -- AAPL
npm run chat -- --ticker TSLA
```

**Security Note**: This method runs the AI agent directly on your host system with full access to your files and network. Use only in controlled environments.

</details>

## 📁 Project Structure

```
familyoffice/
├── src/
│   ├── cli.ts                    # CLI interface
│   ├── index.ts                  # Main export file  
│   ├── services/
│   │   └── agentService.ts       # Codex SDK agent service
│   └── utils/
│       └── promptLoader.ts       # Prompt template loader
├── prompts/
│   ├── prompt-research-stock.md  # Research prompt template
│   └── prompt-reevaluate-stock.md # Reevaluation template
├── scripts/
│   ├── docker-build.sh          # Container build script
│   ├── docker-run.sh            # Secure container runner
│   ├── docker-shell.sh          # Debug access
│   └── docker-cleanup.sh        # Resource cleanup
├── reports/                     # Generated research outputs
├── logs/                        # Application logs  
├── Dockerfile                   # Container definition
├── docker-compose.yml          # Container orchestration
├── DOCKER.md                   # Detailed container docs
├── package.json
└── tsconfig.json
```

## 🔧 How It Works

This agent uses the **OpenAI Codex SDK** ([https://github.com/openai/codex/tree/main/sdk/typescript](https://github.com/openai/codex/tree/main/sdk/typescript)) which:

1. **Wraps the Codex CLI** - Spawns the `codex` binary and exchanges JSONL events
2. **Uses Your Authentication** - Automatically uses your Codex CLI login (no API keys needed!)
3. **Provides Thread Management** - Maintains conversation context across multiple interactions
4. **Streams Events** - Real-time updates about web searches, thinking, and responses
5. **Isolated Execution** - All operations run safely within Docker container boundaries

### Process Flow

1. **Container Startup** - Docker mounts your Codex authentication and creates isolated environment
2. **Prompt Loading** - Agent loads research templates from `prompts/` directory  
3. **Data Gathering** - Codex searches web for current company and market information
4. **Analysis** - AI processes data using financial analysis prompts and frameworks
5. **Report Generation** - Structured markdown output saved to `./reports/` directory
6. **Cleanup** - Container automatically removes itself, leaving only the research output

## 📚 Additional Resources

- [DOCKER.md](./DOCKER.md) - Detailed containerization documentation
- [Codex SDK Documentation](https://github.com/openai/codex/tree/main/sdk/typescript)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

## 📄 License

ISC

