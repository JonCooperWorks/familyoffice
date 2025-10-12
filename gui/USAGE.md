# Using the Family Office Research GUI

## First Time Setup

When you launch the app for the first time, it will automatically check for required dependencies:

### 1. Docker Desktop
- **Status Check**: Verifies Docker is installed and running
- **If Missing**: Shows link to download Docker Desktop
- **Action**: Install Docker Desktop from docker.com and start it

### 2. Codex CLI
- **Status Check**: Verifies Codex CLI is installed and authenticated
- **If Missing**: Shows installation commands
- **Action**: 
  ```bash
  brew install codex
  # or
  npm install -g @openai/codex
  
  # Then authenticate:
  codex
  # Select "Sign in with ChatGPT"
  ```

### 3. NPM Packages
- **Status Check**: Verifies project dependencies are installed
- **If Missing**: Shows "Install Now" button
- **Action**: Click "Install Now" - the app will install automatically

### 4. Docker Image
- **Status Check**: Verifies familyoffice:latest image exists
- **If Missing**: Shows "Build Now" button
- **Action**: Click "Build Now" - the app will build the Docker image with progress

## Using the Research Tab

Generate comprehensive stock research reports:

1. **Enter Ticker Symbol** (required)
   - Example: AAPL, TSLA, NVDA
   - Automatically converts to uppercase

2. **Enter Company Name** (optional)
   - Example: "Apple Inc."
   - If omitted, will be looked up automatically

3. **Choose Mode**
   - **New Research**: Generate a fresh report
   - **Reevaluate Existing**: Fact-check and update an existing report

4. **For Reevaluation**: Enter report path
   - Example: `./reports/research-AAPL-2025-10-11T14-30-00.md`
   - Or click on a report in the Reports tab and select "Reevaluate"

5. **Click "Generate Report"**
   - Progress shown in real-time
   - Docker container output displayed
   - When complete, "Open Report" button appears

## Using the Chat Tab

Have interactive conversations about stocks:

1. **Start a Session**
   - Enter ticker symbol (required)
   - Optionally load an existing report for context
   - Click "Start Chat Session"

2. **Chat Interface**
   - Type questions in the input field
   - Press Enter or click "Send"
   - Responses appear in the chat history
   - Conversation maintains context

3. **Special Commands**
   - `/update-report`: Save an updated version of the report
   - `/exit` or `/quit`: End the chat session

4. **End Session**
   - Click "End Session" button to return to setup

## Using the Reports Tab

Browse and manage all generated reports:

### Features

- **Report List**: Shows all reports sorted by date (newest first)
- **Search**: Filter by ticker symbol or company name
- **Report Cards**: Each card shows:
  - Ticker symbol
  - Company name
  - Date/time generated
  - Type (Research or Reevaluation)

### Actions

Each report has three actions:

1. **Open**
   - Opens the report in your default markdown viewer
   - On macOS, typically opens in TextEdit or your preferred editor

2. **Reevaluate**
   - Opens the Research tab
   - Pre-loads the report for reevaluation
   - You can then update it with current information

3. **Chat**
   - Opens the Chat tab
   - Pre-loads the report as context
   - Start asking questions immediately

## Tips & Best Practices

### Research Reports

- **Use descriptive company names** for better context in the AI analysis
- **Reevaluate periodically** to keep reports current (e.g., quarterly)
- **Compare multiple reports** to see how analysis changes over time

### Chat Sessions

- **Load a report** for more contextual conversations
- **Ask specific questions** like:
  - "What are the key risks mentioned?"
  - "How does valuation compare to peers?"
  - "What's changed since this report?"
- **Use follow-up questions** - the AI maintains context

### Organization

- Reports are saved in `../reports/` directory
- Filename format: `research-{TICKER}-{TIMESTAMP}.md`
- Use the search feature to quickly find specific reports

## Keyboard Shortcuts

- **Tab Navigation**: Click tabs or use mouse
- **Enter**: Send message in Chat tab
- **Enter**: Submit form in Research tab

## Troubleshooting

### App Won't Start
- Ensure all dependencies are installed (Docker, Codex)
- Click "Check Again" in the dependency checker

### Docker Errors
- Ensure Docker Desktop is running
- Try rebuilding the image: Dependency checker → "Build Now"

### Research Taking Too Long
- This is normal! AI research can take 2-5 minutes
- Watch the output panel for progress
- The Docker container is working in isolation

### Chat Not Working
- Note: Chat requires the CLI to support non-interactive mode
- For now, use the CLI directly: `./scripts/docker-run.sh chat AAPL`

### Reports Not Loading
- Check that reports exist in `../reports/` directory
- Click "Refresh" button in Reports tab
- Verify file permissions

## Security Notes

- All operations run in Docker containers for isolation
- No data leaves your machine except OpenAI API calls
- Reports are stored locally in `../reports/`
- Docker provides sandboxed execution environment

## Getting Help

- Check the main README.md for CLI usage
- Review Docker logs in `../logs/` directory
- Inspect report files for detailed analysis

