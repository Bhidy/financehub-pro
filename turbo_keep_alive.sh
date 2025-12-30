#!/bin/bash
# TURBO SENTINEL
LOG_FILE="turbo_monitor.log"

while true; do
    if ! pgrep -f "turbo_data_collector.py" > /dev/null; then
        echo "⚠️ turbo_data_collector.py stopped! Restarting..." >> $LOG_FILE
        nohup python3 turbo_data_collector.py >> turbo.log 2>&1 &
    fi
    sleep 30
done
