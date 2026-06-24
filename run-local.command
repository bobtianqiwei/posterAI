#!/bin/zsh
# run-local.command developed by Bob Tianqi Wei

set -e

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Please install Node.js first:"
  echo "https://nodejs.org/"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  npm install
fi

{
  sleep 5
  open "http://localhost:5173"
} &

npm run dev
