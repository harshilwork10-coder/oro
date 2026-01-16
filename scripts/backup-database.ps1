# ORO 9 Database Backup Script
# Runs daily to backup Supabase database
# Backups are stored in the 'backups' folder with date stamps

$ErrorActionPreference = "Stop"

# Configuration
$PG_DUMP = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$BACKUP_DIR = "$PSScriptRoot\backups"
$DATABASE_URL = "postgresql://postgres:oro9_success%40007@db.eqadwjeikhfxmjtvvunt.supabase.co:5432/postgres"
$KEEP_DAYS = 7  # Keep backups for 7 days

# Create backup directory if it doesn't exist
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# Generate backup filename with timestamp
$DATE = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\oro9_backup_$DATE.dump"
$LOG_FILE = "$BACKUP_DIR\backup_log.txt"

# Log function
function Write-Log {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Out-File -Append $LOG_FILE
    Write-Host "$Timestamp - $Message"
}

Write-Log "Starting database backup..."

try {
    # Run pg_dump
    & $PG_DUMP -Fc -d $DATABASE_URL -f $BACKUP_FILE 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $Size = (Get-Item $BACKUP_FILE).Length / 1MB
        Write-Log "Backup successful: $BACKUP_FILE (${Size:N2} MB)"
    } else {
        Write-Log "ERROR: pg_dump failed with exit code $LASTEXITCODE"
        exit 1
    }
    
    # Clean up old backups
    Write-Log "Cleaning up backups older than $KEEP_DAYS days..."
    $CutoffDate = (Get-Date).AddDays(-$KEEP_DAYS)
    Get-ChildItem $BACKUP_DIR -Filter "oro9_backup_*.dump" | 
        Where-Object { $_.CreationTime -lt $CutoffDate } |
        ForEach-Object {
            Write-Log "Deleting old backup: $($_.Name)"
            Remove-Item $_.FullName
        }
    
    Write-Log "Backup completed successfully!"
    
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
