# Family Office - AI Stock Research Application

A modern desktop application powered by **OpenAI Codex** that provides comprehensive stock research and interactive chat capabilities through an intuitive GUI interface.

## Features

- **📊 Research Reports**: Generate detailed equity research reports for any stock with one click
- **💬 Interactive Chat**: Real-time conversations about stocks with context-aware AI
- **📁 Report Management**: Browse, search, and organize your research reports
- **🔄 Report Reevaluation**: Update existing reports with latest data and insights
- **✅ Quality Checker**: Automated quality control pass to fix links, citations, and formatting
- **📤 Export Functionality**: Export reports as markdown files for external use
- **📊 Usage Statistics**: Track API costs, token usage, and performance metrics
- **🎨 Modern UI**: Clean, intuitive interface built with Electron and React
- **📱 Cross-Platform**: Works on macOS, Windows, and Linux
- **🏗️ Modular Architecture**: One specialized agent per prompt for maintainability

## Screenshots

![Dashboard View](./images/dashboard.png)
*Main dashboard showing research reports and navigation*

![Chat Interface](./images/chat.png)
*Interactive chat with AI about stock analysis*

## 🚀 Quick Start

### Prerequisites

1. **Install Codex CLI**:
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

### Installation & Setup

1. **Clone and build the application**:
```bash
git clone <repository-url>
cd familyoffice
npm install
npm run build
```

2. **Start the application**:
```bash
npm run start
```

That's it! The application will launch with a clean interface ready for stock research.

## 📖 How to Use

### Research Reports

1. **Navigate to Reports**: Click on "Research Reports" in the main navigation
2. **Search for a Stock**: Type a ticker symbol (e.g., AAPL, TSLA) in the search bar
3. **Start Research**: Click "Research [TICKER]" button that appears for new stocks
4. **View Progress**: Watch real-time updates as the AI gathers and analyzes data
5. **Read Report**: Click "Open" on any report to view the detailed analysis

**Research reports include:**
- Company overview and business model
- Revenue streams and competitive advantages  
- Investment thesis and valuation analysis
- Key risks (tailwinds and headwinds)
- Exit strategy and price targets
- Sources and citations with current data

### Interactive Chat

1. **Start Chat**: Click "Chat" on any report or use the main Chat interface
2. **Ask Questions**: Type natural language questions about the stock
3. **Get Context-Aware Answers**: The AI references your loaded report for relevant insights
4. **Continue Conversations**: Chat history is automatically saved and restored

**Example questions:**
- "What are the key risks mentioned in the report?"
- "How does the valuation compare to competitors?"
- "What's changed since this report was written?"
- "Should I buy, sell, or hold based on recent developments?"

### Report Management

- **Browse Reports**: View all your research reports in an organized grid
- **Search & Filter**: Find reports by ticker symbol or company name
- **Export Reports**: Click the export button to save reports as markdown files
- **Reevaluate**: Update existing reports with the latest data and market conditions
- **Quality Check**: Run automated quality control to fix citations, links, and formatting

### Quality Checker

The quality checker agent performs automated quality control on research reports:

- ✅ Checks for unanswered questions and placeholder text
- 🔗 Fixes file references to use full SEC EDGAR URLs
- 📝 Ensures consistent formatting (headers, bullets, markdown)
- 📚 Verifies all claims have proper source citations
- 🎯 Performs consistency checks (dates, names, URLs)
- ✨ Makes reports publication-ready

To run the quality checker, click the "Run Quality Check" button on any report.

### Usage Statistics

Track your API usage and costs by clicking the **📊 Stats** button:

- **Total Runs**: Number of research operations completed
- **Total Cost**: Total spending across all research operations
- **Token Usage**: Input and output tokens used
- **Activity Breakdown**: By ticker, type, and date
- **Export Data**: Download metadata as JSON for external analysis

See [STATS_UI.md](./STATS_UI.md) for detailed information.

## 🔒 Security

### Security Considerations

This application runs AI operations directly on your host system with full access to files and network. AI agents can be vulnerable to **prompt injection attacks**, where malicious input could potentially:

- Execute harmful commands on your system
- Access or modify sensitive files  
- Exfiltrate data or install malware
- Compromise your development environment

### Safe Usage Guidelines

1. **Use in trusted environments** only
2. **Review outputs** in the Reports section before acting on recommendations
3. **Keep the application updated** by rebuilding regularly
4. **Monitor resource usage** to detect unusual behavior
5. **Be cautious** when researching unfamiliar tickers from untrusted sources

## 🛠️ Development

### Project Structure

```
familyoffice/
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts               # Main application entry
│   │   ├── agentManager.ts        # AI agent orchestration
│   │   ├── deps.ts                # Dependency checking
│   │   ├── preload.ts             # Preload script
│   │   └── md.json                # Metadata storage
│   ├── renderer/                  # React frontend
│   │   ├── App.tsx                # Main application component
│   │   ├── components/            # UI components
│   │   │   ├── Reports.tsx        # Research reports interface
│   │   │   ├── ReportWithChat.tsx # Report viewer with chat
│   │   │   ├── Chat.tsx           # Interactive chat
│   │   │   ├── Research.tsx       # Research interface
│   │   │   ├── Stats.tsx          # Usage statistics
│   │   │   ├── MarkdownViewer.tsx # Report display
│   │   │   └── DepsCheck.tsx      # Dependency checker
│   │   └── utils/                 # Utility functions
│   │       ├── metadataViewer.ts  # Metadata management
│   │       └── reportsCache.ts    # Report caching
│   ├── services/                  # Business logic services
│   │   ├── agentService.ts        # Main orchestration service
│   │   ├── alphaVantageService.ts # Alpha Vantage integration
│   │   └── agents/                # Individual agent classes
│   │       ├── BaseAgent.ts       # Common functionality
│   │       ├── ResearchAgent.ts   # Research reports
│   │       ├── ReevaluationAgent.ts # Report updates
│   │       ├── ChatAgent.ts       # Interactive chat
│   │       ├── UpdateAgent.ts     # Chat-to-report
│   │       └── CheckerAgent.ts    # Quality control
│   ├── shared/                    # Shared types and interfaces
│   │   ├── types.ts               # Type definitions
│   │   └── pricing.ts             # Pricing configuration
│   └── utils/                     # Utility functions
│       ├── codexConfig.ts         # Codex config management
│       └── promptLoader.ts        # Prompt template loader
├── prompts/                       # AI prompt templates
│   ├── prompt-research-stock.md
│   ├── prompt-reevaluate-stock.md
│   ├── prompt-chat-stock.md
│   ├── prompt-update-report.md
│   └── prompt-checker-pass.md
├── reports/                       # Generated research outputs
├── temp/                          # Temporary working files
├── dist/                          # Built frontend files
├── dist-electron/                 # Built Electron files
├── build/                         # Build resources (icons)
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
└── vite.config.ts
```

### Agent Architecture

The system uses a modular agent architecture with **one agent per prompt**:

- **ResearchAgent**: Generates comprehensive research reports
- **ReevaluationAgent**: Updates existing reports with current data
- **ChatAgent**: Provides interactive chat with context awareness
- **UpdateAgent**: Converts chat conversations into updated reports
- **CheckerAgent**: Performs quality control and fixes issues

Each agent extends `BaseAgent` and uses a dedicated prompt template from the `prompts/` directory.

### Building the Application

```bash
# Install dependencies
npm install

# Development build
npm run build

# Production build
npm run dist

# Start application (builds first)
npm run start

# Development mode with hot reload
npm run dev
```

### Available Scripts

- `npm run start` - Build and start the application
- `npm run build` - Build the application for production
- `npm run dev` - Start development server (Vite)
- `npm run package` - Package application for distribution
- `npm run dist` - Create distribution packages
- `npm run electron` - Run Electron (after building)

## 🔧 How It Works

This application combines a modern Electron desktop interface with the **OpenAI Codex SDK**:

1. **Desktop Interface**: Electron provides native desktop experience with React frontend
2. **AI Integration**: Codex SDK handles all AI operations directly on the host system
3. **Real-time Updates**: IPC communication provides live progress updates
4. **File Management**: Automatic organization of reports and chat history
5. **Cross-platform**: Single codebase runs on all major operating systems

### Process Flow

1. **User Interaction**: Click buttons or type in the GUI interface
2. **Direct Execution**: Codex runs directly on host system with full access
3. **AI Processing**: Codex searches web and analyzes data using financial frameworks
4. **Real-time Updates**: Progress displayed in the interface as AI works
5. **Report Generation**: Structured markdown output saved and displayed
6. **File Operations**: Reports saved directly to host filesystem

## 📚 Additional Resources

- [CODEX_CONFIG.md](./CODEX_CONFIG.md) - Automatic Codex configuration management
- [METADATA.md](./METADATA.md) - Research metadata storage documentation
- [STATS_UI.md](./STATS_UI.md) - Usage statistics interface guide
- [PRICING_UPDATE.md](./PRICING_UPDATE.md) - Pricing configuration details
- [Codex SDK Documentation](https://github.com/openai/codex/tree/main/sdk/typescript)

## 📄 License

ISC
