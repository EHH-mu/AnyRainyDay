#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$ROOT/web"
FRIENDLY_STANDALONE_FILE="$ROOT/直接打开编辑器.html"
STANDALONE_FILE="$ROOT/editor-standalone.html"
STATE_DIR="$ROOT/.server"
PORT_FILE="$STATE_DIR/port.txt"
PID_FILE="$STATE_DIR/pid.txt"
LOG_FILE="$STATE_DIR/server.log"

open_url() {
  local target="$1"

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$target" >/dev/null 2>&1 || true
  elif command -v gio >/dev/null 2>&1; then
    gio open "$target" >/dev/null 2>&1 || true
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$target" >/dev/null 2>&1 || true
  else
    echo "Open this in your browser: $target"
  fi
}

if [[ -f "$FRIENDLY_STANDALONE_FILE" ]]; then
  echo "Opening AnyRainyDay editor: $FRIENDLY_STANDALONE_FILE"
  open_url "$FRIENDLY_STANDALONE_FILE"
  exit 0
fi

if [[ -f "$STANDALONE_FILE" ]]; then
  echo "Opening AnyRainyDay editor: $STANDALONE_FILE"
  open_url "$STANDALONE_FILE"
  exit 0
fi

if [[ ! -d "$WEB_ROOT" ]]; then
  echo "Cannot find the web folder. Please extract the full package first."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run the local editor server."
  echo "Install python3 with your Linux package manager, then run this script again."
  exit 1
fi

mkdir -p "$STATE_DIR"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" >/dev/null 2>&1; then
    PORT="$(cat "$PORT_FILE" 2>/dev/null || echo 5173)"
    URL="http://127.0.0.1:$PORT/editor.html"
    echo "Editor is already running: $URL"
    open_url "$URL"
    exit 0
  fi
fi

PORT=""
SERVER_PID=""

for CANDIDATE_PORT in $(seq 5173 5273); do
  nohup python3 -m http.server "$CANDIDATE_PORT" --bind 127.0.0.1 --directory "$WEB_ROOT" >"$LOG_FILE" 2>&1 &
  CANDIDATE_PID="$!"
  sleep 0.4

  if kill -0 "$CANDIDATE_PID" >/dev/null 2>&1; then
    PORT="$CANDIDATE_PORT"
    SERVER_PID="$CANDIDATE_PID"
    break
  fi
done

if [[ -z "$PORT" || -z "$SERVER_PID" ]]; then
  echo "Could not start the local editor server. See: $LOG_FILE"
  exit 1
fi

echo "$PORT" > "$PORT_FILE"
echo "$SERVER_PID" > "$PID_FILE"

URL="http://127.0.0.1:$PORT/editor.html"
echo "AnyRainyDay editor started: $URL"

open_url "$URL"

echo "To stop the editor, run: bash stop-editor.sh"
