#!/bin/bash

# Simple Redis Cache Flush Script
# This is a quick shell script alternative to the TypeScript version

echo "🧹 Redis Cache Flush Script (Shell Version)"
echo "============================================"

# Check if redis-cli is available
if ! command -v redis-cli &> /dev/null; then
    echo "❌ redis-cli not found. Please install Redis CLI tools."
    exit 1
fi

# Load Redis connection details from environment or use defaults
REDIS_HOST=${REDIS_HOST:-"localhost"}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-""}

# Build redis-cli command
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD"
else
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
fi

# Function to count and delete keys by pattern
flush_pattern() {
    local pattern=$1
    echo "🔍 Processing pattern: $pattern"
    
    local keys=$($REDIS_CMD --scan --pattern "$pattern" | wc -l)
    if [ "$keys" -gt 0 ]; then
        echo "  📦 Found $keys keys"
        $REDIS_CMD --scan --pattern "$pattern" | xargs -r $REDIS_CMD DEL > /dev/null
        echo "  ✅ Deleted $keys keys"
    else
        echo "  ✅ No keys found"
    fi
}

# Ask for confirmation unless --force is passed
if [ "$1" != "--force" ] && [ "$1" != "-f" ]; then
    echo "⚠️ This will delete all cached data from Redis!"
    echo "Patterns to be deleted:"
    echo "  • music:*"
    echo "  • music-stats:*"
    echo "  • vote:*"
    echo "  • queue:*"
    echo "  • space:*"
    echo "  • user-info:*"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Flush cancelled"
        exit 0
    fi
fi

echo ""
echo "🚀 Starting cache flush..."

# Test Redis connection
if ! $REDIS_CMD ping > /dev/null 2>&1; then
    echo "❌ Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
    echo "Please check your Redis connection settings."
    exit 1
fi

echo "✅ Connected to Redis"

# Flush patterns
flush_pattern "music:*"
flush_pattern "music-stats:*"
flush_pattern "vote:*"
flush_pattern "lastVoted-*"
flush_pattern "queue:*"
flush_pattern "current-song:*"
flush_pattern "space-image:*"
flush_pattern "space-name:*"
flush_pattern "user-info:*"
flush_pattern "space:*"
flush_pattern "room:*"
flush_pattern "playback:*"
flush_pattern "timestamp:*"
flush_pattern "latency:*"

echo ""
echo "✨ Cache flush completed!"
echo "🚀 Your application will now start with a clean cache."

# Show Redis memory usage after flush
echo ""
echo "📊 Redis Memory Usage After Flush:"
$REDIS_CMD info memory | grep "used_memory_human\|used_memory_peak_human" | sed 's/^/  /'
