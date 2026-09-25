<div align="center">

<img src="public/favicon.png" alt="Yolomi logo" width="200"/>

# Yolomi

**A browser-based bounding box annotation tool for computer vision datasets**

Draw boxes, assign classes, export YOLO / COCO / Pascal VOC — no install, no backend, no account. Everything stays on your machine.

[![npm](https://img.shields.io/npm/v/yolomi.svg)](https://www.npmjs.com/package/yolomi)
[![React](https://img.shields.io/badge/UI-React%2019-149eca)](https://react.dev/)
[![Vite](https://img.shields.io/badge/build-Vite-646cff)](https://vitejs.dev/)
[![Client-only](https://img.shields.io/badge/backend-none-3dd68c)](#how-it-works)
[![License: Yolomi](https://img.shields.io/badge/License-Yolomi-orange.svg)](LICENSE)

</div>

---

## Install

```cmd
npm install -g yolomi
```

Installs the latest version (**0.0.4**). To install a specific version: `npm install -g yolomi@0.0.3`

Requires [Node.js](https://nodejs.org) (includes npm). Check with `node -v` if you're not sure it's installed.
## Run

```cmd
yolomi
```

Builds the app on first run (a few seconds) and opens it automatically in your default browser. Later runs launch instantly.

If it doesn't open automatically, copy the local URL printed in the terminal (e.g. `http://localhost:4173`) into your browser.

Use **Chrome or Edge** (needed for real folder read/write via the File System Access API — other browsers fall back to read-only picking and zip downloads). Click **Open folder**, point it at a directory of images, and start annotating.

## For new users (friends, teammates, anyone else)

No coding experience needed — just these steps:

1. **Install Node.js** (skip if already installed): download from [nodejs.org](https://nodejs.org), choose the **LTS** version, and run the installer. Confirm it worked by opening a terminal and running:

```cmd
   node -v
```

2. **Install Yolomi**:

```cmd
   npm install -g yolomi
```

3. **Run it**:

```cmd
   yolomi
```

   The first run builds the app (a few seconds) and opens it automatically in your default browser. Every run after that is instant.

4. **If the browser doesn't open automatically**, copy the URL printed in the terminal (something like `http://localhost:4173`) and paste it into your browser manually.

5. **Use Chrome or Edge** for the best experience — these support saving labels directly to a folder on disk. Other browsers still work, but fall back to a zip download instead of direct folder access.

That's it — no Python, no accounts, no configuration. Click **Open folder**, point it at your images, and start annotating.

## Run from source

```cmd
git clone https://github.com/arnabpratimk-cell/yolomi.git
cd yolomi
npm install
npm run dev
```

Open the printed `http://localhost:5173` in Chrome or Edge.

## How it works

Yolomi is a single-page app with **no backend and no database** — it runs entirely in your browser. Images never leave your machine; there's nothing to upload, no server to run, nothing to configure. Project state lives in memory while the tab is open, and label files are written straight back to a folder you choose using the File System Access API.

## Yolomi UI

<img src="docs/screenshots/yolomi-empty-state.png" alt="Yolomi empty state" width="854"/>

## Image list and progress tracking
<img src="docs/screenshots/yolomi-image-list.png" alt="Yolomi image list with completion tracking" width="854"/>

## Annotation in progress

<img src="docs/screenshots/yolomi-annotation-demo.png" alt="Yolomi annotation demo with overlapping boxes" width="854"/>

## Features

- **Draw, select, move, resize** bounding boxes directly on the canvas, with corner-handle resizing and a lightweight two-layer canvas (image drawn once, boxes redrawn separately) so dragging stays smooth even on large images.

- **Overlapping boxes supported** — while in annotation mode, a click always starts a new box, even on top of an existing one, so densely packed objects can each get their own box.

- **Custom per-class colors** — each class has a clickable color circle/swatch, letting users choose any bounding-box color they prefer. Colors remain stable across sessions, and each box uses its class color for quick visual identification.

- **Custom class IDs** — each class's numeric ID is user-editable rather than auto-incremented, with duplicate and gap warnings, since that ID is what gets written into YOLO/COCO exports.

- **Left-hand image panel** with thumbnails, a completion badge per image (not started / in progress / done), a status filter, and a running `done / total` counter.

- **Start annotation / Delete annotation** controls, plus per-image "Mark done," so progress is explicit rather than inferred.

- **Guardrail on drawing without a label** — trying to draw before selecting (or creating) a class shows a clear message instead of silently doing nothing.

- **Natural, numeric image ordering** — files like `img2.jpg`, `img10.jpg` are sorted in true numeric order rather than ASCII order, matching how File Explorer normally lists a folder.

- **Undo / redo** per image, plus zoom controls and keyboard delete.

- **Context-aware cursor** — grab/grabbing over movable boxes, matching resize cursors over corner handles, crosshair while actively drawing.

- **Labels save folder** — choose exactly where label files are written; exports go straight into that folder as real files, not a zip, as long as the browser grants write access. Zip download is only a last-resort fallback for browsers without File System Access support.

- **Export formats** — pick a single format from the Export menu, or export **All formats** in one click to write every format at once:

  - **YOLO** — one `.txt` per image (normalized box coordinates) plus `classes.txt` indexed by class ID.

  - **COCO** — a single `instances.json` with images, categories, and annotations.

  - **Pascal VOC** — one `.xml` per image, following the standard VOC schema.

  - **All formats** — exports YOLO, COCO, and Pascal VOC together into the labels save folder in a single pass, so you don't have to re-run the export three times for the same annotation set.

## Project structure

```
yolomi/
  index.html
  package.json
  vite.config.js
  public/                     - favicon, static assets
  docs/
    screenshots/               - README images
  src/
    main.jsx                  - React entry point
    App.jsx                   - Layout + open/export wiring
    store/
      useProjectStore.js      - All app state: images, classes, boxes, undo/redo, mode
    lib/
      colors.js                - Class color palette
      fileSystem.js            - Folder open/save, File System Access + zip fallback
      exporters/
        yolo.js
        coco.js
        pascalVoc.js
    components/                - TopBar, Sidebar, Canvas, ClassPanel, BoxList, EmptyState
```

## Data model

Each image record holds its boxes in **absolute pixel coordinates** (top-left `x`, `y`, plus `w`, `h`) at the image's natural resolution — not normalized until export time, so no precision is lost while editing. Normalization to YOLO's `0–1` range, or reformatting into COCO/VOC's own coordinate conventions, happens only inside the relevant exporter. The same applies when exporting **All formats** — each exporter runs independently off the same in-memory box data.

## Development

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build to dist/
