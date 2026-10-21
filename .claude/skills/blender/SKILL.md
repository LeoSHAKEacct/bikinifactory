---
name: blender
description: Render photoreal stills with Blender (Cycles) in this environment, headless, through Blender's Python module (bpy). Use when a page or project needs realistic architectural renders, product shots or any 3D image made from a scene, especially the three.js scenes of our scroll-driven real-estate pages (realestate, dubai, monaco, dragonwood), or when the user asks for Blender.
---

# Blender (headless, via bpy)

Blender runs here as a Python module, not as the desktop app: no window, no add-ons UI, CPU Cycles.
It is how the renders in `realestate/img`, `dubai/img`, `monaco/img` and `dragonwood/img` were made.

## 1. Set up (once per container)

```bash
PY=$(.claude/skills/blender/scripts/setup.sh)   # prints the venv python; installs bpy 5.2.2 on first run (~400 MB)
```

Keep Python that imports bpy isolated from the repo: run it with `-I`, and never name a script after a stdlib module (a file called `inspect.py` next to the script crashes bpy on import).

## 2. Get a scene

- From one of our pages: `node .claude/skills/blender/scripts/export_glb.mjs dragonwood/index.html /path/scene.glb [three-dir]`.
  The page must expose `window.__lumen.groups`. If cdn.jsdelivr.net is blocked, `npm i three@0.169.0` somewhere and pass its `node_modules/three` as the third argument.
- Or build the scene directly in bpy.

## 3. Render

`scripts/render_example.py` is the full Weston (Origami House) render: glTF import, corner-normal repair, material upgrades (glass with shadow-ray transparency, water, fabric, emissive lamps), Nishita sky and sun, interior lights, cameras, AgX, OIDN denoise, 16-bit PNG.
Copy it next to your work, then edit the scene-specific parts:

- `CAMS` — one entry per shot, `camera(name, pos, target, lens, ...)` in three.js coordinates (y up; `V3` converts).
- `EXPO` — exposure per shot.
- material names it upgrades — they are the three.js material names from the page (`M.glass`, `M.pool`, …).
- sun direction and strength, interior `plight`/`alight` lamps.

```bash
"$PY" -I my_render.py -- /path/scene.glb /path/out exterior,living 1920 256   # glb outdir shots width samples
```

Rendering is slow on CPU: a 1920px shot at 256 samples takes several minutes. Do a 960px / 64-sample pass first, run long batches with `run_in_background`, and kill stuck renders by PID (a `pkill -f render` pattern can match your own shell).

## 4. Finish

```bash
python3 -I .claude/skills/blender/scripts/post.py in.png out.jpg   # bloom, grade, subtle chromatic aberration, vignette, grain, sharpen
```

## Not available here

The desktop app and live MCP control (ahujasid/blender-mcp) need Blender running with a window, so they work only on a local machine: install the add-on in Blender, then `claude mcp add blender uvx blender-mcp` in Claude Code on that machine.
