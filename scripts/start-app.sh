#!/bin/bash
# Application Startup Script for Linux/macOS
# This script will setup and run the complete Dranoel application

set -e  # Exit on any error

echo "🚀 Starting Dranoel Application Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Check if .env file exists
if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo "⚠️  No environment file found!"
    echo "📝 Creating .env from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please edit .env file with your actual values before continuing"
        read -p "Press Enter after you've updated the .env file..."
    else
        echo "❌ No .env.example found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v ^# | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v ^# | xargs)
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment variables"
    echo "Please set DATABASE_URL in your .env file"
    exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "❌ NEXTAUTH_SECRET not found in environment variables"
    echo "Please set NEXTAUTH_SECRET in your .env file"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

echo "🔄 Setting up database..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "📊 Checking database connection..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to database or push schema"
    echo "Please check your DATABASE_URL and ensure your database server is running"
    exit 1
fi

echo "✅ Database setup completed"

# Run seed if it exists
if [ -f prisma/seed.ts ] || [ -f prisma/seed.js ]; then
    echo "🌱 Seeding database..."
    npx prisma db seed

    if [ $? -eq 0 ]; then
        echo "✅ Database seeded successfully"
    else
        echo "⚠️  Database seeding failed, but continuing..."
    fi
else
    echo "ℹ️  No seed script found, skipping seeding"
fi

echo "🔧 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    echo "⚠️  Trying to start in development mode instead..."

    echo ""
    echo "🎯 Starting Dranoel Application in Development Mode..."
    echo "🌐 Application will be available at: http://localhost:3000"
    echo "⚠️  Press Ctrl+C to stop the application"
    echo ""

    npm run dev
else
    echo "✅ Build completed successfully"
    echo ""
    echo "🎯 Starting Dranoel Application in Production Mode..."
    echo "🌐 Application will be available at: http://localhost:3000"
    echo "⚠️  Press Ctrl+C to stop the application"
    echo ""

    npm run start
fi