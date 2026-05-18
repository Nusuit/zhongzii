#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Generating hardcoded vocabulary from Excel..."
if [[ ! -f ".venv/Scripts/python.exe" ]]; then
  echo "Missing Python virtual environment at .venv/Scripts/python.exe"
  exit 1
fi

.venv/Scripts/python.exe scripts/generate_hardcoded_vocab.py

echo "[2/4] Fetching Flutter dependencies..."
flutter pub get

echo "[3/4] Running static analysis..."
flutter analyze

echo "[4/4] Running unit tests..."
flutter test

echo "Done. Hardcoded data regenerated and verified."
