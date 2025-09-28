@echo off
REM Quick Start Script for Windows
REM This script provides a menu-driven interface for common operations

title Dranoel Application Quick Start

:main_menu
cls
echo 🚀 Dranoel Application Quick Start Menu
echo =====================================
echo.
echo Available Actions:
echo 1. 🛠️  Setup Development Environment (dev-setup)
echo 2. 🚀 Start Application (start-app)
echo 3. 🧪 Run Tests (test-app)
echo 4. 🗑️  Reset Database (reset-db)
echo 5. 💾 Backup Database (backup-db)
echo 6. 📦 Prepare Deployment (deploy-prep)
echo 7. ℹ️  View Application Status
echo 8. 📋 View Help/Documentation
echo 9. ❌ Exit
echo.

set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto dev_setup
if "%choice%"=="2" goto start_app
if "%choice%"=="3" goto test_app
if "%choice%"=="4" goto reset_db
if "%choice%"=="5" goto backup_db
if "%choice%"=="6" goto deploy_prep
if "%choice%"=="7" goto check_status
if "%choice%"=="8" goto show_help
if "%choice%"=="9" goto exit_script

echo ❌ Invalid option. Please choose 1-9.
pause
goto main_menu

:dev_setup
echo.
echo 🛠️  Running Development Setup...
call scripts\dev-setup.bat
echo ✅ Development setup completed!
goto continue

:start_app
echo.
echo 🚀 Starting Application...
call scripts\start-app.bat
goto continue

:test_app
echo.
echo 🧪 Running Tests...
call scripts\test-app.bat
echo ✅ Tests completed!
goto continue

:reset_db
echo.
echo ⚠️  This will DELETE all data in your database!
set /p confirm="Are you sure? (y/N): "
if /i "%confirm%"=="y" (
    echo 🗑️  Resetting Database...
    call scripts\reset-db.bat
    echo ✅ Database reset completed!
) else (
    echo ❌ Database reset cancelled
)
goto continue

:backup_db
echo.
echo 💾 Creating Database Backup...
call scripts\backup-db.bat
echo ✅ Database backup completed!
goto continue

:deploy_prep
echo.
echo 📦 Preparing Deployment Package...
call scripts\deploy-prep.bat
echo ✅ Deployment preparation completed!
goto continue

:check_status
echo.
echo 📊 Checking Application Status...
echo.

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js: Not installed
) else (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
)

REM Check npm
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm: Not installed
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm: %%i
)

REM Check dependencies
if exist node_modules (
    echo ✅ Dependencies: Installed
) else (
    echo ⚠️  Dependencies: Not installed
)

REM Check environment file
if exist .env (
    echo ✅ Environment: Configured (.env)
) else if exist .env.local (
    echo ✅ Environment: Configured (.env.local)
) else (
    echo ⚠️  Environment: Not configured
)

REM Check if app might be running (basic check)
echo ℹ️  Application Status: Check http://localhost:3000 manually

REM Check database connection (basic)
if exist prisma\schema.prisma (
    echo ℹ️  Database Schema: Found (prisma/schema.prisma)
) else (
    echo ⚠️  Database Schema: Not found
)

echo.
goto continue

:show_help
echo.
echo 📚 Dranoel Application Help
echo ========================
echo.
echo Quick Commands:
echo   Fresh Setup: Choose option 1 (dev-setup) then 2 (start-app)
echo   Daily Dev:   Choose option 2 (start-app) for quick start
echo   Testing:     Choose option 3 (test-app) before committing
echo   Database:    Choose option 4 (reset-db) or 5 (backup-db)
echo.
echo File Locations:
echo   Configuration: .env or .env.local
echo   Database Schema: prisma\schema.prisma
echo   Backups: backups\ directory
echo.
echo Useful URLs:
echo   Application: http://localhost:3000
echo   Database Admin: npx prisma studio
echo.
echo Need More Help?
echo   Read: scripts\README.md for detailed documentation
echo.
goto continue

:continue
echo.
echo Press any key to continue...
pause >nul
goto main_menu

:exit_script
echo.
echo 👋 Goodbye! Thanks for using Dranoel Quick Start!
pause
exit /b 0