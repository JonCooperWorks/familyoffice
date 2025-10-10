#!/bin/bash

# Cleanup script for Family Office Research Agent Docker resources
# Use this to clean up containers, images, and volumes

set -e

echo "🧹 Cleaning up Family Office Research Agent Docker resources..."

# Stop and remove running containers
echo "🛑 Stopping any running containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Remove the built image
echo "🗑️  Removing Docker images..."
docker rmi familyoffice:latest 2>/dev/null || echo "   Image already removed or doesn't exist"

# Remove Docker network
echo "🌐 Removing Docker network..."
docker network rm familyoffice_familyoffice-net 2>/dev/null || echo "   Network already removed or doesn't exist"

# Clean up Docker volumes
echo "💾 Removing Docker volumes..."
docker volume rm familyoffice_cache 2>/dev/null || echo "   Volume already removed or doesn't exist"

# Clean up dangling images and build cache
echo "🗂️  Cleaning up build artifacts..."
docker image prune -f --filter label=org.opencontainers.image.title=familyoffice 2>/dev/null || true
docker builder prune -f 2>/dev/null || true

# Optionally clean up output directories (ask user first)
echo ""
read -p "❓ Do you want to remove local reports and logs directories? [y/N]: " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗂️  Removing local output directories..."
    rm -rf reports/ logs/
    echo "   Removed reports/ and logs/ directories"
else
    echo "   Keeping local reports/ and logs/ directories"
fi

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "To rebuild the container:"
echo "   ./scripts/docker-build.sh"
