@echo off
setlocal enabledelayedexpansion

cd /d %~dp0\..

echo [1/4] Checking Android device connection...
adb devices

for /f %%i in ('adb devices ^| findstr /R /C:"device$" ^| find /C /V ""') do set DEVICE_COUNT=%%i
if "%DEVICE_COUNT%"=="0" (
  echo No Android device detected. Enable USB debugging and accept RSA prompt.
  exit /b 1
)

echo [2/4] Fetching Flutter dependencies...
call flutter pub get
if errorlevel 1 exit /b 1

echo [3/4] Running unit tests...
call flutter test
if errorlevel 1 exit /b 1

echo [4/4] Launching app on connected Android device...
call flutter run -d android
