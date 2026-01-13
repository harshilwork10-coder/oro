# ORO Print Agent - Deployment Guide

## Overview
The ORO Print Agent enables silent thermal receipt printing from any web browser. It runs as a local Windows service and receives print commands from the POS web application.

## Supported Printers
- **Star Micronics** TSP100, TSP600, TSP700 series
- **Epson** TM-T20, TM-T88 series  
- **Bixolon** SRP-350, SRP-350plus series
- Any USB thermal printer supporting ESC/POS commands

---

## Quick Install (5 minutes)

### Prerequisites
1. Windows 10/11 (64-bit)
2. USB thermal printer connected
3. Administrator rights

### Step 1: Download Zadig (One-Time Driver Setup)
1. Download from: https://zadig.akeo.ie/
2. Run `zadig-2.x.exe` as **Administrator**
3. **Options → List All Devices** (enable this menu option)
4. Select your printer from the dropdown (e.g., "BIXOLON SRP-350plusIII")
5. Ensure **WinUSB** is selected in the right box
6. Click **"Replace Driver"**
7. Wait for "Driver installed successfully"

> ⚠️ **IMPORTANT**: This replaces the Windows printer driver with a raw USB driver. The printer will no longer appear in Windows Printers. This is correct - it allows the Print Agent to communicate directly with the printer.

### Step 2: Install Print Agent
1. Copy `print-agent.exe` to `C:\OroPos\PrintAgent\`
2. Run `install.bat` as Administrator

### Step 3: Verify Installation
1. Open browser: http://localhost:9100/status
2. Should see: `{"status":"running","version":"1.0.0","usbAvailable":true}`
3. Open browser: http://localhost:9100/printers
4. Should see your printer listed with vendor/product ID

---

## Troubleshooting

### "No USB printer found"
- Printer not connected or powered off
- USB cable issue
- Need to run Zadig again

### "LIBUSB_ERROR_NOT_SUPPORTED"
- Zadig was not run, or wrong driver selected
- Re-run Zadig and select WinUSB

### "Print Agent not reachable" (in POS)
- Print Agent not running
- Firewall blocking port 9100
- Run `netsh advfirewall firewall add rule name="ORO Print Agent" dir=in action=allow protocol=TCP localport=9100`

### Printer prints garbled text
- Wrong printer model detected
- Try `/test` endpoint first: `POST http://localhost:9100/test`

---

## For Support Team

### Check Print Agent Status
```
curl http://localhost:9100/status
```

### List Connected Printers
```
curl http://localhost:9100/printers
```

### Print Test Page
```
curl -X POST http://localhost:9100/test
```

### View Agent Logs
The Print Agent console window shows all activity. If running as a service, check Windows Event Viewer.

### Restart Print Agent
1. Open Task Manager
2. End `print-agent.exe` process
3. Run `C:\OroPos\PrintAgent\print-agent.exe`

---

## Mass Deployment

For deploying to multiple stores:

1. **Package Contents**:
   - `print-agent.exe` - The print agent executable
   - `install.bat` - Installation script
   - `zadig-2.x.exe` - USB driver installer (include in package)

2. **Remote Installation** (via RMM/remote desktop):
   ```batch
   # Copy files
   xcopy \\server\deploy\PrintAgent C:\OroPos\PrintAgent\ /E /Y
   
   # Install 
   C:\OroPos\PrintAgent\install.bat
   ```

3. **Zadig must be run manually** - it requires interactive driver selection

---

## Uninstall

1. Delete startup shortcut: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\OroPos PrintAgent.lnk`
2. Delete folder: `C:\OroPos\PrintAgent`
3. (Optional) Use Zadig to restore original printer driver
