@echo off
title Oro Print Agent Uninstaller
color 0C

echo ========================================
echo    ORO PRINT AGENT UNINSTALLER
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: Please run as Administrator
    pause
    exit /b 1
)

:: Stop running agent
echo Stopping Print Agent...
taskkill /F /IM print-agent.exe >nul 2>&1

:: Remove startup shortcut
echo Removing from startup...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\OroAgent.lnk" >nul 2>&1

:: Remove firewall rule
echo Removing firewall rule...
netsh advfirewall firewall delete rule name="Oro Print Agent" >nul 2>&1

:: Remove installation folder
set INSTALL_DIR=C:\OroPos\PrintAgent
echo Removing files...
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1

echo.
echo ========================================
echo    UNINSTALL COMPLETE
echo ========================================
echo.
pause
