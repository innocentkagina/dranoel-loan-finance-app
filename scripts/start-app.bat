@echo off
REM Application Startup Script for Windows
REM This script will setup and run the complete Dranoel application

echo 🚀 Starting Dranoel Application Setup...

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js version: %NODE_VERSION%
echo ✅ npm version: %NPM_VERSION%

REM Check if .env file exists
if not exist .env if not exist .env.local (
    echo ⚠️  No environment file found!
    echo 📝 Creating .env from .env.example...

    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ Created .env file from .env.example
        echo ⚠️  Please edit .env file with your actual values before continuing
        pause
    ) else (
        echo ❌ No .env.example found. Please create .env file manually.
        pause
        exit /b 1
    )
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
)

REM Check for required environment variables
if not defined DATABASE_URL (
    echo ❌ DATABASE_URL not found in environment variables
    echo Please set DATABASE_URL in your .env file
    pause
    exit /b 1
)

if not defined NEXTAUTH_SECRET (
    echo ❌ NEXTAUTH_SECRET not found in environment variables
    echo Please set NEXTAUTH_SECRET in your .env file
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

echo 🔄 Setting up database...

REM Generate Prisma client
echo 📦 Generating Prisma client...
call npx prisma generate

if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

echo 📊 Checking database connection...
call npx prisma db push

if errorlevel 1 (
    echo ❌ Failed to connect to database or push schema
    echo Please check your DATABASE_URL and ensure your database server is running
    pause
    exit /b 1
)

echo ✅ Database setup completed

REM Run seed if it exists
if exist prisma\seed.ts (
    echo 🌱 Seeding database...
    call npx prisma db seed

    if not errorlevel 1 (
        echo ✅ Database seeded successfully
    ) else (
        echo ⚠️  Database seeding failed, but continuing...
    )
) else if exist prisma\seed.js (
    echo 🌱 Seeding database...
    call npx prisma db seed

    if not errorlevel 1 (
        echo ✅ Database seeded successfully
    ) else (
        echo ⚠️  Database seeding failed, but continuing...
    )
) else (
    echo ℹ️  No seed script found, skipping seeding
)

echo 🔧 Building application...
call npm run build

if errorlevel 1 (
    echo ❌ Build failed!
    echo ⚠️  Trying to start in development mode instead...

    echo.
    echo 🎯 Starting Dranoel Application in Development Mode...
    echo 🌐 Application will be available at: http://localhost:3000
    echo ⚠️  Press Ctrl+C to stop the application
    echo.

    call npm run dev
) else (
    echo ✅ Build completed successfully
    echo.
    echo 🎯 Starting Dranoel Application in Production Mode...
    echo 🌐 Application will be available at: http://localhost:3000
    echo ⚠️  Press Ctrl+C to stop the application
    echo.

    call npm run start
)

pause