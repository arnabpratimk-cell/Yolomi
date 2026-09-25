const IMAGE_EXT = /\.(jpe?g|png|webp|bmp|avif|gif|svg|ico|tiff?)$/i;

export const supportsFSAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function naturalSort(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

export async function openFolder() {
  if (supportsFSAccess) {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && IMAGE_EXT.test(name)) {
        const file = await handle.getFile();
        files.push(file);
      }
    }
    files.sort(naturalSort);
    return { name: dirHandle.name, dirHandle, files };
  }
  return null;
}

// Reads existing YOLO .txt label files from the same folder as the images.
// Returns a Map of { imageNameWithoutExt -> rawTxtContent }
export async function readLabelsForImages(dirHandle, imageFiles) {
  if (!dirHandle) return new Map();
  const labelMap = new Map();
  for (const file of imageFiles) {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const txtName = `${baseName}.txt`;
    try {
      const fileHandle = await dirHandle.getFileHandle(txtName);
      const txtFile = await fileHandle.getFile();
      const text = await txtFile.text();
      if (text.trim()) labelMap.set(baseName, text.trim());
    } catch {
      // .txt does not exist for this image - skip silently
    }
  }
  return labelMap;
}

// Parse a single YOLO .txt file into box objects.
// Stores normalized coords in _normalized for later conversion to pixels.
export function parseYoloLabels(txtContent, classes) {
  const boxes = [];
  const lines = txtContent.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const parts = line.trim().split(/\s+/).map(Number);
    if (parts.length !== 5 || parts.some(isNaN)) continue;
    const [classId, cx, cy, w, h] = parts;
    boxes.push({
      id: `box_imported_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      classId: classes.find((c) => c.id === classId) ? classId : null,
      _normalized: { cx, cy, w, h },
      x: 0, y: 0, w: 0, h: 0,
    });
  }
  return boxes;
}

export async function pickSaveFolder() {
  if (!supportsFSAccess) return null;
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

export async function ensureReadWrite(dirHandle) {
  if (!dirHandle) return false;
  const opts = { mode: 'readwrite' };
  try {
    if ((await dirHandle.queryPermission(opts)) === 'granted') return true;
    if ((await dirHandle.requestPermission(opts)) === 'granted') return true;
    return false;
  } catch (err) {
    console.error('Permission check failed', err);
    return false;
  }
}

export function filesFromFileList(fileList) {
  const files = Array.from(fileList).filter((f) => IMAGE_EXT.test(f.name));
  files.sort(naturalSort);
  const folderName = files[0]?.webkitRelativePath?.split('/')[0] || 'Untitled Project';
  return { name: folderName, dirHandle: null, files };
}

async function writeFile(dirHandle, filename, contents) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

export async function writeExportBundle(dirHandle, zipNameIfFallback, fileMap) {
  if (dirHandle) {
    for (const [filename, contents] of Object.entries(fileMap)) {
      await writeFile(dirHandle, filename, contents);
    }
    return { written: true };
  }
  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');
  const zip = new JSZip();
  for (const [filename, contents] of Object.entries(fileMap)) {
    zip.file(filename, contents);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${zipNameIfFallback}.zip`);
  return { written: false };
}
