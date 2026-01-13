@echo off
REM ========================================
REM ORO Print Agent - Installation Script
REM ========================================
REM 
REM IMPORTANT: Before running this script, you must:
REM 1. Download Zadig from https://zadig.akeo.ie/
REM 2. Run Zadig as Administrator
REM 3. Options -> List All Devices
REM 4. Select your thermal printer
REM 5. Select WinUSB driver and click Replace Driver
REM
REM ========================================

echo.
echo ========================================
echo    ORO Print Agent Installer
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/5] Creating installation directory...
if not exist "C:\OroPos\PrintAgent" mkdir "C:\OroPos\PrintAgent"

echo [2/5] Copying files...
copy /Y "%~dp0print-agent.exe" "C:\OroPos\PrintAgent\print-agent.exe" >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Could not copy print-agent.exe
    echo Make sure print-agent.exe is in the same folder as this script.
    pause
    exit /b 1
)

echo [3/5] Adding to Windows Startup...
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\shortcut.vbs"
echo Set oShellLink = WshShell.CreateShortcut("%STARTUP%\OroPos PrintAgent.lnk") >> "%TEMP%\shortcut.vbs"
echo oShellLink.TargetPath = "C:\OroPos\PrintAgent\print-agent.exe" >> "%TEMP%\shortcut.vbs"
echo oShellLink.WorkingDirectory = "C:\OroPos\PrintAgent" >> "%TEMP%\shortcut.vbs"
echo oShellLink.Save >> "%TEMP%\shortcut.vbs"
cscript //nologo "%TEMP%\shortcut.vbs"
del "%TEMP%\shortcut.vbs"

echo [4/5] Configuring Windows Firewall...
netsh advfirewall firewall delete rule name="ORO Print Agent" >nul 2>&1
netsh advfirewall firewall add rule name="ORO Print Agent" dir=in action=allow protocol=TCP localport=9100 >nul 2>&1

echo [5/5] Starting Print Agent...
start "" "C:\OroPos\PrintAgent\print-agent.exe"

echo.
echo ========================================
echo    Installation Complete!
echo ========================================
echo.
echo Print Agent is now running on: http://localhost:9100
echo.
echo NEXT STEPS:
echo -----------
echo If you haven't already:
echo 1. Download Zadig from https://zadig.akeo.ie/
echo 2. Run Zadig as Administrator
echo 3. Options -^> List All Devices
echo 4. Select your thermal printer (e.g., BIXOLON SRP-350plusIII)
echo 5. Select WinUSB driver and click "Replace Driver"
echo 6. Restart this computer
echo.
echo The Print Agent will start automatically on next boot.
echo.
pause
