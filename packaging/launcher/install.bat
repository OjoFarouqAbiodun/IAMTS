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

REM --- Generate a session secret automatically when the template is unchanged
"%NODE%" -e "const fs=require('fs'),crypto=require('crypto');const p='.env';let s=fs.readFileSync(p,'utf8');if(/^SESSION_SECRET=change_me_to_a_long_random_string$/m.test(s)){s=s.replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+crypto.randomBytes(32).toString('hex'));fs.writeFileSync(p,s);console.log('[OK] Generated a secure SESSION_SECRET automatically.')}else{console.log('[OK] Existing SESSION_SECRET preserved.')}"

echo.
echo [NEXT] Open the .env file and set DB_PASSWORD to your MySQL password.
echo        SESSION_SECRET has been generated automatically.
echo        If your MySQL root account has no password, leave DB_PASSWORD empty.
echo.
echo Press any key when you are done editing .env to continue...
pause >nul

echo.
echo [RUN] Initializing the database with demo data...
echo [INFO] If no Admin exists, the initializer will ask you to create one.
"%NODE%" database\init.js --seed
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database initialization failed. Check your .env and MySQL.
    pause
    exit /b 1
)

echo.
echo [DONE] Setup complete. Run IAMTS.bat to start the system.
echo Use the Admin account created during initialization.
pause
