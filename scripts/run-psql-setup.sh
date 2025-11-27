#!/bin/bash

# Set credentials from .env
# Using aws-1 as seen in user's .env
DB_HOST="aws-1-ap-southeast-1.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.lbjeyvvierxcnrytuvto"
DB_PASS="AREl7OxlNJJ82isK"

echo "🚀 Configuring Realtime via PSQL..."
echo "==================================="
echo "Target: $DB_HOST"

# Connection String
CONNECTION_STRING="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"

# Run the SQL commands directly
echo "Running ALTER TABLE commands..."
psql "$CONNECTION_STRING" -c "ALTER TABLE public.food_entries REPLICA IDENTITY FULL; ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;"

if [ $? -eq 0 ]; then
    echo "✅ Configuration applied successfully!"
else
    echo "❌ Failed to apply configuration."
    echo "Please check your internet connection and credentials."
fi
