#!/bin/bash
# NovaStore Python Server Launcher
set -e

# Ensure CommandLineTools python3 is in PATH
export PATH="/Library/Developer/CommandLineTools/usr/bin:$PATH"

# Choose python3 executable
if command -v python3 &>/dev/null; then
    PY_BIN="python3"
elif [ -f "/Library/Developer/CommandLineTools/usr/bin/python3" ]; then
    PY_BIN="/Library/Developer/CommandLineTools/usr/bin/python3"
else
    echo "Error: Python 3 not found on your system."
    exit 1
fi

echo "Starting NovaStore using $($PY_BIN --version)..."
cd "$(dirname "$0")"
exec $PY_BIN server.py
