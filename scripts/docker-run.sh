#!/bin/bash

# Docker run script for Family Office Research Agent
# Usage: ./scripts/docker-run.sh [command] [args...]

set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please run ./scripts/docker-build.sh first to create the template"
    echo "   Then edit .env with your actual API keys"
    exit 1
fi

# Check if Docker image exists
if ! docker images familyoffice:latest -q | grep -q .; then
    echo "❌ Error: familyoffice:latest image not found!"
    echo "   Please run ./scripts/docker-build.sh first"
    exit 1
fi

# Ensure output directories exist with proper permissions
mkdir -p reports logs
chmod 755 reports logs

# Parse command and arguments
if [ $# -eq 0 ]; then
    echo "📚 Usage examples:"
    echo "   Research a stock:     ./scripts/docker-run.sh research AAPL"
    echo "   Chat about a stock:   ./scripts/docker-run.sh chat TSLA"
    echo "   Reevaluate report:    ./scripts/docker-run.sh reevaluate MSFT --report ./reports/research-MSFT-2024-01-01.md"
    echo "   Show help:           ./scripts/docker-run.sh --help"
    echo ""
    echo "🔒 Container runs in isolated sandbox mode with:"
    echo "   • Read-only root filesystem"
    echo "   • Dropped privileges"
    echo "   • Network isolation"
    echo "   • Resource limits"
    echo "   • Temporary filesystem for /tmp"
    exit 0
fi

# Run the container with the provided command
echo "🚀 Starting Family Office Research Agent in sandbox mode..."
echo "📂 Outputs will be saved to: $(pwd)/reports/"
echo "📝 Logs will be saved to: $(pwd)/logs/"
echo ""

# Generate log filename based on command and ticker
COMMAND=""
TICKER=""
for arg in "$@"; do
    if [[ "$arg" =~ ^[A-Z]{1,5}$ ]]; then
        TICKER="$arg"
        break
    fi
done

# Set command type
if [[ "$1" == "research" ]]; then
    COMMAND="research"
elif [[ "$1" == "reevaluate" ]]; then
    COMMAND="reevaluate"  
elif [[ "$1" == "chat" ]]; then
    COMMAND="chat"
else
    COMMAND="run"
fi

# Generate log filename
if [ -n "$TICKER" ]; then
    TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
    LOG_FILE="./logs/${TICKER}-docker-${COMMAND}-${TIMESTAMP}.log"
else
    LOG_FILE="./logs/docker-$(date +%Y-%m-%d_%H-%M-%S).log"
fi

echo "📝 Capturing output to: $LOG_FILE"
echo ""

# Use docker compose run and capture output to both terminal and log file
docker compose run --rm familyoffice "$@" 2>&1 | tee "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Container execution completed successfully"
else
    echo "❌ Container execution failed with exit code: $EXIT_CODE"
fi
echo "📂 Check ./reports/ for any generated research files"
echo "📝 Full log saved to: $LOG_FILE"
