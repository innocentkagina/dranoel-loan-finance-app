#!/bin/bash
# Database Reset Script for Linux/macOS
# This script will reset the database and run fresh migrations

set -e  # Exit on any error

echo "🔄 Starting Database Reset Process..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v ^# | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v ^# | xargs)
else
    echo "❌ No environment file found (.env or .env.local)"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment variables"
    exit 1
fi

echo "📊 Current database: $DATABASE_URL"
read -p "⚠️  This will DELETE ALL DATA in your database. Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo "🗑️  Resetting database..."

# Reset database with Prisma
npx prisma db push --force-reset

echo "📦 Running fresh migrations..."

# Generate Prisma client
npx prisma generate

echo "🌱 Seeding database (if seed script exists)..."

# Run seed if it exists
if [ -f prisma/seed.ts ] || [ -f prisma/seed.js ]; then
    npx prisma db seed
else
    echo "ℹ️  No seed script found, skipping seeding"
fi

echo "✅ Database reset completed successfully!"
echo "🚀 You can now start your application"