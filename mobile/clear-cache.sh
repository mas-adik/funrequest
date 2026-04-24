#!/bin/bash

# Force stop any running Expo processes
echo "🛑 Stopping Expo processes..."
pkill -f "expo start" || true
pkill -f "metro" || true
sleep 2

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf .next
rm -rf dist
rm -rf build

# Clear npm cache for good measure
npm cache clean --force

echo "✅ Cache cleared successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Run: npx expo start --clear"
echo "2. Press 'w' for web, 'a' for Android, or 'i' for iOS"
echo "3. For web: Hard refresh (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)"
echo "4. For mobile: Press 'r' in terminal to reload"
