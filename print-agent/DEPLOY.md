# Oro Print Agent - Deployment Instructions

## For 5000 Stores

### Step 1: Build the Executable (One Time)
On your development machine:
```bash
cd print-agent
npm install
npm run build
```

This creates `print-agent/dist/print-agent.exe` (~50MB standalone file)

---

### Step 2: Create Installer Package
Bundle these files together:
```
OroAgentInstaller/
├── print-agent.exe    (from dist/)
├── install.bat
└── uninstall.bat
```

Zip them as `OroAgentInstaller.zip`

---

### Step 3: Deploy to Stores

**Option A: Manual Install**
1. Send `OroAgentInstaller.zip` to store
2. Extract anywhere
3. Right-click `install.bat` → "Run as Administrator"
4. Done!

**Option B: Remote Deploy (Recommended)**
Use any RMM tool (ConnectWise, NinjaRMM, etc.):
```
# Silent install command
powershell -Command "Invoke-WebRequest -Uri 'YOUR_URL/OroAgentInstaller.zip' -OutFile 'C:\temp\agent.zip'; Expand-Archive 'C:\temp\agent.zip' -DestinationPath 'C:\temp\agent'; Start-Process 'C:\temp\agent\install.bat' -Verb RunAs"
```

---

### What Install.bat Does:
1. ✅ Creates `C:\OroPos\PrintAgent\` folder
2. ✅ Copies `print-agent.exe` there
3. ✅ Adds to Windows Startup (auto-run on boot)
4. ✅ Opens firewall port 9100
5. ✅ Starts the agent immediately

---

### Verify Installation
On store computer, open browser:
```
http://localhost:9100/status
```
Should show: `{ "status": "ok", ... }`

---

### Troubleshooting
- **Port in use**: Another app using 9100. Change in index.js before building.
- **Printer not found**: Ensure USB printer is connected and driver installed.
- **Firewall block**: Manually allow port 9100 in Windows Firewall.

---

### Updates
To update the agent:
1. Build new `print-agent.exe`
2. Push to stores via RMM or have them re-run `install.bat`
