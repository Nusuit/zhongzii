@echo off
setlocal enabledelayedexpansion

cd /d %~dp0\..

echo [1/4] Generating hardcoded vocabulary from Excel...
if not exist .venv\Scripts\python.exe (
  echo Missing Python virtual environment at .venv\Scripts\python.exe
  echo Run configure/install steps first.
  exit /b 1
)

call .venv\Scripts\python.exe scripts\generate_hardcoded_vocab.py
if errorlevel 1 exit /b 1

echo [2/4] Fetching Flutter dependencies...
call flutter pub get
if errorlevel 1 exit /b 1

echo [3/4] Running static analysis...
call flutter analyze
if errorlevel 1 exit /b 1

echo [4/4] Running unit tests...
call flutter test
if errorlevel 1 exit /b 1

echo Done. Hardcoded data regenerated and verified.
