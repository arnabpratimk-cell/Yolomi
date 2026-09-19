import { create } from 'zustand';
import { colorForIndex } from '../lib/colors';

let boxUid = 1;
export const nextBoxId = () => `box_${boxUid++}`;

function computeStatus(image) {
  if (image.manualDone) return 'done';
  if (image.boxes.length > 0) return 'done';
  if (image.opened) return 'in-progress';
  return 'not-started';
}

export const useProjectStore = create((set, get) => ({
  projectName: '',
  dirHandle: null,
  exportDirHandle: null,
  supportsFSAccess: typeof window !== 'undefined' && 'showDirectoryPicker' in window,

  classes: [],
  images: [],
  currentIndex: -1,
  mode: 'browse', // 'browse' | 'draw'
  selectedBoxId: null,
  statusFilter: 'all', // all | not-started | in-progress | done
  lastSavedAt: null,
  history: {}, // imageId -> { past: Box[][], future: Box[][] }

  // ---- Project / images ----
  loadProject({ name, dirHandle, images }) {
    set({
      projectName: name,
      dirHandle: dirHandle || null,
      images,
      currentIndex: images.length ? 0 : -1,
      mode: 'browse',
      selectedBoxId: null,
      history: {},
      lastSavedAt: null,
    });
  },

  setDirHandle(handle) {
    set({ dirHandle: handle });
  },

  setExportDirHandle(handle) {
    set({ exportDirHandle: handle });
  },

  setLastSavedAt(ts) {
    set({ lastSavedAt: ts });
  },

  setImageDimensions(index, width, height) {
    const { images } = get();
    if (!images[index] || images[index].width) return;
    const updated = images.slice();
    updated[index] = { ...updated[index], width, height };
    set({ images: updated });
  },

  activeClassId: null,
  setActiveClassId(id) {
    set({ activeClassId: id });
  },

  focusClassInputRequest: 0,
  requestClassInputFocus() {
    set((s) => ({ focusClassInputRequest: s.focusClassInputRequest + 1 }));
  },

  selectImage(index) {
    const { images } = get();
    if (index < 0 || index >= images.length) return;
    const updated = images.slice();
    updated[index] = { ...updated[index], opened: true };
    updated[index].status = computeStatus(updated[index]);
    set({ currentIndex: index, selectedBoxId: null, mode: 'browse', images: updated });
  },

  setStatusFilter(filter) {
    set({ statusFilter: filter });
  },

  setMode(mode) {
    const { images, currentIndex } = get();
    if (currentIndex < 0) return;
    const updated = images.slice();
    updated[currentIndex] = { ...updated[currentIndex], opened: true };
    updated[currentIndex].status = computeStatus(updated[currentIndex]);
    set({ mode, images: updated });
  },

  markCurrentDone(done) {
    const { images, currentIndex } = get();
    if (currentIndex < 0) return;
    const updated = images.slice();
    const img = { ...updated[currentIndex], manualDone: done };
    img.status = computeStatus(img);
    updated[currentIndex] = img;
    set({ images: updated });
  },

  // ---- Classes ----
  addClass(name) {
    const { classes } = get();
    const usedIds = new Set(classes.map((c) => c.id));
    let nextId = 0;
    while (usedIds.has(nextId)) nextId++;
    const color = colorForIndex(classes.length);
    set({ classes: [...classes, { id: nextId, name: name || `class_${nextId}`, color }] });
  },

  updateClass(oldId, patch) {
    const { classes } = get();
    set({
      classes: classes.map((c) => (c.id === oldId ? { ...c, ...patch } : c)),
    });
  },

  removeClass(id) {
    const { classes, images } = get();
    set({
      classes: classes.filter((c) => c.id !== id),
      // Unassign boxes that used this class rather than silently deleting them
      images: images.map((img) => ({
        ...img,
        boxes: img.boxes.map((b) => (b.classId === id ? { ...b, classId: null } : b)),
      })),
    });
  },

  classIdConflict(id, excludingId) {
    return get().classes.some((c) => c.id === id && c.id !== excludingId);
  },

  // ---- Boxes ----
  pushHistory(imageId, prevBoxes) {
    const { history } = get();
    const h = history[imageId] || { past: [], future: [] };
    set({
      history: {
        ...history,
        [imageId]: { past: [...h.past, prevBoxes], future: [] },
      },
    });
  },

  addBox(imageIndex, box) {
    const { images } = get();
    const img = images[imageIndex];
    get().pushHistory(img.id, img.boxes);
    const updated = images.slice();
    const newImg = { ...img, boxes: [...img.boxes, box] };
    newImg.status = computeStatus(newImg);
    updated[imageIndex] = newImg;
    set({ images: updated, selectedBoxId: box.id });
  },

  updateBox(imageIndex, boxId, patch, { record = false } = {}) {
    const { images } = get();
    const img = images[imageIndex];
    if (record) get().pushHistory(img.id, img.boxes);
    const updated = images.slice();
    updated[imageIndex] = {
      ...img,
      boxes: img.boxes.map((b) => (b.id === boxId ? { ...b, ...patch } : b)),
    };
    set({ images: updated });
  },

  deleteBox(imageIndex, boxId) {
    const { images, selectedBoxId } = get();
    const img = images[imageIndex];
    get().pushHistory(img.id, img.boxes);
    const updated = images.slice();
    const newImg = { ...img, boxes: img.boxes.filter((b) => b.id !== boxId) };
    newImg.status = computeStatus(newImg);
    updated[imageIndex] = newImg;
    set({
      images: updated,
      selectedBoxId: selectedBoxId === boxId ? null : selectedBoxId,
    });
  },

  selectBox(boxId) {
    set({ selectedBoxId: boxId });
  },

  undo(imageIndex) {
    const { images, history } = get();
    const img = images[imageIndex];
    const h = history[img.id];
    if (!h || h.past.length === 0) return;
    const prev = h.past[h.past.length - 1];
    const newPast = h.past.slice(0, -1);
    const updated = images.slice();
    const newImg = { ...img, boxes: prev };
    newImg.status = computeStatus(newImg);
    updated[imageIndex] = newImg;
    set({
      images: updated,
      history: { ...history, [img.id]: { past: newPast, future: [img.boxes, ...h.future] } },
      selectedBoxId: null,
    });
  },

  redo(imageIndex) {
    const { images, history } = get();
    const img = images[imageIndex];
    const h = history[img.id];
    if (!h || h.future.length === 0) return;
    const next = h.future[0];
    const newFuture = h.future.slice(1);
    const updated = images.slice();
    const newImg = { ...img, boxes: next };
    newImg.status = computeStatus(newImg);
    updated[imageIndex] = newImg;
    set({
      images: updated,
      history: { ...history, [img.id]: { past: [...h.past, img.boxes], future: newFuture } },
      selectedBoxId: null,
    });
  },
}));
