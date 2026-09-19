import { useEffect, useRef, useState, useCallback } from 'react';
import {
  PencilLine,
  Square,
  CheckCircle2,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { hexToRgb } from '../lib/colors';
import './Canvas.css';

const HANDLE_SIZE = 9;

export default function CanvasArea() {
  const {
    images,
    currentIndex,
    classes,
    mode,
    setMode,
    selectedBoxId,
    selectBox,
    addBox,
    updateBox,
    deleteBox,
    markCurrentDone,
    undo,
    redo,
    activeClassId,
    selectImage,
    setImageDimensions,
    requestClassInputFocus,
  } = useProjectStore();

  const img = currentIndex >= 0 ? images[currentIndex] : null;
  // Two stacked canvases: the base layer paints the image once per
  // image/zoom change (expensive), the overlay layer paints only the
  // boxes and is what redraws on every mousemove (cheap). Splitting these
  // is what keeps dragging/resizing feeling light instead of re-blitting
  // the full image on every pointer event.
  const baseCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const imgElRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState(null); // { type: 'new'|'move'|'resize', ... }
  const [hint, setHint] = useState('');
  const hintTimerRef = useRef(null);

  function showHint(message) {
    setHint(message);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(''), 2600);
  }

  const classById = new Map(classes.map((c) => [c.id, c]));

  // Load the natural image element whenever the current image changes.
  useEffect(() => {
    if (!img) return;
    const el = new Image();
    el.onload = () => {
      imgElRef.current = el;
      if (!img.width) setImageDimensions(currentIndex, el.naturalWidth, el.naturalHeight);
      drawBase();
      drawOverlay();
    };
    el.src = img.url;
    setZoom(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img?.id]);

  const canvasSize = useCallback(() => {
    const el = imgElRef.current;
    if (!el || !img) return { w: 0, h: 0 };
    return {
      w: (img.width || el.naturalWidth) * zoom,
      h: (img.height || el.naturalHeight) * zoom,
    };
  }, [img, zoom]);

  // Base layer: just the image. Only depends on the image element + zoom.
  const drawBase = useCallback(() => {
    const canvas = baseCanvasRef.current;
    const el = imgElRef.current;
    if (!canvas || !el || !img) return;
    const { w, h } = canvasSize();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(el, 0, 0, w, h);
  }, [img, canvasSize]);

  // Overlay layer: boxes, drag preview, selection handles. Redrawn often —
  // deliberately cheap (rects + text only, no image blit).
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !img) return;
    const { w, h } = canvasSize();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const allBoxes = drag && drag.type === 'new' ? [...img.boxes, drag.previewBox] : img.boxes;

    allBoxes.forEach((box) => {
      const b = drag && drag.type !== 'new' && drag.boxId === box.id ? drag.previewBox : box;
      const cls = classById.get(b.classId);
      const color = cls ? cls.color : '#8a8d9c';
      const rgb = hexToRgb(color);
      const x = b.x * zoom;
      const y = b.y * zoom;
      const bw = b.w * zoom;
      const bh = b.h * zoom;

      ctx.fillStyle = `rgba(${rgb}, 0.16)`;
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = color;
      ctx.lineWidth = b.id === selectedBoxId ? 2.5 : 1.5;
      ctx.strokeRect(x, y, bw, bh);

      const label = cls ? `${cls.id} ${cls.name}` : 'unassigned';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 16, textW + 10, 16);
      ctx.fillStyle = '#0c0d12';
      ctx.fillText(label, x + 5, y - 4);

      if (b.id === selectedBoxId) {
        ctx.fillStyle = color;
        const handles = [
          [x, y],
          [x + bw, y],
          [x, y + bh],
          [x + bw, y + bh],
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        });
      }
    });
  }, [img, zoom, drag, selectedBoxId, classes, canvasSize]);

  useEffect(() => {
    drawBase();
  }, [drawBase]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Keep the cursor correct the instant "Start annotation" is toggled,
  // even before the next mouse move.
  useEffect(() => {
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.cursor = mode === 'draw' ? 'crosshair' : 'default';
    }
  }, [mode]);

  function getPos(e) {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  }

  function hitHandle(box, pos) {
    const corners = {
      nw: { x: box.x, y: box.y },
      ne: { x: box.x + box.w, y: box.y },
      sw: { x: box.x, y: box.y + box.h },
      se: { x: box.x + box.w, y: box.y + box.h },
    };
    const tol = HANDLE_SIZE / zoom;
    for (const [key, c] of Object.entries(corners)) {
      if (Math.abs(pos.x - c.x) <= tol && Math.abs(pos.y - c.y) <= tol) return key;
    }
    return null;
  }

  function hitBox(pos) {
    for (let i = img.boxes.length - 1; i >= 0; i--) {
      const b = img.boxes[i];
      if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) return b;
    }
    return null;
  }

  function resizeCursorFor(handle) {
    return handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize';
  }

  // Sets the overlay canvas cursor directly (not React state) so hovering
  // around doesn't trigger re-renders — same reasoning as the two-layer
  // canvas split. Only meaningful in "browse" mode: draw mode always
  // stays crosshair since a click there starts a new box regardless of
  // what's underneath.
  function updateHoverCursor(pos) {
    const el = overlayCanvasRef.current;
    if (!el || !img) return;
    if (mode === 'draw') {
      el.style.cursor = 'crosshair';
      return;
    }
    const selected = img.boxes.find((b) => b.id === selectedBoxId);
    if (selected) {
      const handle = hitHandle(selected, pos);
      if (handle) {
        el.style.cursor = resizeCursorFor(handle);
        return;
      }
    }
    el.style.cursor = hitBox(pos) ? 'grab' : 'default';
  }

  function handleMouseDown(e) {
    if (!img) return;
    const pos = getPos(e);

    const selected = img.boxes.find((b) => b.id === selectedBoxId);
    if (selected) {
      const handle = hitHandle(selected, pos);
      if (handle) {
        setDrag({ type: 'resize', boxId: selected.id, handle, origin: pos, previewBox: selected });
        overlayCanvasRef.current.style.cursor = resizeCursorFor(handle);
        return;
      }
    }

    // Only select/move an existing box while browsing. In "draw" mode a
    // click always starts a new box, even on top of one already there —
    // this is what lets overlapping objects each get their own box
    // instead of the earlier box "stealing" the click.
    if (mode !== 'draw') {
      const clicked = hitBox(pos);
      if (clicked) {
        selectBox(clicked.id);
        setDrag({
          type: 'move',
          boxId: clicked.id,
          origin: pos,
          startBox: clicked,
          previewBox: clicked,
        });
        overlayCanvasRef.current.style.cursor = 'grabbing';
        return;
      }
      selectBox(null);
      showHint('Click "Start annotation" to draw new boxes.');
      return;
    }
    if (classes.length === 0) {
      showHint('Add at least one class before you can annotate.');
      requestClassInputFocus();
      return;
    }
    if (activeClassId === null || activeClassId === undefined) {
      showHint('Select or create a label before drawing a box.');
      return;
    }
    setHint('');
    selectBox(null);
    setDrag({
      type: 'new',
      origin: pos,
      previewBox: { id: 'preview', classId: activeClassId, x: pos.x, y: pos.y, w: 0, h: 0 },
    });
  }

  function handleMouseMove(e) {
    const pos = getPos(e);
    if (!drag) {
      updateHoverCursor(pos);
      return;
    }

    if (drag.type === 'new') {
      const x = Math.min(pos.x, drag.origin.x);
      const y = Math.min(pos.y, drag.origin.y);
      const w = Math.abs(pos.x - drag.origin.x);
      const h = Math.abs(pos.y - drag.origin.y);
      setDrag({ ...drag, previewBox: { ...drag.previewBox, x, y, w, h } });
    } else if (drag.type === 'move') {
      const dx = pos.x - drag.origin.x;
      const dy = pos.y - drag.origin.y;
      setDrag({
        ...drag,
        previewBox: { ...drag.startBox, x: drag.startBox.x + dx, y: drag.startBox.y + dy },
      });
    } else if (drag.type === 'resize') {
      const box = drag.previewBox;
      let { x, y, w, h } = box;
      const start = img.boxes.find((b) => b.id === drag.boxId);
      const x2 = start.x + start.w;
      const y2 = start.y + start.h;
      if (drag.handle === 'se') {
        w = pos.x - start.x;
        h = pos.y - start.y;
        x = start.x;
        y = start.y;
      } else if (drag.handle === 'nw') {
        x = pos.x;
        y = pos.y;
        w = x2 - pos.x;
        h = y2 - pos.y;
      } else if (drag.handle === 'ne') {
        y = pos.y;
        w = pos.x - start.x;
        h = y2 - pos.y;
        x = start.x;
      } else if (drag.handle === 'sw') {
        x = pos.x;
        w = x2 - pos.x;
        h = pos.y - start.y;
        y = start.y;
      }
      setDrag({ ...drag, previewBox: { ...box, x, y, w: Math.abs(w), h: Math.abs(h) } });
    }
  }

  function handleMouseUp() {
    if (!drag) return;
    if (drag.type === 'new') {
      if (drag.previewBox.w > 3 && drag.previewBox.h > 3) {
        addBox(currentIndex, { ...drag.previewBox, id: `box_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
      }
    } else if (drag.type === 'move' || drag.type === 'resize') {
      updateBox(currentIndex, drag.boxId, drag.previewBox, { record: true });
    }
    setDrag(null);
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.style.cursor = mode === 'draw' ? 'crosshair' : 'default';
    }
  }

  function handleKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId && document.activeElement.tagName !== 'INPUT') {
      deleteBox(currentIndex, selectedBoxId);
    }
  }

  if (!img) return <div className="canvas-area canvas-area-empty" />;

  return (
    <div className="canvas-area" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="canvas-toolbar">
        <button className="ct-btn" onClick={() => selectImage(currentIndex - 1)} disabled={currentIndex === 0}>
          <ChevronLeft size={16} />
        </button>
        <button
          className="ct-btn"
          onClick={() => selectImage(currentIndex + 1)}
          disabled={currentIndex === images.length - 1}
        >
          <ChevronRight size={16} />
        </button>

        <div className="ct-divider" />

        <button
          className={`ct-btn ${mode === 'draw' ? 'ct-btn-active' : ''}`}
          onClick={() => {
            if (classes.length === 0) {
              showHint('Add at least one class before you can annotate.');
              requestClassInputFocus();
              return;
            }
            setMode(mode === 'draw' ? 'browse' : 'draw');
          }}
          disabled={classes.length === 0}
          title={classes.length === 0 ? 'No classes yet' : undefined}
        >
          <PencilLine size={16} />
          {mode === 'draw' ? 'Drawing…' : 'Start annotation'}
        </button>

        <button
          className="ct-btn ct-btn-danger"
          onClick={() => selectedBoxId && deleteBox(currentIndex, selectedBoxId)}
          disabled={!selectedBoxId}
        >
          <Trash2 size={16} />
          Delete annotation
        </button>

        <button className="ct-btn" onClick={() => undo(currentIndex)}>
          <Undo2 size={16} />
        </button>
        <button className="ct-btn" onClick={() => redo(currentIndex)}>
          <Redo2 size={16} />
        </button>

        <div className="ct-divider" />

        <label className="ct-done">
          <input
            type="checkbox"
            checked={!!img.manualDone || img.status === 'done'}
            onChange={(e) => markCurrentDone(e.target.checked)}
          />
          <CheckCircle2 size={15} />
          Mark done
        </label>

        <div className="ct-spacer" />

        <button className="ct-btn ct-icon" onClick={() => setZoom((z) => Math.max(0.1, z - 0.15))}>
          <ZoomOut size={15} />
        </button>
        <span className="ct-zoom">{Math.round(zoom * 100)}%</span>
        <button className="ct-btn ct-icon" onClick={() => setZoom((z) => Math.min(4, z + 0.15))}>
          <ZoomIn size={15} />
        </button>
      </div>

      {hint && <div className="canvas-hint">{hint}</div>}

      <div className="canvas-scroll">
        <div className="canvas-stack" style={{ width: canvasSize().w, height: canvasSize().h }}>
          <canvas ref={baseCanvasRef} className="canvas-el canvas-base" />
          <canvas
            ref={overlayCanvasRef}
            className={`canvas-el canvas-overlay ${mode === 'draw' ? 'cursor-cross' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => drag && handleMouseUp()}
          />
        </div>
      </div>

      <div className="canvas-footer">
        <Square size={12} />
        <span>{img.name}</span>
        <span className="canvas-footer-dim">
          {img.width || '…'} × {img.height || '…'}
        </span>
      </div>
    </div>
  );
}
