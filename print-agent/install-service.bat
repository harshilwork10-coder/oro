@echo off
echo Installing ORO Print Agent as Windows Service (Hidden)...
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run this script as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Install node-windows if needed
echo Installing service manager...
call npm install -g node-windows

REM Create service installer script
echo Creating service installer...
(
echo const Service = require('node-windows'^).Service;
echo const path = require('path'^);
echo.
echo const svc = new Service({
echo   name: 'ORO Print Agent',
echo   description: 'ORO POS Print Agent for receipt printing',
echo   script: path.join(__dirname, 'index.js'^),
echo   nodeOptions: [],
echo   env: [{
echo     name: "PRINT_PORT",
echo     value: "9100"
echo   }]
echo }^);
echo.
echo svc.on('install', function(^) {
echo   console.log('Service installed! Starting...');
echo   svc.start();
echo }^);
echo.
echo svc.on('start', function(^) {
echo   console.log('ORO Print Agent is now running as a hidden service!');
echo   console.log('Access at http://localhost:9100');
echo }^);
echo.
echo svc.install();
) > install-svc.js

REM Run the installer
echo Installing service...
node install-svc.js

echo.
echo ================================
echo ORO Print Agent installed!
echo It will now run automatically in the background.
echo No taskbar icon - completely hidden.
echo ================================
echo.
pause
