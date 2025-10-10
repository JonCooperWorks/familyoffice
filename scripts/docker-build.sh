#!/bin/bash

# Docker build script for Family Office Research Agent
# This script builds the containerized version of the application

set -e  # Exit on error

echo "🚀 Building Family Office Research Agent Container..."

# Create necessary directories
mkdir -p reports logs

# Check if .env file exists, create template if not
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << 'EOF'
# Family Office Research Agent Environment Variables
# Copy this file and fill in your actual API keys

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Optional: Additional configuration
DEBUG=false

# Note: Never commit the actual .env file with real API keys!
EOF
    echo "📝 Created .env template. Please edit it with your actual API keys."
    echo "   File location: $(pwd)/.env"
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker compose build --no-cache

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file with your API keys"
echo "   2. Run: ./scripts/docker-run.sh research AAPL"
echo "   3. Or run: ./scripts/docker-run.sh chat AAPL"
echo ""
