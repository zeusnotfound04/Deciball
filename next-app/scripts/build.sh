#!/bin/bash

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Build Next.js application
echo "Building Next.js application..."
npx next build

echo "Build completed successfully!"
