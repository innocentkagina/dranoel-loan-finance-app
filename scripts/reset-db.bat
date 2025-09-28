@echo off
REM Database Reset Script for Windows
REM This script will reset the database and run fresh migrations

echo 🔄 Starting Database Reset Process...

REM Check if .env.local exists, otherwise check .env
if exist .env.local (
    for /f "usebackq tokens=1,2 delims==" %%i in (.env.local) do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
) else if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%i in (.env) do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
) else (
    echo ❌ No environment file found (.env or .env.local)
    pause
    exit /b 1
)

REM Check if DATABASE_URL is set
if not defined DATABASE_URL (
    echo ❌ DATABASE_URL not found in environment variables
    pause
    exit /b 1
)

echo 📊 Current database: %DATABASE_URL%
set /p confirm="⚠️  This will DELETE ALL DATA in your database. Continue? (y/N): "

if /i not "%confirm%"=="y" (
    echo ❌ Operation cancelled
    pause
    exit /b 0
)

echo 🗑️  Resetting database...

REM Reset database with Prisma
call npx prisma db push --force-reset
if errorlevel 1 (
    echo ❌ Failed to reset database
    pause
    exit /b 1
)

echo 📦 Running fresh migrations...

REM Generate Prisma client
call npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

echo 🌱 Seeding database (if seed script exists)...

REM Run seed if it exists
if exist prisma\seed.ts (
    call npx prisma db seed
) else if exist prisma\seed.js (
    call npx prisma db seed
) else (
    echo ℹ️  No seed script found, skipping seeding
)

echo ✅ Database reset completed successfully!
echo 🚀 You can now start your application
pause