@echo off
REM Deployment Preparation Script for Windows
REM This script prepares the application for deployment

echo 🚀 Preparing Dranoel Application for Deployment...

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

echo 📋 Running pre-deployment checks...

REM Load environment variables
if exist .env.local (
    for /f "usebackq tokens=1,2 delims==" %%i in (.env.local) do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
) else if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%i in (.env) do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
)

REM Check required environment variables
echo 🔍 Checking required environment variables...

if not defined DATABASE_URL (
    echo ❌ Required environment variable DATABASE_URL is not set
    pause
    exit /b 1
) else (
    echo ✅ DATABASE_URL is set
)

if not defined NEXTAUTH_SECRET (
    echo ❌ Required environment variable NEXTAUTH_SECRET is not set
    pause
    exit /b 1
) else (
    echo ✅ NEXTAUTH_SECRET is set
)

if not defined NEXTAUTH_URL (
    echo ❌ Required environment variable NEXTAUTH_URL is not set
    pause
    exit /b 1
) else (
    echo ✅ NEXTAUTH_URL is set
)

REM Install production dependencies
echo 📦 Installing production dependencies...
call npm ci --only=production

REM Run tests
echo 🧪 Running comprehensive tests...
call scripts\test-app.bat

REM Generate Prisma client for production
echo 🗃️  Generating production Prisma client...
call npx prisma generate

REM Build application
echo 🔨 Building application for production...
call npm run build

REM Create deployment package
echo 📦 Creating deployment package...
for /f "tokens=1-6 delims=/:. " %%a in ("%date% %time%") do (
    set TIMESTAMP=%%c%%a%%b_%%d%%e%%f
)
set TIMESTAMP=%TIMESTAMP: =0%
set DEPLOY_DIR=deploy_%TIMESTAMP%

mkdir "%DEPLOY_DIR%"

echo 📁 Copying necessary files...
xcopy /E /I .next "%DEPLOY_DIR%\.next" >nul
xcopy /E /I public "%DEPLOY_DIR%\public" >nul
xcopy /E /I prisma "%DEPLOY_DIR%\prisma" >nul
copy package.json "%DEPLOY_DIR%\" >nul
copy package-lock.json "%DEPLOY_DIR%\" >nul
if exist next.config.js copy next.config.js "%DEPLOY_DIR%\" >nul

REM Create production environment template
echo 📄 Creating production environment template...
(
    echo # Production Environment Variables
    echo # Copy this file to .env.production and fill in actual values
    echo.
    echo # Database ^(Production^)
    echo DATABASE_URL="postgresql://username:password@host:port/database"
    echo.
    echo # NextAuth ^(Production^)
    echo NEXTAUTH_URL="https://yourdomain.com"
    echo NEXTAUTH_SECRET="your-production-secret-key-here"
    echo.
    echo # Email ^(if using^)
    echo # SMTP_HOST=""
    echo # SMTP_PORT=""
    echo # SMTP_USER=""
    echo # SMTP_PASSWORD=""
    echo.
    echo # External APIs ^(if using^)
    echo # GOOGLE_CLIENT_ID=""
    echo # GOOGLE_CLIENT_SECRET=""
    echo.
    echo # Optional: Monitoring and Analytics
    echo # SENTRY_DSN=""
    echo # GOOGLE_ANALYTICS_ID=""
) > "%DEPLOY_DIR%\.env.production.template"

REM Create deployment instructions
echo 📋 Creating deployment instructions...
(
    echo # Dranoel Application Deployment Guide
    echo.
    echo ## Prerequisites
    echo - Node.js ^(v18 or later^)
    echo - PostgreSQL database
    echo - Domain name with SSL certificate
    echo.
    echo ## Deployment Steps
    echo.
    echo ### 1. Setup Environment
    echo ```bash
    echo cp .env.production.template .env.production
    echo # Edit .env.production with your actual values
    echo ```
    echo.
    echo ### 2. Install Dependencies
    echo ```bash
    echo npm ci --only=production
    echo ```
    echo.
    echo ### 3. Setup Database
    echo ```bash
    echo npx prisma db push
    echo npx prisma generate
    echo # Optional: npx prisma db seed
    echo ```
    echo.
    echo ### 4. Start Application
    echo ```bash
    echo npm start
    echo ```
    echo.
    echo ## PM2 Deployment ^(Recommended^)
    echo ```bash
    echo npm install -g pm2
    echo pm2 start npm --name "dranoel-app" -- start
    echo pm2 startup
    echo pm2 save
    echo ```
    echo.
    echo ## Health Checks
    echo - Application: http://your-domain.com
    echo - Health endpoint: http://your-domain.com/api/health
    echo.
    echo ## Monitoring
    echo - Check logs: `pm2 logs dranoel-app`
    echo - Monitor processes: `pm2 monit`
    echo.
    echo ## Backup Strategy
    echo - Database: Schedule regular backups using provided scripts
    echo - Files: Backup uploaded files and configurations
) > "%DEPLOY_DIR%\DEPLOYMENT.md"

REM Create Dockerfile if it doesn't exist
if not exist Dockerfile (
    echo 🐳 Creating Dockerfile...
    (
        echo FROM node:18-alpine AS deps
        echo RUN apk add --no-cache libc6-compat
        echo WORKDIR /app
        echo COPY package.json package-lock.json ./
        echo RUN npm ci --only=production
        echo.
        echo FROM node:18-alpine AS runner
        echo WORKDIR /app
        echo.
        echo ENV NODE_ENV production
        echo.
        echo RUN addgroup --system --gid 1001 nodejs
        echo RUN adduser --system --uid 1001 nextjs
        echo.
        echo COPY --from=deps /app/node_modules ./node_modules
        echo COPY --chown=nextjs:nodejs .next ./.next
        echo COPY --chown=nextjs:nodejs public ./public
        echo COPY --chown=nextjs:nodejs package.json ./
        echo COPY --chown=nextjs:nodejs prisma ./prisma
        echo.
        echo USER nextjs
        echo.
        echo EXPOSE 3000
        echo.
        echo ENV PORT 3000
        echo.
        echo CMD ["npm", "start"]
    ) > "%DEPLOY_DIR%\Dockerfile"
)

REM Create PM2 ecosystem file
echo ⚙️  Creating PM2 configuration...
(
    echo module.exports = {
    echo   apps: [
    echo     {
    echo       name: 'dranoel-app',
    echo       script: 'npm',
    echo       args: 'start',
    echo       cwd: './',
    echo       instances: 'max',
    echo       exec_mode: 'cluster',
    echo       env: {
    echo         NODE_ENV: 'production',
    echo         PORT: 3000,
    echo       },
    echo       env_production: {
    echo         NODE_ENV: 'production',
    echo         PORT: 3000,
    echo       },
    echo       log_file: './logs/combined.log',
    echo       out_file: './logs/out.log',
    echo       error_file: './logs/error.log',
    echo       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    echo       max_memory_restart: '1G',
    echo       node_args: '--max_old_space_size=1024',
    echo       watch: false,
    echo       ignore_watch: ['node_modules', 'logs', '.next'],
    echo     },
    echo   ],
    echo };
) > "%DEPLOY_DIR%\ecosystem.config.js"

REM Create ZIP archive (since tar is not available on Windows by default)
if exist "%ProgramFiles%\7-Zip\7z.exe" (
    echo 🗜️  Creating deployment archive with 7-Zip...
    "%ProgramFiles%\7-Zip\7z.exe" a -tzip "%DEPLOY_DIR%.zip" "%DEPLOY_DIR%\"
) else if exist "%ProgramFiles(x86)%\7-Zip\7z.exe" (
    echo 🗜️  Creating deployment archive with 7-Zip...
    "%ProgramFiles(x86)%\7-Zip\7z.exe" a -tzip "%DEPLOY_DIR%.zip" "%DEPLOY_DIR%\"
) else (
    echo ⚠️  7-Zip not found. Please manually zip the %DEPLOY_DIR% folder
)

for /f %%i in ('dir "%DEPLOY_DIR%" ^| find "bytes"') do set DIR_SIZE=%%i

echo 📊 Deployment package summary:
echo    📁 Directory: %DEPLOY_DIR%
if exist "%DEPLOY_DIR%.zip" (
    echo    🗜️  Archive: %DEPLOY_DIR%.zip
    for %%i in ("%DEPLOY_DIR%.zip") do echo    📄 Size: %%~zi bytes
)

echo.
echo ✅ Deployment preparation completed!
echo.
echo 🚀 Next steps:
if exist "%DEPLOY_DIR%.zip" (
    echo    1. Transfer %DEPLOY_DIR%.zip to your production server
    echo    2. Extract the ZIP file
) else (
    echo    1. Create ZIP archive of %DEPLOY_DIR% folder manually
    echo    2. Transfer to your production server and extract
)
echo    3. Follow instructions in %DEPLOY_DIR%\DEPLOYMENT.md
echo.
echo 💡 Quick deployment commands for server:
echo    cp .env.production.template .env.production
echo    # Edit .env.production with your values
echo    npm ci --only=production ^&^& npm start
echo.
pause