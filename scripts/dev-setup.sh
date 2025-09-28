#!/bin/bash
# Development Environment Setup Script for Linux/macOS
# This script sets up the development environment with all necessary tools

set -e  # Exit on any error

echo "🛠️  Setting up Dranoel Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install development dependencies if not already installed
echo "🔧 Installing development tools..."
npm install -D @types/node @types/react typescript eslint prettier prisma

# Setup Prisma
echo "🗃️  Setting up Prisma..."
if [ ! -f prisma/schema.prisma ]; then
    npx prisma init
    echo "📝 Prisma initialized. Please update your schema.prisma file."
else
    echo "✅ Prisma schema already exists"
fi

# Generate Prisma client
npx prisma generate

# Setup Git hooks (if using husky)
if [ -f .husky/pre-commit ]; then
    echo "🪝 Setting up Git hooks..."
    npx husky install
fi

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p src/components
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/types
mkdir -p public/images
mkdir -p docs
mkdir -p tests
mkdir -p backups

echo "🔧 Setting up environment files..."
if [ ! -f .env ] && [ ! -f .env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "⚠️  No .env.example found, creating basic .env template..."
        cat > .env << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dranoel_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: External APIs
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
EOF
        echo "📝 Created basic .env template. Please update with your values."
    fi
fi

# Setup VS Code settings (if .vscode directory doesn't exist)
if [ ! -d .vscode ]; then
    echo "⚙️  Setting up VS Code configuration..."
    mkdir -p .vscode

    # Create settings.json
    cat > .vscode/settings.json << EOF
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/.next": true,
    "**/node_modules": true,
    "**/.git": true
  }
}
EOF

    # Create extensions.json
    cat > .vscode/extensions.json << EOF
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma"
  ]
}
EOF
    echo "✅ VS Code configuration created"
fi

echo "🧪 Running initial tests..."
npm run lint || echo "⚠️  Linting issues found - please fix them"
npm run typecheck || echo "⚠️  Type checking issues found - please fix them"

echo ""
echo "✅ Development environment setup completed!"
echo ""
echo "🚀 Next steps:"
echo "   1. Update your .env file with actual database credentials"
echo "   2. Run: ./scripts/start-app.sh to start the application"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "💡 Available commands:"
echo "   npm run dev          - Start development server"
echo "   npm run build        - Build for production"
echo "   npm run start        - Start production server"
echo "   npm run lint         - Run ESLint"
echo "   npm run typecheck    - Run TypeScript checks"
echo "   npx prisma studio    - Open Prisma Studio"
echo ""