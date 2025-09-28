@echo off
REM Database Backup Script for Windows
REM This script will create a backup of your database

echo 💾 Starting Database Backup Process...

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

REM Create backups directory if it doesn't exist
if not exist backups mkdir backups

REM Generate timestamp for backup filename
for /f "tokens=1-6 delims=/:. " %%a in ("%date% %time%") do (
    set TIMESTAMP=%%c%%a%%b_%%d%%e%%f
)
set TIMESTAMP=%TIMESTAMP: =0%

set BACKUP_DIR=backups
set BACKUP_FILE=%BACKUP_DIR%\dranoel_backup_%TIMESTAMP%

echo 📊 Database: %DATABASE_URL%
echo 📁 Backup will be saved to: %BACKUP_FILE%

REM Parse DATABASE_URL to extract components
REM This is a simplified parser - you might need to adjust based on your URL format
echo 🔄 Creating database backup...

REM For PostgreSQL with pg_dump (requires PostgreSQL client tools)
REM You'll need to parse the DATABASE_URL and extract components
REM This is a basic template - adjust connection details as needed

echo ⚠️  Please ensure pg_dump is installed and accessible in PATH
echo ⚠️  You may need to manually set connection parameters

REM Example for local PostgreSQL:
REM pg_dump -h localhost -p 5432 -U your_username -d your_database --verbose --clean --no-owner --no-privileges --file="%BACKUP_FILE%.sql"

REM For now, we'll use Prisma's built-in backup approach
echo 📦 Creating Prisma schema snapshot...
call npx prisma db pull --print > "%BACKUP_FILE%.schema.prisma"
if errorlevel 1 (
    echo ❌ Failed to create schema backup
    pause
    exit /b 1
)

echo 🗃️  Creating data export using custom script...
call node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function exportData() {
  const prisma = new PrismaClient();
  const data = {};

  try {
    // Get all model names from Prisma schema
    const models = Object.keys(prisma).filter(key =>
      !key.startsWith('_') &&
      !key.startsWith('$') &&
      typeof prisma[key].findMany === 'function'
    );

    console.log('📊 Exporting data for models:', models.join(', '));

    for (const model of models) {
      try {
        data[model] = await prisma[model].findMany();
        console.log('✅ Exported', data[model].length, model, 'records');
      } catch (error) {
        console.log('⚠️  Could not export', model, ':', error.message);
        data[model] = [];
      }
    }

    const exportFile = '%BACKUP_FILE%.json';
    fs.writeFileSync(exportFile, JSON.stringify(data, null, 2));
    console.log('💾 Data exported to:', exportFile);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
"

if errorlevel 1 (
    echo ❌ Data export failed
    pause
    exit /b 1
)

echo.
echo 📋 Backup Information:
echo    📅 Timestamp: %TIMESTAMP%
echo    📋 Schema backup: %BACKUP_FILE%.schema.prisma
echo    💿 Data backup: %BACKUP_FILE%.json
echo.
echo ✅ Database backup completed successfully!
echo.
echo 💡 To restore this backup:
echo    1. Reset your database: scripts\reset-db.bat
echo    2. Apply schema: npx prisma db push
echo    3. Import data using custom restore script
echo.
pause