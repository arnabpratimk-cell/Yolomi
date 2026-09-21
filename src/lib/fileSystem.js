const IMAGE_EXT = /\.(jpe?g|png|webp|bmp|avif|gif|svg|ico|tiff?)$/i;;

export const supportsFSAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

// Natural sort so "img2.jpg" comes before "img10.jpg", matching how File
// Explorer / Finder normally list a folder.
function naturalSort(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

// Returns { name, dirHandle, files: File[] } or null if the user cancels.
// mode: 'readwrite' is required up front — without it Chrome grants
// read-only access and every later write silently fails.
export async function openFolder() {
  if (supportsFSAccess) {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const files = [];
    // dirHandle.entries() does not guarantee any particular order, so the
    // list gets sorted below rather than trusting iteration order.
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && IMAGE_EXT.test(name)) {
        const file = await handle.getFile();
        files.push(file);
      }
    }
    files.sort(naturalSort);
    return { name: dirHandle.name, dirHandle, files };
  }
  return null; // caller falls back to <input webkitdirectory>
}

// Lets the user pick any folder to save/export into, independent of the
// folder the images were opened from. Used when there's no writable
// dirHandle yet (e.g. images were loaded via the read-only file input),
// or when the user explicitly wants a different export destination.
export async function pickSaveFolder() {
  if (!supportsFSAccess) return null;
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

// Confirms we actually have write permission on a handle, re-requesting
// it if the browser downgraded or never granted it. Returns true/false.
// Defensive: some browsers can throw here rather than reject cleanly, in
// which case we treat it as "no permission" so callers fall back to an
// explicit folder picker instead of silently doing nothing.
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

// Fallback path: build a fake "folder name" from a FileList gathered via
// <input type="file" webkitdirectory multiple>. Browsers don't guarantee
// order here either, so this also gets sorted.
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Writes a map of { filename: contentString } directly into dirHandle —
// no subfolder nesting, so label files land exactly where the user chose.
// Only zips as a last resort when there's no writable folder handle at
// all (browser without File System Access support).
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
