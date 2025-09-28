#!/bin/bash
# Database Backup Script for Linux/macOS
# This script will create a backup of your database

set -e  # Exit on any error

echo "💾 Starting Database Backup Process..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v ^# | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v ^# | xargs)
else
    echo "❌ No environment file found (.env or .env.local)"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment variables"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/dranoel_backup_$TIMESTAMP"

echo "📊 Database: $DATABASE_URL"
echo "📁 Backup will be saved to: $BACKUP_FILE"

# Extract database details from DATABASE_URL
# Format: postgresql://username:password@host:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"

if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Could not parse DATABASE_URL format"
    exit 1
fi

echo "🔄 Creating database backup..."

# Set PGPASSWORD environment variable for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Create SQL dump
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --no-owner --no-privileges \
    --file="$BACKUP_FILE.sql"

if [ $? -eq 0 ]; then
    echo "✅ SQL backup created: $BACKUP_FILE.sql"

    # Compress the backup
    gzip "$BACKUP_FILE.sql"
    echo "🗜️  Backup compressed: $BACKUP_FILE.sql.gz"

    # Create schema-only backup
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --schema-only --no-owner --no-privileges \
        --file="$BACKUP_FILE.schema.sql"

    if [ $? -eq 0 ]; then
        echo "✅ Schema backup created: $BACKUP_FILE.schema.sql"
        gzip "$BACKUP_FILE.schema.sql"
        echo "🗜️  Schema backup compressed: $BACKUP_FILE.schema.sql.gz"
    fi

    # Show backup info
    echo ""
    echo "📋 Backup Information:"
    echo "   📅 Timestamp: $TIMESTAMP"
    echo "   📁 Full backup: $BACKUP_FILE.sql.gz"
    echo "   📋 Schema backup: $BACKUP_FILE.schema.sql.gz"
    echo "   💿 Full backup size: $(du -h "$BACKUP_FILE.sql.gz" | cut -f1)"
    echo "   📏 Schema size: $(du -h "$BACKUP_FILE.schema.sql.gz" | cut -f1)"
    echo ""
    echo "✅ Database backup completed successfully!"
    echo ""
    echo "💡 To restore this backup:"
    echo "   1. Reset your database: ./scripts/reset-db.sh"
    echo "   2. Restore: gunzip -c $BACKUP_FILE.sql.gz | psql \$DATABASE_URL"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Unset password
unset PGPASSWORD