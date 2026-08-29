@echo off
title IAMTS - Database Setup (Portable)
setlocal
cd /d "%~dp0"

echo ============================================================
echo    IAMTS - Database Setup
echo    One-time configuration for this package
echo ============================================================
echo.

REM --- Locate the bundled Node runtime
set "NODE=%~dp0node\node.exe"
if exist "%NODE%" (
    echo [OK] Bundled Node.js runtime found.
) else (
    where node >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Node.js not found. Re-download the package or install Node.js.
        pause
        exit /b 1
    )
    set "NODE=node"
)

REM --- Create .env from the template if it does not exist
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [OK] Created .env from template.
) else (
    echo [SKIP] .env already exists.
)

echo.
echo [NEXT] Open the .env file and set:
echo        - SESSION_SECRET = a random long string
echo        - DB_PASSWORD   = your MySQL root password
echo.
echo Press any key when you are done editing .env to continue...
pause >nul

echo.
echo [RUN] Initializing the database with demo data...
"%NODE%" database\init.js --seed < NUL
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database initialization failed. Check your .env and MySQL.
    pause
    exit /b 1
)

echo.
echo [DONE] Setup complete. Run IAMTS.bat to start the system.
echo Default Administrator: kalagbala@iamts.com / Password123!
pause
