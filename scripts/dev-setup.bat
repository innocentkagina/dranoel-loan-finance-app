@echo off
REM Development Environment Setup Script for Windows
REM This script sets up the development environment with all necessary tools

echo 🛠️  Setting up Dranoel Development Environment...

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js version: %NODE_VERSION%
echo ✅ npm version: %NPM_VERSION%

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Install development dependencies if not already installed
echo 🔧 Installing development tools...
call npm install -D @types/node @types/react typescript eslint prettier prisma

REM Setup Prisma
echo 🗃️  Setting up Prisma...
if not exist prisma\schema.prisma (
    call npx prisma init
    echo 📝 Prisma initialized. Please update your schema.prisma file.
) else (
    echo ✅ Prisma schema already exists
)

REM Generate Prisma client
call npx prisma generate

REM Setup Git hooks (if using husky)
if exist .husky\pre-commit (
    echo 🪝 Setting up Git hooks...
    call npx husky install
)

REM Create necessary directories
echo 📁 Creating project directories...
if not exist src\components mkdir src\components
if not exist src\lib mkdir src\lib
if not exist src\hooks mkdir src\hooks
if not exist src\types mkdir src\types
if not exist public\images mkdir public\images
if not exist docs mkdir docs
if not exist tests mkdir tests
if not exist backups mkdir backups

echo 🔧 Setting up environment files...
if not exist .env if not exist .env.local (
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ Created .env from .env.example
    ) else (
        echo ⚠️  No .env.example found, creating basic .env template...
        (
            echo # Database
            echo DATABASE_URL="postgresql://username:password@localhost:5432/dranoel_db"
            echo.
            echo # NextAuth
            echo NEXTAUTH_URL="http://localhost:3000"
            echo NEXTAUTH_SECRET="your-secret-key-here"
            echo.
            echo # Optional: External APIs
            echo # GOOGLE_CLIENT_ID=""
            echo # GOOGLE_CLIENT_SECRET=""
        ) > .env
        echo 📝 Created basic .env template. Please update with your values.
    )
)

REM Setup VS Code settings (if .vscode directory doesn't exist)
if not exist .vscode (
    echo ⚙️  Setting up VS Code configuration...
    mkdir .vscode

    REM Create settings.json
    (
        echo {
        echo   "typescript.preferences.importModuleSpecifier": "non-relative",
        echo   "editor.formatOnSave": true,
        echo   "editor.defaultFormatter": "esbenp.prettier-vscode",
        echo   "editor.codeActionsOnSave": {
        echo     "source.fixAll.eslint": true
        echo   },
        echo   "files.exclude": {
        echo     "**/.next": true,
        echo     "**/node_modules": true,
        echo     "**/.git": true
        echo   }
        echo }
    ) > .vscode\settings.json

    REM Create extensions.json
    (
        echo {
        echo   "recommendations": [
        echo     "bradlc.vscode-tailwindcss",
        echo     "esbenp.prettier-vscode",
        echo     "dbaeumer.vscode-eslint",
        echo     "ms-vscode.vscode-typescript-next",
        echo     "prisma.prisma"
        echo   ]
        echo }
    ) > .vscode\extensions.json
    echo ✅ VS Code configuration created
)

echo 🧪 Running initial tests...
call npm run lint || echo ⚠️  Linting issues found - please fix them
call npm run typecheck || echo ⚠️  Type checking issues found - please fix them

echo.
echo ✅ Development environment setup completed!
echo.
echo 🚀 Next steps:
echo    1. Update your .env file with actual database credentials
echo    2. Run: scripts\start-app.bat to start the application
echo    3. Open http://localhost:3000 in your browser
echo.
echo 💡 Available commands:
echo    npm run dev          - Start development server
echo    npm run build        - Build for production
echo    npm run start        - Start production server
echo    npm run lint         - Run ESLint
echo    npm run typecheck    - Run TypeScript checks
echo    npx prisma studio    - Open Prisma Studio
echo.
pause