# 🐳 Docker Setup Guide

## Quick Start

### 1. Start all services (Development)
```bash
docker-compose up
```

### 2. Start in detached mode (background)
```bash
docker-compose up -d
```

### 3. Stop all services
```bash
docker-compose down
```

### 4. Rebuild containers after code changes
```bash
docker-compose up --build
```

### 5. View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f ws
docker-compose logs -f postgres
docker-compose logs -f redis
```

---

## 📦 Services

### PostgreSQL Database
- **Container**: `deciball-postgres`
- **Port**: 5432
- **Database**: deciball
- **Username**: deciball
- **Password**: deciball_password
- **Connection String**: `postgresql://deciball:deciball_password@localhost:5432/deciball`

### Redis Cache
- **Container**: `deciball-redis`
- **Port**: 6379
- **Password**: deciball_redis_password
- **Connection String**: `redis://:deciball_redis_password@localhost:6379`

### Web Application (Next.js)
- **Container**: `deciball-web`
- **Port**: 3000 (HTTP), 5555 (Prisma Studio)
- **URL**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555

### WebSocket Server
- **Container**: `deciball-ws`
- **Port**: 8080
- **WebSocket URL**: ws://localhost:8080

### Discord Bot (Optional)
- **Container**: `deciball-discord-bot`
- **Status**: Commented out by default
- **Enable**: Uncomment the `discord-bot` service in docker-compose.yml

---

## 🔧 Common Commands

### Database Migrations

#### From host machine
```bash
# Run migrations for web app
cd apps/web
pnpm prisma migrate dev

# Run migrations for ws app
cd apps/ws
pnpm prisma migrate dev
```

#### Inside Docker container
```bash
# Web app migrations
docker-compose exec web pnpm prisma migrate dev

# WS app migrations
docker-compose exec ws pnpm prisma migrate dev
```

### Access Prisma Studio
```bash
# Web app
docker-compose exec web pnpm prisma studio

# Or run from host
cd apps/web && pnpm prisma studio
```

### Redis CLI
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Inside CLI, authenticate
AUTH deciball_redis_password

# Test connection
PING
```

### PostgreSQL CLI
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U deciball -d deciball

# List tables
\dt

# Exit
\q
```

---

## 🛠️ Troubleshooting

### Reset Everything
```bash
# Stop and remove all containers, volumes, and networks
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build
```

### View Container Status
```bash
docker-compose ps
```

### Shell Access
```bash
# Web container
docker-compose exec web sh

# WS container
docker-compose exec ws sh

# Postgres container
docker-compose exec postgres sh
```

### Check Service Health
```bash
# Check if Postgres is ready
docker-compose exec postgres pg_isready -U deciball

# Check Redis
docker-compose exec redis redis-cli ping
```

---

## 📝 Environment Variables

### Connection Strings

When running services **outside Docker** (on your host machine):
- PostgreSQL: `postgresql://deciball:deciball_password@localhost:5432/deciball`
- Redis: `redis://:deciball_redis_password@localhost:6379`

When running services **inside Docker**:
- PostgreSQL: `postgresql://deciball:deciball_password@postgres:5432/deciball`
- Redis: `redis://:deciball_redis_password@redis:6379`

The docker-compose.yml automatically handles this by overriding environment variables.

---

## 🚀 Production Deployment

### Build production images
```bash
# Build all production images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker build -f apps/web/Dockerfile -t deciball-web:latest .
docker build -f apps/ws/Dockerfile -t deciball-ws:latest .
docker build -f apps/discord-bot/Dockerfile -t deciball-bot:latest .
```

---

## 📊 Monitoring

### Check Resource Usage
```bash
docker stats
```

### View Network
```bash
docker network inspect deciball_deciball-network
```

### Volume Management
```bash
# List volumes
docker volume ls | grep deciball

# Inspect volume
docker volume inspect deciball_postgres-data
docker volume inspect deciball_redis-data

# Remove volumes (WARNING: deletes data)
docker volume rm deciball_postgres-data
docker volume rm deciball_redis-data
```

---

## 🔐 Security Notes

### Default Credentials (for development only!)

These are the default credentials set for local development. **NEVER use these in production!**

**PostgreSQL:**
- User: `deciball`
- Password: `deciball_password`
- Database: `deciball`

**Redis:**
- Password: `deciball_redis_password`

### For Production:
1. Use strong, randomly generated passwords
2. Store credentials in secure secret management (e.g., AWS Secrets Manager, Azure Key Vault)
3. Use environment-specific .env files
4. Enable SSL/TLS for database connections
5. Configure proper firewall rules

---

## 🎯 Development Workflow

### 1. Start Docker services
```bash
docker-compose up -d postgres redis
```

### 2. Run migrations
```bash
cd apps/web && pnpm prisma migrate dev
cd apps/ws && pnpm prisma migrate dev
```

### 3. Run apps locally (outside Docker)
```bash
# Terminal 1: Web app
pnpm web:dev

# Terminal 2: WebSocket server
pnpm ws:dev

# Terminal 3: Discord bot (optional)
pnpm discord-bot:dev
```

### Or run everything in Docker
```bash
docker-compose up
```

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
