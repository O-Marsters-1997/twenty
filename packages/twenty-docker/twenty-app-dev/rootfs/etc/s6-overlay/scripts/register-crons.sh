#!/bin/sh
set -e

echo "==> START Registering cron jobs"

cd /app/packages/twenty-server
node dist/command/command cron:register:all

echo "==> DONE"
