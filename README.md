# Pocket Atelier — Tiny Rooms, Real 3D

A small browser game about fixing things. Each level is a tiny diorama room — a Seoul alley repair shop, a hanok study, a seaside lab — full of broken objects. Click and hold an object to repair it: the broken model is swapped for its restored twin, sparks fly, and the room grows warmer and brighter with every fix. Repair everything to open the next room.

**Play:** https://kimdooo-a.github.io/pocket-atelier/ (desktop or mobile browser, no install)

## How the 3D content was made

Every 3D object and room in the game was generated with **Aholo Lux3D**:

1. **Text → image (Lux3D image generation, Hand Painted style)** — one prompt per object state, e.g. *"A single vintage 1980s Korean electric desk fan, broken: one blade snapped off…"* and *"The same … fully restored like new…"*.
2. **Image → 3D (Lux3D Standard, mesh, 100K faces, PBR materials)** — each image becomes a textured GLB.
3. **Web optimisation** — GLBs are compressed with glTF-Transform (meshopt geometry, WebP textures at 1024 px), from ~8–12 MB to ~0.6–1.2 MB each.

Broken and repaired variants are generated as separate prompts so that the repair is a visible change in shape, not just in colour. The in-game **Asset log** shows the source image for each variant.

## Tools used

| Tool | Purpose |
|---|---|
| Aholo Lux3D (image generation + Image to 3D) | All 3D models: props in broken / repaired states and room bases |
| three.js | Real-time rendering, lighting, interaction |
| glTF-Transform | GLB compression for the web |
| Claude Code (AI coding assistant) | Writing and debugging the web app code |

## Run locally

```
python -m http.server 8000
# open http://localhost:8000
```

`tools/pull-assets.mjs` downloads Lux3D results and optimises them; `tools/build-manifest.mjs` writes `assets/manifest.json` from the models that exist.

Made for the Manycore Aholo Global 3D AI Hackathon (#Manycorehackathon).
