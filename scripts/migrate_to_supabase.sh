#!/bin/bash
# =====================================================
# DATABASE MIGRATION SCRIPT
# Export local PostgreSQL → Supabase
# =====================================================

set -e

echo "🚀 FinanceHub Pro - Database Migration Script"
echo "============================================="
echo ""

# Configuration
LOCAL_DB="mubasher_db"
EXPORT_DIR="./db_export"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create export directory
mkdir -p $EXPORT_DIR

echo "📦 Step 1: Exporting local database schema..."
pg_dump -h localhost -U $USER -d $LOCAL_DB --schema-only > $EXPORT_DIR/schema_$TIMESTAMP.sql
echo "✅ Schema exported to $EXPORT_DIR/schema_$TIMESTAMP.sql"

echo ""
echo "📦 Step 2: Exporting data (excluding large tables)..."
pg_dump -h localhost -U $USER -d $LOCAL_DB \
    --data-only \
    --exclude-table=ohlc_data \
    --exclude-table=intraday_data \
    --exclude-table=intraday_ohlc \
    > $EXPORT_DIR/data_$TIMESTAMP.sql
echo "✅ Data exported to $EXPORT_DIR/data_$TIMESTAMP.sql"

echo ""
echo "📦 Step 3: Exporting key tables separately for verification..."
for table in market_tickers corporate_actions mutual_funds users; do
    pg_dump -h localhost -U $USER -d $LOCAL_DB \
        --data-only \
        --table=$table \
        > $EXPORT_DIR/${table}_$TIMESTAMP.sql
    COUNT=$(psql -h localhost -U $USER -d $LOCAL_DB -t -c "SELECT COUNT(*) FROM $table" | tr -d ' ')
    echo "   - $table: $COUNT rows"
done

echo ""
echo "============================================="
echo "📋 NEXT STEPS:"
echo ""
echo "1. Create Supabase project at https://supabase.com"
echo ""
echo "2. Get your connection string from:"
echo "   Settings → Database → Connection string → URI"
echo ""
echo "3. Import schema:"
echo "   psql YOUR_SUPABASE_URL < $EXPORT_DIR/schema_$TIMESTAMP.sql"
echo ""
echo "4. Import data:"
echo "   psql YOUR_SUPABASE_URL < $EXPORT_DIR/data_$TIMESTAMP.sql"
echo ""
echo "5. Update backend/.env with new DATABASE_URL"
echo ""
echo "============================================="
echo "✅ Export complete!"
