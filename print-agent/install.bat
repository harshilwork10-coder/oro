@echo off
title Oro Print Agent Installer
color 0A

echo ========================================
echo    ORO PRINT AGENT INSTALLER
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: Please run as Administrator
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

:: Create installation directory
set INSTALL_DIR=C:\OroPos\PrintAgent
echo Creating installation folder: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copy files
echo Copying print agent...
copy /Y "print-agent.exe" "%INSTALL_DIR%\print-agent.exe"

:: Create startup shortcut
echo Adding to Windows Startup...
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%STARTUP%\OroAgent.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%INSTALL_DIR%\print-agent.exe" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Oro POS Print Agent" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs
cscript CreateShortcut.vbs
del CreateShortcut.vbs

:: Create firewall rule
echo Adding firewall rule for port 9100...
netsh advfirewall firewall add rule name="Oro Print Agent" dir=in action=allow protocol=TCP localport=9100 >nul 2>&1

:: Start the agent now
echo Starting Print Agent...
start "" "%INSTALL_DIR%\print-agent.exe"

echo.
echo ========================================
echo    INSTALLATION COMPLETE!
echo ========================================
echo.
echo Print Agent installed to: %INSTALL_DIR%
echo It will start automatically on Windows boot.
echo.
echo Open http://localhost:9100/status to verify.
echo.
pause
