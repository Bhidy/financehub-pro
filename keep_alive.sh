#!/bin/bash

# LOG FILE
LOG_FILE="monitor_sentinel.log"

echo "🛡️ SENTINEL MONITOR STARTED: $(date)" >> $LOG_FILE

while true; do
    echo "🔍 Checking processes at $(date)..." >> $LOG_FILE

    # 1. CHECK FILL DATA GAPS
    if ! pgrep -f "fill_data_gaps.py" > /dev/null; then
        echo "⚠️ fill_data_gaps.py DIED! Restarting..." >> $LOG_FILE
        nohup python3 fill_data_gaps.py >> fill_data.log 2>&1 &
        echo "✅ Restarted fill_data_gaps.py" >> $LOG_FILE
    fi

    # 2. CHECK PHASE 4A
    if ! pgrep -f "local_phase4a_quarterly.py" > /dev/null; then
        echo "⚠️ local_phase4a_quarterly.py DIED! Restarting..." >> $LOG_FILE
        nohup python3 local_phase4a_quarterly.py >> phase4a.log 2>&1 &
        echo "✅ Restarted Phase 4A" >> $LOG_FILE
    fi

    # 3. CHECK PHASE 4B
    if ! pgrep -f "local_phase4b_analysts.py" > /dev/null; then
        echo "⚠️ local_phase4b_analysts.py DIED! Restarting..." >> $LOG_FILE
        nohup python3 local_phase4b_analysts.py >> phase4b.log 2>&1 &
        echo "✅ Restarted Phase 4B" >> $LOG_FILE
    fi

    # 4. CHECK PHASE 5
    if ! pgrep -f "local_phase5_ownership.py" > /dev/null; then
        echo "⚠️ local_phase5_ownership.py DIED! Restarting..." >> $LOG_FILE
        nohup python3 local_phase5_ownership.py >> phase5.log 2>&1 &
        echo "✅ Restarted Phase 5" >> $LOG_FILE
    fi

    # Sleep for 1 minute
    sleep 60
done
