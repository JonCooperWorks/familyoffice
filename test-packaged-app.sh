#!/bin/bash

echo "🧪 Testing Packaged App - Debugging Script"
echo "=========================================="
echo ""

# Step 1: Kill any running instances
echo "1️⃣ Killing any running familyoffice instances..."
pkill -9 familyoffice 2>/dev/null || echo "   No running instances found"
sleep 1

# Step 2: Check if app exists in /Applications
if [ -d "/Applications/familyoffice.app" ]; then
    echo "⚠️  Found old app in /Applications"
    echo "   Remove it? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf /Applications/familyoffice.app
        echo "   ✅ Removed old app from /Applications"
    fi
fi

# Step 3: Build fresh app
echo ""
echo "2️⃣ Building fresh distribution..."
npm run dist:mac

# Step 4: Show where the new app is
echo ""
echo "3️⃣ New app built at:"
echo "   📦 release/mac-arm64/familyoffice.app"
echo ""

# Step 5: Verify resources are bundled
echo "4️⃣ Verifying bundled resources..."
echo ""
echo "   📄 Prompts:"
ls -1 release/mac-arm64/familyoffice.app/Contents/Resources/prompts/ 2>/dev/null || echo "   ❌ Prompts not found!"
echo ""
echo "   🔧 Codex binary:"
if [ -f "release/mac-arm64/familyoffice.app/Contents/Resources/vendor/aarch64-apple-darwin/codex/codex" ]; then
    ls -lh release/mac-arm64/familyoffice.app/Contents/Resources/vendor/aarch64-apple-darwin/codex/codex | awk '{print "   ✅ "$5" - "$9}'
    file release/mac-arm64/familyoffice.app/Contents/Resources/vendor/aarch64-apple-darwin/codex/codex | awk '{print "   "$0}'
else
    echo "   ❌ Codex binary not found!"
fi

echo ""
echo "=========================================="
echo "5️⃣ Ready to test!"
echo ""
echo "To run the app and see debug output:"
echo "   open -a release/mac-arm64/familyoffice.app"
echo ""
echo "To view console logs:"
echo "   log stream --predicate 'process == \"familyoffice\"' --level debug"
echo ""
echo "Or run from command line to see output:"
echo "   release/mac-arm64/familyoffice.app/Contents/MacOS/familyoffice"
echo ""

