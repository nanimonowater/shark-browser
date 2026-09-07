@echo off
cd /d "%~dp0"
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js is not installed. Please install from https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo First time setup... please wait
  npm install
)
start "" /b npm start
