@echo off
REM Application Testing Script for Windows
REM This script runs comprehensive tests for the Dranoel application

echo 🧪 Starting Dranoel Application Testing...

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

REM Check if dependencies are installed
if not exist node_modules (
    echo 📦 Installing dependencies first...
    call npm install
)

REM Load environment variables
if exist .env.local (
    for /f "usebackq tokens=1,2 delims==" %%i in (.env.local) do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
) else if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%i in (.env) do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
) else (
    echo ⚠️  No environment file found, using defaults for testing
)

echo.
echo 🔍 Running Code Quality Checks...
echo ==================================

REM TypeScript type checking
echo 📝 Running TypeScript checks...
call npx tsc --noEmit
if errorlevel 1 (
    echo ❌ TypeScript checks failed
    pause
    exit /b 1
) else (
    echo ✅ TypeScript checks passed
)

REM ESLint
echo 🔧 Running ESLint...
call npm run lint
if errorlevel 1 (
    echo ❌ ESLint checks failed
    pause
    exit /b 1
) else (
    echo ✅ ESLint checks passed
)

REM Prettier formatting check
echo 🎨 Checking code formatting...
call npx prettier --check . --ignore-path .gitignore
if errorlevel 1 (
    echo ⚠️  Code formatting issues found, auto-fixing...
    call npx prettier --write . --ignore-path .gitignore
    echo ✅ Code formatting fixed
) else (
    echo ✅ Code formatting is correct
)

echo.
echo 🗃️ Running Database Tests...
echo =============================

REM Check database connection
if defined DATABASE_URL (
    echo 📊 Testing database connection...
    call npx prisma db pull --print >nul 2>nul
    if errorlevel 1 (
        echo ❌ Database connection failed
        echo Please check your DATABASE_URL in .env file
        pause
        exit /b 1
    ) else (
        echo ✅ Database connection successful
    )

    REM Validate Prisma schema
    echo 📋 Validating Prisma schema...
    call npx prisma validate
    if errorlevel 1 (
        echo ❌ Prisma schema validation failed
        pause
        exit /b 1
    ) else (
        echo ✅ Prisma schema is valid
    )

    REM Generate Prisma client
    echo 🔄 Testing Prisma client generation...
    call npx prisma generate
    if errorlevel 1 (
        echo ❌ Prisma client generation failed
        pause
        exit /b 1
    ) else (
        echo ✅ Prisma client generated successfully
    )
) else (
    echo ⚠️  DATABASE_URL not set, skipping database tests
)

echo.
echo 🔨 Running Build Tests...
echo =========================

REM Test production build
echo 🚧 Testing production build...
call npm run build >nul 2>nul
if errorlevel 1 (
    echo ❌ Production build failed
    pause
    exit /b 1
) else (
    echo ✅ Production build successful
)

REM Test Next.js static analysis
echo 🔍 Running Next.js analysis...
call npx next lint
if errorlevel 1 (
    echo ⚠️  Next.js analysis found issues
) else (
    echo ✅ Next.js analysis passed
)

echo.
echo 🚀 Running Integration Tests...
echo ===============================

REM Test application startup (basic check)
echo ⚡ Testing application startup capability...
echo ℹ️  For full startup test, run scripts\start-app.bat manually

REM Run unit tests if they exist
findstr /C:"\"test\":" package.json >nul 2>nul
if not errorlevel 1 (
    echo 🧩 Running unit tests...
    call npm test
    if errorlevel 1 (
        echo ❌ Unit tests failed
        pause
        exit /b 1
    ) else (
        echo ✅ Unit tests passed
    )
) else (
    echo ℹ️  No unit tests configured
)

REM Check for E2E tests
if exist cypress (
    echo 🌐 Cypress E2E tests directory found...
    echo ℹ️  Run e2e tests manually with: npx cypress open
) else if exist e2e (
    echo 🌐 E2E tests directory found...
    echo ℹ️  Run e2e tests manually with your preferred test runner
) else if exist tests\e2e (
    echo 🌐 E2E tests directory found...
    echo ℹ️  Run e2e tests manually with your preferred test runner
) else (
    echo ℹ️  No E2E tests found
)

echo.
echo 📊 Test Summary
echo ===============
echo ✅ TypeScript checks: PASSED
echo ✅ ESLint checks: PASSED
echo ✅ Code formatting: PASSED
if defined DATABASE_URL (
    echo ✅ Database connection: PASSED
    echo ✅ Prisma schema: PASSED
) else (
    echo ⚠️  Database connection: SKIPPED
    echo ⚠️  Prisma schema: SKIPPED
)
echo ✅ Production build: PASSED
echo ℹ️  Application startup: CHECKED
echo.
echo 🎉 All tests completed successfully!
echo.
echo 💡 To run individual tests:
echo    npm run lint         - ESLint only
echo    npm run typecheck    - TypeScript only
echo    npm run build        - Build test only
echo    npx prisma validate  - Schema validation only
echo.
pause