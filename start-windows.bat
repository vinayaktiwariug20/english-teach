@echo off
REM Launch My English on Windows in a chromeless, fullscreen app window.
REM Nothing is visible except the app itself: no address bar, no tabs, no menu.

setlocal
set PORT=8137
cd /d "%~dp0"

start "My English server" /min python tools\serve.py %PORT%

REM Give the server a moment to bind the port.
ping -n 2 127.0.0.1 >nul

set URL=http://localhost:%PORT%/index.html
set FLAGS=--app=%URL% --start-fullscreen --no-first-run --disable-features=Translate

set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe

if exist "%CHROME%" (
  start "" "%CHROME%" %FLAGS%
  goto :eof
)

set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe

if exist "%EDGE%" (
  start "" "%EDGE%" %FLAGS%
  goto :eof
)

echo Could not find Chrome or Edge. Open this address yourself:
echo   %URL%
pause
