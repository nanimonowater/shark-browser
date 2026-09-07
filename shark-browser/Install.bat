@echo off
setlocal
cd /d "%~dp0"

echo ===================================
echo   Shark Browser Installer
echo ===================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Please install from https://nodejs.org
  pause & exit /b 1
)

:: Install dependencies
if not exist node_modules (
  echo [1/3] Installing dependencies...
  npm install
  if %errorlevel% neq 0 ( echo npm install failed & pause & exit /b 1 )
)

:: Create shortcut on Desktop
echo [2/3] Creating Desktop shortcut...
set VBS_PATH=%~dp0Shark.vbs
set SHORTCUT=%USERPROFILE%\Desktop\Shark Browser.lnk

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = 'wscript.exe';" ^
  "$s.Arguments = '\"%VBS_PATH%\"';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'Shark Browser';" ^
  "$s.IconLocation = 'shell32.dll,14';" ^
  "$s.Save();"

:: Pin to taskbar via Start Menu shortcut
echo [3/3] Creating Start Menu shortcut (for taskbar pinning)...
set STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs
set SM_SHORTCUT=%STARTMENU%\Shark Browser.lnk

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SM_SHORTCUT%');" ^
  "$s.TargetPath = 'wscript.exe';" ^
  "$s.Arguments = '\"%VBS_PATH%\"';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'Shark Browser';" ^
  "$s.IconLocation = 'shell32.dll,14';" ^
  "$s.Save();"

echo.
echo ===================================
echo   Installation Complete!
echo ===================================
echo.
echo Desktop shortcut created: Shark Browser
echo Start Menu shortcut created: Shark Browser
echo.
echo To pin to taskbar:
echo   1. Press Windows key
echo   2. Search "Shark Browser"
echo   3. Right-click -> "Pin to taskbar"
echo.
pause
