# 🧹 Redis Cache Management Tools

This directory contains comprehensive tools for managing your Redis cache in the Deciball application.

## 📋 Available Tools

### 1. 🔥 Cache Flush Script (`flush-cache.ts`)
A comprehensive TypeScript script that safely deletes all cached data from Redis.

**Features:**
- ✅ Interactive confirmation (unless forced)
- ✅ Selective pattern-based deletion
- ✅ Progress tracking and statistics
- ✅ Detailed logging and error handling
- ✅ Memory usage reporting

### 2. 🐚 Shell Script (`flush-cache.sh`)
A lightweight bash alternative for quick cache clearing.

**Features:**
- ✅ Fast execution
- ✅ No dependencies beyond redis-cli
- ✅ Simple pattern-based deletion

### 3. 🎛️ Interactive Cache Manager (`cache-manager.ts`)
A comprehensive management interface for cache operations.

**Features:**
- ✅ View cache statistics
- ✅ Browse recent cache entries
- ✅ Test cache searches
- ✅ Selective pattern deletion
- ✅ Interactive menu system

## 🚀 Usage

### Quick Cache Flush

```bash
# Interactive flush (asks for confirmation)
npm run flush-cache

# Force flush without confirmation
npm run flush-cache:force

# Nuclear option: flush entire Redis database
npm run flush-cache:all

# Shell script version
npm run flush-cache:shell
```

### Interactive Cache Management

```bash
# Launch interactive cache manager
npm run cache-manager
```

### Command Line Options

The TypeScript flush script supports several options:

```bash
# Show help
npm run flush-cache -- --help

# Force flush without confirmation
npm run flush-cache -- --force

# Flush entire Redis database
npm run flush-cache -- --all
```

## 🎯 What Gets Deleted

These tools target the following Redis patterns:

| Pattern | Description |
|---------|-------------|
| `music:*` | All music cache entries |
| `music-stats:*` | Cache hit/miss statistics |
| `vote:*` | User voting data |
| `lastVoted-*` | Vote timing restrictions |
| `queue:*` | Song queue data |
| `current-song:*` | Currently playing songs |
| `space-image:*` | Room background images |
| `space-name:*` | Room names |
| `user-info:*` | Cached user information |
| `space:*` | General space/room data |
| `room:*` | Room-related data |
| `playback:*` | Playback state data |
| `timestamp:*` | Sync timestamp data |
| `latency:*` | Network latency tracking |

## 🛡️ Safety Features

### Confirmation Prompts
- Interactive confirmation before deletion
- Clear warnings about data loss
- Option to cancel at any time

### Batch Processing
- Deletes keys in batches to avoid overwhelming Redis
- Progress indicators for large operations
- Graceful error handling

### Detailed Logging
- Shows exactly what's being deleted
- Reports statistics before and after
- Error reporting with context

## 📊 Example Output

```
🧹 Redis Cache Flush Tool
========================================

📋 Redis Server Information:
  used_memory_human:1.23M
  used_memory_peak_human:2.45M

🔍 Scanning current cache...

📊 Found 1,247 keys to delete:
  music:*: 856 keys
  music-stats:*: 15 keys
  vote:*: 23 keys
  queue:*: 89 keys
  user-info:*: 45 keys

⚠️ Are you sure you want to flush the cache? (y/N): y

🧹 Starting selective cache flush...

🔍 Scanning for pattern: music:*
  📦 Found 856 keys matching music:*
  ✅ Deleted 856 keys for pattern music:*

============================================================
📊 CACHE FLUSH SUMMARY
============================================================
🕒 Time taken: 2,341ms
🔢 Total keys processed: 1,247
🗑️ Total keys deleted: 1,247

✨ Cache flush completed successfully!
🚀 Your application will now start with a clean cache.
```

## 🔧 Troubleshooting

### Common Issues

**"Cannot connect to Redis"**
- Check your `REDIS_URL` environment variable
- Verify Redis server is running
- Check network connectivity and credentials

**"Permission denied"**
- Ensure Redis user has DELETE permissions
- Check Redis AUTH settings

**"Script hangs"**
- Large datasets may take time to process
- Use `--force` flag to skip confirmations
- Monitor Redis memory usage

### Environment Variables

Make sure these are set in your `.env` file:

```env
REDIS_URL=rediss://username:password@host:port
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

## 🎯 Best Practices

### When to Flush Cache

- **Development**: After schema changes or major updates
- **Testing**: Before running performance tests
- **Production**: During maintenance windows only
- **Debugging**: When investigating cache-related issues

### Backup Considerations

- Redis cache is considered ephemeral data
- No backup needed for music cache (will rebuild automatically)
- Consider backing up user preferences if stored in Redis

### Performance Impact

- Cache flush is instant but rebuilding takes time
- First requests after flush will be slower
- Cache will warm up naturally as users make requests

## 🚨 Important Notes

⚠️ **These operations are irreversible!**

- Once cache is flushed, it cannot be recovered
- Application will rebuild cache automatically
- First requests after flush will have higher latency
- Use in development/testing environments freely
- Use with caution in production

## 📞 Support

If you encounter issues:

1. Check the logs for specific error messages
2. Verify Redis connection settings
3. Test with a small pattern first
4. Contact the development team for assistance

---

**Happy caching! 🎵✨**
