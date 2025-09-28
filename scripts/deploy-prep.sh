#!/bin/bash
# Deployment Preparation Script for Linux/macOS
# This script prepares the application for deployment

set -e  # Exit on any error

echo "🚀 Preparing Dranoel Application for Deployment..."

# Check if we're in the right directory
if [ ! -f package.json ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Running pre-deployment checks..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v ^# | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v ^# | xargs)
fi

# Check required environment variables
echo "🔍 Checking required environment variables..."
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
    echo "✅ $var is set"
done

# Install production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Run tests
echo "🧪 Running comprehensive tests..."
./scripts/test-app.sh

# Generate Prisma client for production
echo "🗃️  Generating production Prisma client..."
npx prisma generate

# Build application
echo "🔨 Building application for production..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOY_DIR="deploy_$TIMESTAMP"

mkdir -p "$DEPLOY_DIR"

echo "📁 Copying necessary files..."
cp -r .next "$DEPLOY_DIR/"
cp -r public "$DEPLOY_DIR/"
cp -r prisma "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"
cp next.config.js "$DEPLOY_DIR/" 2>/dev/null || echo "ℹ️  No next.config.js found"

# Create production environment template
echo "📄 Creating production environment template..."
cat > "$DEPLOY_DIR/.env.production.template" << EOF
# Production Environment Variables
# Copy this file to .env.production and fill in actual values

# Database (Production)
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth (Production)
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret-key-here"

# Email (if using)
# SMTP_HOST=""
# SMTP_PORT=""
# SMTP_USER=""
# SMTP_PASSWORD=""

# External APIs (if using)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""

# Optional: Monitoring and Analytics
# SENTRY_DSN=""
# GOOGLE_ANALYTICS_ID=""
EOF

# Create deployment instructions
echo "📋 Creating deployment instructions..."
cat > "$DEPLOY_DIR/DEPLOYMENT.md" << EOF
# Dranoel Application Deployment Guide

## Prerequisites
- Node.js (v18 or later)
- PostgreSQL database
- Domain name with SSL certificate

## Deployment Steps

### 1. Setup Environment
\`\`\`bash
cp .env.production.template .env.production
# Edit .env.production with your actual values
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm ci --only=production
\`\`\`

### 3. Setup Database
\`\`\`bash
npx prisma db push
npx prisma generate
# Optional: npx prisma db seed
\`\`\`

### 4. Start Application
\`\`\`bash
npm start
\`\`\`

## PM2 Deployment (Recommended)
\`\`\`bash
npm install -g pm2
pm2 start npm --name "dranoel-app" -- start
pm2 startup
pm2 save
\`\`\`

## Docker Deployment
\`\`\`bash
# Build Docker image
docker build -t dranoel-app .

# Run container
docker run -p 3000:3000 --env-file .env.production dranoel-app
\`\`\`

## Health Checks
- Application: http://your-domain.com
- Health endpoint: http://your-domain.com/api/health

## Monitoring
- Check logs: \`pm2 logs dranoel-app\`
- Monitor processes: \`pm2 monit\`

## Backup Strategy
- Database: Schedule regular backups using provided scripts
- Files: Backup uploaded files and configurations
EOF

# Create Dockerfile if it doesn't exist
if [ ! -f Dockerfile ]; then
    echo "🐳 Creating Dockerfile..."
    cat > "$DEPLOY_DIR/Dockerfile" << EOF
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs .next ./.next
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs package.json ./
COPY --chown=nextjs:nodejs prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]
EOF
fi

# Create PM2 ecosystem file
echo "⚙️  Creating PM2 configuration..."
cat > "$DEPLOY_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'dranoel-app',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      node_args: '--max_old_space_size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
    },
  ],
};
EOF

# Create archive
echo "🗜️  Creating deployment archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR/"

echo "📊 Deployment package summary:"
echo "   📁 Directory: $DEPLOY_DIR"
echo "   🗜️  Archive: ${DEPLOY_DIR}.tar.gz"
echo "   📄 Size: $(du -h "${DEPLOY_DIR}.tar.gz" | cut -f1)"

echo ""
echo "✅ Deployment preparation completed!"
echo ""
echo "🚀 Next steps:"
echo "   1. Transfer ${DEPLOY_DIR}.tar.gz to your production server"
echo "   2. Extract: tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "   3. Follow instructions in $DEPLOY_DIR/DEPLOYMENT.md"
echo ""
echo "💡 Quick deployment commands for server:"
echo "   tar -xzf ${DEPLOY_DIR}.tar.gz && cd $DEPLOY_DIR"
echo "   cp .env.production.template .env.production"
echo "   # Edit .env.production with your values"
echo "   npm ci --only=production && npm start"