#!/bin/bash

# Interactive shell script for Family Office Research Agent container
# Use this for debugging or exploring the container environment

set -e

# Check if Docker image exists
if ! docker images familyoffice:latest -q | grep -q .; then
    echo "❌ Error: familyoffice:latest image not found!"
    echo "   Please run ./scripts/docker-build.sh first"
    exit 1
fi

echo "🐚 Starting interactive shell in Family Office container..."
echo "⚠️  Note: This runs with elevated privileges for debugging"
echo "   In production, use ./scripts/docker-run.sh instead"
echo ""

# Run interactive shell with some security restrictions relaxed for debugging
docker compose run --rm \
    --entrypoint="" \
    familyoffice \
    /bin/sh -c "
        echo 'Family Office Research Agent - Debug Shell'
        echo 'Container user: $(whoami)'
        echo 'Working directory: $(pwd)'
        echo 'Node version: $(node --version)'
        echo 'Available commands:'
        echo '  - node dist/cli.js --help'
        echo '  - ls -la'
        echo '  - exit (to leave container)'
        echo ''
        /bin/sh
    "

echo ""
echo "👋 Exited container shell"
