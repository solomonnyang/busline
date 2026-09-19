#!/usr/bin/env bash
set -e

ROOT="/opt/lampp/htdocs/bus"

echo "Starting MySQL (XAMPP)..."
if ! (echo > /dev/tcp/127.0.0.1/3306) 2>/dev/null; then
  /opt/lampp/bin/mysqld --datadir=/opt/lampp/var/mysql > /tmp/mysql.log 2>&1 &
  sleep 6
fi
echo "  MySQL: http://localhost:3306"

echo "Starting Backend (XAMPP PHP w/ mysqli)..."
if (echo > /dev/tcp/127.0.0.1/8080) 2>/dev/null; then
  echo "  Backend already running on :8080"
else
  cd "$ROOT/backend"
  /opt/lampp/bin/php spark serve --host 0.0.0.0 --port 8080 > /tmp/backend.log 2>&1 &
  sleep 4
fi
echo "  Backend: http://localhost:8080 (reachable via LAN)"

echo "Starting Frontend (Vite)..."
if (echo > /dev/tcp/127.0.0.1/5173) 2>/dev/null; then
  echo "  Frontend already running on :5173"
else
  cd "$ROOT/frontend"
  npm run dev > /tmp/frontend.log 2>&1 &
  sleep 5
fi
echo "  Frontend: http://localhost:5173"

echo "Starting Mobile (Expo, offline)..."
if (echo > /dev/tcp/127.0.0.1/8081) 2>/dev/null; then
  echo "  Mobile already running on :8081"
else
  cd "$ROOT/mobile"
  EXPO_NO_TELEMETRY=1 npm start > /tmp/mobile.log 2>&1 &
  sleep 8
fi

echo ""
echo "All services started. Logs:"
echo "  MySQL:    /tmp/mysql.log"
echo "  Backend:  /tmp/backend.log"
echo "  Frontend: /tmp/frontend.log"
echo "  Mobile:   /tmp/mobile.log"
