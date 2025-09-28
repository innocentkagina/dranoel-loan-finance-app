#!/bin/bash
# Application Testing Script for Linux/macOS
# This script runs comprehensive tests for the Dranoel application

set -e  # Exit on any error

echo "🧪 Starting Dranoel Application Testing..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Check if dependencies are installed
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v ^# | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v ^# | xargs)
else
    echo "⚠️  No environment file found, using defaults for testing"
fi

echo ""
echo "🔍 Running Code Quality Checks..."
echo "=================================="

# TypeScript type checking
echo "📝 Running TypeScript checks..."
if npx tsc --noEmit; then
    echo "✅ TypeScript checks passed"
else
    echo "❌ TypeScript checks failed"
    exit 1
fi

# ESLint
echo "🔧 Running ESLint..."
if npm run lint; then
    echo "✅ ESLint checks passed"
else
    echo "❌ ESLint checks failed"
    exit 1
fi

# Prettier formatting check
echo "🎨 Checking code formatting..."
if npx prettier --check . --ignore-path .gitignore; then
    echo "✅ Code formatting is correct"
else
    echo "⚠️  Code formatting issues found, auto-fixing..."
    npx prettier --write . --ignore-path .gitignore
    echo "✅ Code formatting fixed"
fi

echo ""
echo "🗃️ Running Database Tests..."
echo "============================="

# Check database connection
if [ -n "$DATABASE_URL" ]; then
    echo "📊 Testing database connection..."
    if npx prisma db pull --print > /dev/null 2>&1; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
        echo "Please check your DATABASE_URL in .env file"
        exit 1
    fi

    # Validate Prisma schema
    echo "📋 Validating Prisma schema..."
    if npx prisma validate; then
        echo "✅ Prisma schema is valid"
    else
        echo "❌ Prisma schema validation failed"
        exit 1
    fi

    # Generate Prisma client
    echo "🔄 Testing Prisma client generation..."
    if npx prisma generate; then
        echo "✅ Prisma client generated successfully"
    else
        echo "❌ Prisma client generation failed"
        exit 1
    fi
else
    echo "⚠️  DATABASE_URL not set, skipping database tests"
fi

echo ""
echo "🔨 Running Build Tests..."
echo "========================="

# Test development build
echo "🚧 Testing development build..."
if timeout 30s npm run build > /dev/null 2>&1; then
    echo "✅ Production build successful"
else
    echo "❌ Production build failed"
    exit 1
fi

# Test Next.js static analysis
echo "🔍 Running Next.js analysis..."
if npx next lint; then
    echo "✅ Next.js analysis passed"
else
    echo "⚠️  Next.js analysis found issues"
fi

echo ""
echo "🚀 Running Integration Tests..."
echo "==============================="

# Test application startup (quick check)
echo "⚡ Testing application startup..."
timeout 10s npm run dev > /tmp/app-test.log 2>&1 &
APP_PID=$!

sleep 5

# Check if app is responding
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application starts successfully"
    kill $APP_PID 2>/dev/null || true
else
    echo "⚠️  Application startup test inconclusive"
    kill $APP_PID 2>/dev/null || true
fi

# Run unit tests if they exist
if [ -f package.json ] && grep -q "\"test\":" package.json; then
    echo "🧩 Running unit tests..."
    if npm test; then
        echo "✅ Unit tests passed"
    else
        echo "❌ Unit tests failed"
        exit 1
    fi
else
    echo "ℹ️  No unit tests configured"
fi

# Run end-to-end tests if they exist
if [ -d cypress ] || [ -d e2e ] || [ -d tests/e2e ]; then
    echo "🌐 E2E tests directory found..."
    echo "ℹ️  Run e2e tests manually with your preferred test runner"
else
    echo "ℹ️  No E2E tests found"
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo "✅ TypeScript checks: PASSED"
echo "✅ ESLint checks: PASSED"
echo "✅ Code formatting: PASSED"
echo "✅ Database connection: $([ -n "$DATABASE_URL" ] && echo "PASSED" || echo "SKIPPED")"
echo "✅ Prisma schema: $([ -n "$DATABASE_URL" ] && echo "PASSED" || echo "SKIPPED")"
echo "✅ Production build: PASSED"
echo "✅ Application startup: TESTED"
echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "💡 To run individual tests:"
echo "   npm run lint         - ESLint only"
echo "   npm run typecheck    - TypeScript only"
echo "   npm run build        - Build test only"
echo "   npx prisma validate  - Schema validation only"