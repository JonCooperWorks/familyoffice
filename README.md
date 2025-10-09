# Family Office - AI Stock Research Agent

An AI-powered TypeScript agent that uses **OpenAI Codex** to provide comprehensive stock research and interactive chat capabilities.

## Features

- **Research Command**: Generate detailed equity research reports for any stock
- **Chat Command**: Interactive chat interface to ask questions about specific stocks  
- **Thread-based Conversations**: Uses Codex's thread system for context-aware conversations
- **Template-based Prompts**: Easily customizable research prompts stored in markdown files
- **Automatic Authentication**: Uses your existing Codex CLI authentication - no API keys to manage!

## Setup

1. **Install Codex CLI** (if not already installed):
```bash
brew install codex
# or
npm install -g @openai/codex
```

2. **Sign in to Codex**:
```bash
codex
# Then select "Sign in with ChatGPT"
```

3. **Install project dependencies**:
```bash
npm install
```

4. **(Optional) Install globally for easier access**:
```bash
npm link
```

After running `npm link`, you can use `familyoffice` from anywhere:
```bash
familyoffice research AAPL
familyoffice chat --ticker TSLA
```

Otherwise, use `npm run` commands with `--` separator (see Usage below).

5. **You're ready!** No API keys needed - the agent uses your Codex CLI authentication automatically.

## Usage

### Research Command (Non-Interactive)

Generate a comprehensive research report for a stock and save it to a file:

```bash
# Using npm run (requires -- separator)
npm run research -- AAPL

# With company name
npm run research -- TSLA --company "Tesla Inc."

# With custom output file
npm run research -- NVDA --output my-nvidia-research.md

# If you ran npm link (easier!)
familyoffice research AAPL
familyoffice research RXRX --company "Recursion Pharmaceuticals"
```

**Output:** Creates a markdown file like `research-AAPL-2025-10-09T14-30-00.md` with the complete research report.

The research command will generate a detailed report including:
- Company overview
- Business model and revenue streams
- Competitive advantages
- Investment thesis
- Tailwinds and headwinds
- Exit strategy
- Sources and citations

### Chat Command (Interactive)

Start an interactive chat about a specific stock:

```bash
# Using npm run
npm run chat

# With ticker
npm run chat -- --ticker AAPL

# Load a research report for context
npm run chat -- --ticker AAPL --report research-AAPL-2025-10-09T14-30-00.md

# If you ran npm link (easier!)
familyoffice chat
familyoffice chat --ticker AAPL
familyoffice chat --report research-AAPL-2025-10-09T14-30-00.md
```

**Smart Context Loading:**
- If you specify a ticker without `--report`, the agent will check if there's a recent research report and ask if you want to load it
- If you provide `--report` without a ticker, it will auto-detect the ticker from the report
- The report content is loaded into the chat context, so the agent can reference specific details

**In chat mode, you can ask questions like:**
- "What are the key risks mentioned in the report?"
- "How does the valuation compare to competitors?"
- "What's changed since this report was written?"
- "Summarize the investment thesis"

Type `exit` or `quit` to end the chat session.

## Project Structure

```
familyoffice/
├── src/
│   ├── cli.ts                 # CLI interface
│   ├── index.ts               # Main export file
│   ├── services/
│   │   └── agentService.ts    # Codex SDK agent service
│   └── utils/
│       └── promptLoader.ts    # Prompt template loader
├── prompts/
│   └── research-stock-prompt.md  # Research prompt template
├── package.json
└── tsconfig.json
```

## How It Works

This agent uses the **OpenAI Codex SDK** ([https://github.com/openai/codex/tree/main/sdk/typescript](https://github.com/openai/codex/tree/main/sdk/typescript)) which:

1. **Wraps the Codex CLI** - It spawns the `codex` binary and exchanges JSONL events
2. **Uses Your Authentication** - Automatically uses your Codex CLI login (no API keys needed!)
3. **Provides Thread Management** - Maintains conversation context across multiple interactions
4. **Streams Events** - Get real-time updates about web searches, thinking, and responses

The agent loads prompt templates from the `prompts/` directory, fills them with your stock data, and sends them to Codex threads for processing.

## License

ISC

