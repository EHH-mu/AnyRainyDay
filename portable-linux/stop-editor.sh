#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$ROOT/.server"
PID_FILE="$STATE_DIR/pid.txt"
PORT_FILE="$STATE_DIR/port.txt"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No running editor server was found."
  exit 0
fi

SERVER_PID="$(cat "$PID_FILE" 2>/dev/null || true)"

if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  echo "Editor server stopped."
else
  echo "Editor server is not running."
fi

rm -f "$PID_FILE" "$PORT_FILE"
