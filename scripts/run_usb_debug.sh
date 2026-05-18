#!/usr/bin/env bash
set -euo pipefail

# Run this from Git Bash/WSL terminal with USB debugging enabled.
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Checking Android device connection..."
adb devices

DEVICE_COUNT="$(adb devices | awk 'NR>1 && $2=="device" {count++} END {print count+0}')"
if [[ "$DEVICE_COUNT" -lt 1 ]]; then
  echo "No Android device detected. Please enable USB debugging and accept RSA prompt."
  exit 1
fi

echo "[2/4] Fetching Flutter dependencies..."
flutter pub get

echo "[3/4] Running unit tests..."
flutter test

echo "[4/4] Launching app on connected Android device..."
flutter run -d android
