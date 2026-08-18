#!/bin/bash

# Deciball Turborepo Setup Script
# This script will clean up old node_modules and install fresh dependencies

echo "🚀 Deciball Turborepo Setup"
echo "============================"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed!"
    echo "📦 Installing pnpm globally..."
    npm install -g pnpm@10.7.1
fi

echo "✅ pnpm version: $(pnpm --version)"
echo ""

# Clean old node_modules
echo "🧹 Cleaning old node_modules directories..."
rm -rf node_modules
rm -rf apps/discord-bot/node_modules
rm -rf apps/web/node_modules
rm -rf apps/ws/node_modules
rm -rf packages/*/node_modules

# Clean lock files if they exist
echo "🧹 Cleaning old lock files..."
rm -f package-lock.json
rm -f yarn.lock
rm -rf apps/*/package-lock.json
rm -rf apps/*/yarn.lock

# Keep pnpm-lock.yaml in discord-bot for reference but it won't be used
echo ""
echo "📦 Installing dependencies with pnpm..."
pnpm install

echo ""
echo "✨ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Set up .env files in each app:"
echo "      - apps/discord-bot/.env"
echo "      - apps/web/.env"
echo "      - apps/ws/.env"
echo ""
echo "   2. Run development mode:"
echo "      pnpm dev              # All apps"
echo "      pnpm discord-bot:dev  # Discord bot only"
echo "      pnpm web:dev          # Web app only"
echo "      pnpm ws:dev           # WebSocket server only"
echo ""
echo "   3. Build all apps:"
echo "      pnpm build"
echo ""
echo "📚 See TURBOREPO.md for detailed documentation"
echo ""
