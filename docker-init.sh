#!/bin/bash

# Deciball Docker Initialization Script
# This script sets up the Docker environment and initializes the database

set -e

echo "🐳 Deciball Docker Setup"
echo "========================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "📦 Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "📦 Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Start services (development)"
echo "2) Start services (production)"
echo "3) Stop all services"
echo "4) Reset everything (remove volumes)"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting development services..."
        echo ""
        
        # Start services
        docker-compose up -d postgres redis
        
        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 5
        
        # Check if services are healthy
        echo "🔍 Checking PostgreSQL..."
        docker-compose exec postgres pg_isready -U deciball || echo "⚠️  PostgreSQL not ready yet, please wait..."
        
        echo "🔍 Checking Redis..."
        docker-compose exec redis redis-cli ping || echo "⚠️  Redis not ready yet, please wait..."
        
        echo ""
        echo "📦 Running database migrations..."
        
        # Run migrations for web
        echo "  → Web app migrations..."
        cd apps/web && pnpm prisma migrate dev --skip-generate && cd ../..
        
        # Run migrations for ws
        echo "  → WebSocket server migrations..."
        cd apps/ws && pnpm prisma migrate dev --skip-generate && cd ../..
        
        echo ""
        echo "✅ Services started successfully!"
        echo ""
        echo "📊 Service URLs:"
        echo "  PostgreSQL: postgresql://deciball:deciball_password@localhost:5432/deciball"
        echo "  Redis:      redis://:deciball_redis_password@localhost:6379"
        echo ""
        echo "🎯 Next steps:"
        echo "  1. Run 'pnpm dev' to start all apps"
        echo "  2. Or start services individually:"
        echo "     - pnpm web:dev"
        echo "     - pnpm ws:dev"
        echo "     - pnpm discord-bot:dev"
        echo ""
        ;;
    2)
        echo ""
        echo "🚀 Starting production services..."
        docker-compose -f docker-compose.prod.yml up -d
        echo ""
        echo "✅ Production services started!"
        ;;
    3)
        echo ""
        echo "🛑 Stopping all services..."
        docker-compose down
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
        echo ""
        echo "✅ All services stopped!"
        ;;
    4)
        echo ""
        echo "⚠️  WARNING: This will delete all data in PostgreSQL and Redis!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "🧹 Removing all containers, volumes, and networks..."
            docker-compose down -v
            docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
            echo ""
            echo "✅ Everything has been reset!"
        else
            echo "Cancelled."
        fi
        ;;
    5)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac
