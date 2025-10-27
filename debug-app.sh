#!/bin/bash

echo "🐛 Debug Mode - Starting familyoffice with full logging"
echo "========================================================"
echo ""
echo "This will:"
echo "1. Kill any existing instances"
echo "2. Run the newly built app with all console output visible"
echo "3. Show you the debug messages about codex binary path"
echo ""
echo "When the app opens, try to run research and you'll see"
echo "the debug output here in this terminal."
echo ""
echo "Press Enter to continue..."
read

# Kill any existing instances
echo "Killing existing instances..."
pkill -9 familyoffice 2>/dev/null || true
sleep 1

echo ""
echo "Starting app..."
echo "========================================================"
echo ""

# Run the app with full output
exec release/mac-arm64/familyoffice.app/Contents/MacOS/familyoffice

