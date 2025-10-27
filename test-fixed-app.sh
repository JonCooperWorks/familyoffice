#!/bin/bash

echo "🧪 Testing FIXED Familyoffice App"
echo "=================================="
echo ""

# Kill any running instances
echo "1️⃣ Killing any existing instances..."
pkill -9 familyoffice 2>/dev/null && echo "   ✅ Killed existing instance" || echo "   ℹ️  No running instance found"
sleep 2

# Remove old app from /Applications if it exists
if [ -d "/Applications/familyoffice.app" ]; then
    echo ""
    echo "2️⃣ Found old app in /Applications"
    echo "   ⚠️  This might be an outdated version"
    echo "   Removing it..."
    rm -rf /Applications/familyoffice.app
    echo "   ✅ Removed"
fi

echo ""
echo "3️⃣ Opening the NEWLY BUILT app with debug output..."
echo "   Path: release/mac-arm64/familyoffice.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 CONSOLE OUTPUT (watch for debug messages):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the app and show console output
release/mac-arm64/familyoffice.app/Contents/MacOS/familyoffice 2>&1 | while IFS= read -r line; do
    # Highlight important lines
    if [[ $line == *"DEBUG"* ]] || [[ $line == *"BaseAgent"* ]] || [[ $line == *"codex"* ]]; then
        echo "🔍 $line"
    elif [[ $line == *"ERROR"* ]] || [[ $line == *"Error"* ]] || [[ $line == *"ENOTDIR"* ]]; then
        echo "❌ $line"
    elif [[ $line == *"✅"* ]]; then
        echo "$line"
    else
        echo "$line"
    fi
done

