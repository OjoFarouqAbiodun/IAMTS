@echo off
title IAMTS Server
echo ========================================
echo   IAMTS - ICT Assets Maintenance
echo   Starting server...
echo ========================================
echo.
start http://localhost:3000
node server/app.js
