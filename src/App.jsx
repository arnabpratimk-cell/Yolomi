import { useRef, useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/Canvas';
import ClassPanel from './components/ClassPanel';
import BoxList from './components/BoxList';
import EmptyState from './components/EmptyState';
import { useProjectStore } from './store/useProjectStore';
import { openFolder, filesFromFileList, writeExportBundle, supportsFSAccess, pickSaveFolder, ensureReadWrite } from './lib/fileSystem';
import { exportYolo } from './lib/exporters/yolo';
import { exportCoco } from './lib/exporters/coco';
import { exportPascalVoc } from './lib/exporters/pascalVoc';
import './App.css';

let imgUid = 1;

export default function App() {
  const { images, classes, projectName, exportDirHandle, loadProject, setLastSavedAt, setExportDirHandle } =
    useProjectStore();
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  function flashMessage(text, tone = 'info') {
    setMessage({ text, tone });
    setTimeout(() => setMessage(null), 3200);
  }

  function buildImageRecords(files) {
    return files.map((file) => ({
      id: `img_${imgUid++}`,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      width: 0,
      height: 0,
      boxes: [],
      status: 'not-started',
      manualDone: false,
      opened: false,
    }));
  }

  async function handleOpenFolder() {
    if (supportsFSAccess) {
      try {
        const result = await openFolder();
        if (!result) return;
        loadProject({ name: result.name, dirHandle: result.dirHandle, images: buildImageRecords(result.files) });
        setExportDirHandle(null); // new project — clear any previously chosen labels folder
      } catch (err) {
        if (err?.name !== 'AbortError') console.error(err);
      }
      return;
    }
    fileInputRef.current?.click();
  }

  function handleFileInputChange(e) {
    if (!e.target.files || e.target.files.length === 0) return;
    const result = filesFromFileList(e.target.files);
    loadProject({ name: result.name, dirHandle: null, images: buildImageRecords(result.files) });
    setExportDirHandle(null);
    e.target.value = '';
  }

  async function handleChooseLabelsFolder() {
    if (!supportsFSAccess) {
      flashMessage('This browser can\u2019t pick a folder \u2014 labels will download instead', 'warning');
      return;
    }
    try {
      const picked = await pickSaveFolder();
      if (picked) {
        setExportDirHandle(picked);
        flashMessage(`Labels will save to "${picked.name}"`, 'success');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    }
  }

  async function ensureLabelsFolder() {
    if (exportDirHandle && (await ensureReadWrite(exportDirHandle))) return exportDirHandle;
    // No folder chosen yet (or permission lapsed) — ask directly rather
    // than silently failing.
    await handleChooseLabelsFolder();
    const { exportDirHandle: fresh } = useProjectStore.getState();
    return fresh && (await ensureReadWrite(fresh)) ? fresh : null;
  }

  async function handleExport(format) {
    const readyImages = images.filter((img) => img.width > 0);
    try {
      const target = await ensureLabelsFolder();
      let wroteToDisk = false;
      if (format === 'yolo' || format === 'all') {
        const res = await writeExportBundle(target, 'yolo_labels', exportYolo(readyImages, classes));
        wroteToDisk = wroteToDisk || res.written;
      }
      if (format === 'coco' || format === 'all') {
        const res = await writeExportBundle(target, 'coco_labels', exportCoco(readyImages, classes));
        wroteToDisk = wroteToDisk || res.written;
      }
      if (format === 'voc' || format === 'all') {
        const res = await writeExportBundle(target, 'voc_labels', exportPascalVoc(readyImages, classes, projectName));
        wroteToDisk = wroteToDisk || res.written;
      }
      flashMessage(
        wroteToDisk ? `Labels saved to "${target.name}"` : 'Folder write unavailable — downloaded zip instead',
        wroteToDisk ? 'success' : 'warning'
      );
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      flashMessage('Export failed — see console for details', 'error');
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        onOpenFolder={handleOpenFolder}
        onChooseLabelsFolder={handleChooseLabelsFolder}
        onExport={handleExport}
        labelsFolderName={exportDirHandle?.name}
        message={message}
      />
      <input
        ref={fileInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {images.length === 0 ? (
        <EmptyState onOpenFolder={handleOpenFolder} />
      ) : (
        <div className="app-body">
          <Sidebar />
          <CanvasArea />
          <div className="app-rightcol">
            <ClassPanel />
            <BoxList />
          </div>
        </div>
      )}
    </div>
  );
}
