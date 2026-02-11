#!/bin/bash

# Configuration
HOST=$1
PASSWORD=$2
CMD="cd /opt/starta && echo '--- PULLING ---' && git fetch origin && git reset --hard origin/main && echo '--- REBUILDING (DETACHED) ---' && docker compose -f docker-compose.prod.yml up -d --build --force-recreate > deploy_v3.log 2>&1"

if [ -z "$HOST" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: ./deploy_detached.sh <HOST> <PASSWORD>"
    exit 1
fi

echo "🚀 Launching Detached Deployment on $HOST..."

# Use sshpass for non-interactive password handling if available, else expect
# But here we use a simple expect wrapper inline for the detached command

/usr/bin/expect <<EOF
set timeout 20
spawn ssh -o StrictHostKeyChecking=no root@$HOST "nohup bash -c '$CMD' > /dev/null 2>&1 & echo 'DEPLOY_LAUNCHED'"
expect {
    "password:" { send "$PASSWORD\r"; exp_continue }
    "DEPLOY_LAUNCHED" { exit 0 }
    timeout { puts "TIMEOUT WAITING FOR LAUNCH"; exit 1 }
    eof { puts "SSH CONNECTION FAILED"; exit 1 }
}
EOF

echo "✅ Deployment Launched in Background. The SSH session has closed."
echo "⏳ Waiting 10 seconds before checking logs..."
sleep 10
