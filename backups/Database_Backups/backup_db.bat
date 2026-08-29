@echo off
rem ============================================================
rem IAMTS database backup script.
rem
rem DB credentials are NOT stored in this file. Provide them via
rem environment variables (recommended) or enter them when
rem prompted:
rem   IAMTS_DB_NAME     database name        (default: iamts)
rem   IAMTS_DB_USER     MySQL user name      (prompted if unset)
rem   IAMTS_DB_PASSWORD MySQL password       (prompted if unset)
rem
rem Note: the interactive prompt echoes the password as typed.
rem Set IAMTS_DB_USER / IAMTS_DB_PASSWORD in the environment
rem instead to avoid displaying it.
rem ============================================================
setlocal
set MYSQL_BIN="C:\Program Files\MySQL\MySQL Server 26.7\bin"
set BACKUP_DIR=D:\Farouq's Folder\Farouq\backups
set DB_NAME=%IAMTS_DB_NAME%
set DB_USER=%IAMTS_DB_USER%
set DB_PASSWORD=%IAMTS_DB_PASSWORD%

if "%DB_NAME%"=="" set DB_NAME=iamts

if "%DB_USER%"=="" set /p DB_USER="MySQL user: "
if "%DB_PASSWORD%"=="" set /p DB_PASSWORD="MySQL password for %DB_USER%: "

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a%%b)

%MYSQL_BIN%\mysqldump.exe -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% > "%BACKUP_DIR%\iamts_backup_%mydate%_%mytime%.sql"

echo Backup completed: "%BACKUP_DIR%\iamts_backup_%mydate%_%mytime%.sql"
pause
