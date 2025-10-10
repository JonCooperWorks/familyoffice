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

# Use docker compose run for better isolation and automatic cleanup
docker compose run --rm familyoffice "$@"

echo ""
echo "✅ Container execution completed"
echo "📂 Check ./reports/ for any generated research files"
