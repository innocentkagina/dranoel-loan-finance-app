# Dranoel Application Scripts

This directory contains utility scripts for managing the Dranoel financial application. All scripts are available for both Linux/macOS (`.sh`) and Windows (`.bat`) environments.

## 🚀 Quick Start Scripts

### Application Management

#### `start-app` - Complete Application Setup and Launch
**Purpose:** Sets up and runs the complete Dranoel application from scratch

**Linux/macOS:**
```bash
chmod +x scripts/start-app.sh
./scripts/start-app.sh
```

**Windows:**
```cmd
scripts\start-app.bat
```

**What it does:**
- ✅ Checks Node.js and npm installation
- ✅ Creates `.env` from `.env.example` if missing
- ✅ Installs dependencies
- ✅ Sets up and connects to database
- ✅ Generates Prisma client
- ✅ Runs database migrations
- ✅ Seeds database (if seed script exists)
- ✅ Builds application
- ✅ Starts application on http://localhost:3000

---

### Database Management

#### `reset-db` - Reset Database
**Purpose:** Completely resets the database with fresh migrations

**Linux/macOS:**
```bash
chmod +x scripts/reset-db.sh
./scripts/reset-db.sh
```

**Windows:**
```cmd
scripts\reset-db.bat
```

**What it does:**
- ⚠️  **DESTRUCTIVE:** Deletes ALL existing data
- 🔄 Resets database with `prisma db push --force-reset`
- 📦 Generates fresh Prisma client
- 🌱 Runs seed script if available

#### `backup-db` - Database Backup
**Purpose:** Creates comprehensive database backups

**Linux/macOS:**
```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

**Windows:**
```cmd
scripts\backup-db.bat
```

**What it does:**
- 💾 Creates full database dump (Linux: SQL format, Windows: JSON format)
- 📋 Creates schema-only backup
- 🗜️ Compresses backups (Linux: gzip)
- 📊 Shows backup information and restore instructions

---

### Development Tools

#### `dev-setup` - Development Environment Setup
**Purpose:** Sets up complete development environment

**Linux/macOS:**
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

**Windows:**
```cmd
scripts\dev-setup.bat
```

**What it does:**
- 📦 Installs all dependencies including dev dependencies
- 🗃️  Initializes Prisma if needed
- 📁 Creates necessary project directories
- 🔧 Sets up environment files
- ⚙️ Configures VS Code settings and extensions
- 🧪 Runs initial code quality checks

#### `test-app` - Comprehensive Testing
**Purpose:** Runs all application tests and quality checks

**Linux/macOS:**
```bash
chmod +x scripts/test-app.sh
./scripts/test-app.sh
```

**Windows:**
```cmd
scripts\test-app.bat
```

**What it does:**
- 📝 TypeScript type checking
- 🔧 ESLint code quality checks
- 🎨 Prettier code formatting validation
- 🗃️ Database connection testing
- 📋 Prisma schema validation
- 🔨 Production build testing
- 🧩 Unit tests (if configured)
- ⚡ Basic application startup test

---

### Deployment

#### `deploy-prep` - Deployment Preparation
**Purpose:** Prepares application for production deployment

**Linux/macOS:**
```bash
chmod +x scripts/deploy-prep.sh
./scripts/deploy-prep.sh
```

**Windows:**
```cmd
scripts\deploy-prep.bat
```

**What it does:**
- ✅ Validates environment variables
- 🧪 Runs comprehensive tests
- 📦 Installs production dependencies
- 🔨 Builds production application
- 📦 Creates deployment package
- 📄 Generates deployment documentation
- 🐳 Creates Dockerfile
- ⚙️ Creates PM2 configuration
- 🗜️ Archives deployment package

---

## 📋 Usage Examples

### Fresh Installation
```bash
# 1. Setup development environment
./scripts/dev-setup.sh       # Linux/macOS
# OR
scripts\dev-setup.bat        # Windows

# 2. Start application
./scripts/start-app.sh        # Linux/macOS
# OR
scripts\start-app.bat        # Windows
```

### Daily Development Workflow
```bash
# Run tests before committing
./scripts/test-app.sh         # Linux/macOS
scripts\test-app.bat         # Windows

# Reset database for testing
./scripts/reset-db.sh         # Linux/macOS
scripts\reset-db.bat         # Windows
```

### Backup Before Major Changes
```bash
# Create backup
./scripts/backup-db.sh        # Linux/macOS
scripts\backup-db.bat        # Windows

# Make changes...

# Restore if needed (manual process using generated instructions)
```

### Deployment Preparation
```bash
# Prepare for deployment
./scripts/deploy-prep.sh      # Linux/macOS
scripts\deploy-prep.bat      # Windows

# Transfer generated package to production server
```

---

## 🔧 Prerequisites

### System Requirements
- **Node.js:** v18 or later
- **npm:** v8 or later
- **PostgreSQL:** v12 or later (for production)

### Linux/macOS Additional Requirements
- **bash:** For script execution
- **pg_dump:** For database backups (part of PostgreSQL client tools)
- **curl:** For application testing
- **tar/gzip:** For archive creation

### Windows Additional Requirements
- **Command Prompt** or **PowerShell**
- **7-Zip:** (Optional) For archive creation in deploy-prep script
- **PostgreSQL client tools:** (Optional) For advanced database operations

---

## 🌍 Environment Variables

### Required Variables
```env
DATABASE_URL="postgresql://username:password@localhost:5432/dranoel_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### Optional Variables
```env
# Email Configuration
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""

# External APIs
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Monitoring
SENTRY_DSN=""
GOOGLE_ANALYTICS_ID=""
```

---

## 📁 Generated Files and Directories

### Backup Files (`backup-db`)
```
backups/
├── dranoel_backup_YYYYMMDD_HHMMSS.sql.gz      # Full backup (Linux)
├── dranoel_backup_YYYYMMDD_HHMMSS.schema.sql.gz  # Schema only (Linux)
├── dranoel_backup_YYYYMMDD_HHMMSS.json        # Data export (Windows)
└── dranoel_backup_YYYYMMDD_HHMMSS.schema.prisma  # Schema (Windows)
```

### Deployment Package (`deploy-prep`)
```
deploy_YYYYMMDD_HHMMSS/
├── .next/                          # Built application
├── public/                         # Static assets
├── prisma/                         # Database schema
├── package.json                    # Dependencies
├── .env.production.template        # Environment template
├── DEPLOYMENT.md                   # Deployment guide
├── Dockerfile                      # Docker configuration
└── ecosystem.config.js            # PM2 configuration
```

---

## 🚨 Important Notes

### Security
- ⚠️ **Never commit `.env` files** to version control
- 🔒 **Always use strong secrets** in production
- 🔐 **Database backups may contain sensitive data** - store securely
- 🛡️ **Review generated deployment files** before transferring to production

### Database Operations
- ⚠️ **`reset-db` is destructive** - creates backup before if needed
- 💾 **Regular backups recommended** before major changes
- 🔄 **Test restore procedures** in development environment first

### Cross-Platform Compatibility
- 📝 All scripts have both Linux/macOS (`.sh`) and Windows (`.bat`) versions
- 🔧 Windows scripts may require additional tools for full functionality
- 📋 Check prerequisites section for platform-specific requirements

---

## 🆘 Troubleshooting

### Common Issues

#### "Command not found" (Linux/macOS)
```bash
# Make script executable
chmod +x scripts/script-name.sh
```

#### "Permission denied" (Windows)
```cmd
# Run Command Prompt as Administrator
# Or check Windows Execution Policy for PowerShell
```

#### "Database connection failed"
1. Check if PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` file
3. Ensure database exists
4. Check network connectivity (if remote database)

#### "Build failed"
1. Run `npm run lint` to check for code issues
2. Run `npm run typecheck` for TypeScript errors
3. Check `package.json` scripts configuration
4. Ensure all dependencies are installed

#### "Port already in use"
1. Change port in `.env` file: `PORT=3001`
2. Kill existing processes: `pkill -f "node.*3000"` (Linux/macOS)
3. Use different port for development

---

## 📞 Support

### Getting Help
1. Check this README for common solutions
2. Review script output for specific error messages
3. Check application logs in development mode
4. Verify environment variables are correctly set

### Script Debugging
Add debugging to scripts by setting environment variables:
```bash
# Linux/macOS
DEBUG=1 ./scripts/script-name.sh

# Windows
set DEBUG=1 && scripts\script-name.bat
```

---

**💡 Pro Tip:** Always test scripts in a development environment before using them in production!