#!/usr/bin/env bash
# Install Blender as a Python module (bpy) into a reusable venv and print its python path.
# bpy 5.2 needs Python 3.13. Re-running is cheap once installed.
set -euo pipefail
VENV="${BLENDER_VENV:-$HOME/.cache/bpy-venv}"
PY="${BLENDER_PYTHON:-$(command -v python3.13 || command -v python3)}"
if [ ! -x "$VENV/bin/python" ]; then
  "$PY" -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
fi
"$VENV/bin/python" -c "import bpy" 2>/dev/null || "$VENV/bin/pip" install -q "bpy==${BPY_VERSION:-5.2.2}" numpy pillow
"$VENV/bin/python" -c "import bpy, sys; print('blender', bpy.app.version_string, 'python', sys.version.split()[0])" >&2
echo "$VENV/bin/python"
