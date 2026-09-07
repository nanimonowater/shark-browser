#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node &>/dev/null; then
  echo "Node.js not found. Install from https://nodejs.org"
  exit 1
fi
[ ! -d node_modules ] && npm install
npm start
