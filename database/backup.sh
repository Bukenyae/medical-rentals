#!/bin/bash
# Database backup script for Medical Rentals platform
# This script should be run on a schedule (e.g., daily via cron)

# Configuration
BACKUP_DIR="/path/to/backup/directory"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/medical_rentals_backup_$TIMESTAMP.sql"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Get database connection details from environment
DB_HOST=${DB_HOST:-"db.your-production-project.supabase.co"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"postgres"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"your_db_password"}

# Create backup
echo "Creating database backup: $BACKUP_FILE"
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -b -v -f $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup completed successfully"
  
  # Compress backup
  gzip $BACKUP_FILE
  
  # Remove backups older than 30 days
  find $BACKUP_DIR -name "medical_rentals_backup_*.sql.gz" -type f -mtime +30 -delete
  
  echo "Cleaned up old backups"
else
  echo "Backup failed"
  exit 1
fi

# Optional: Upload to cloud storage
# aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/

echo "Backup process completed"