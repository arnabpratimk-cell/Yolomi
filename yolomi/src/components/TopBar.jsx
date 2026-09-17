import { useState, useRef } from 'react';
import { Boxes, FolderOpen, Download, ChevronDown, Check, FolderCog } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import './TopBar.css';

const EXPORT_FORMATS = [
  { key: 'yolo', label: 'YOLO' },
  { key: 'coco', label: 'COCO' },
  { key: 'voc', label: 'Pascal VOC' },
  { key: 'all', label: 'All formats' },
];

export default function TopBar({ onOpenFolder, onChooseLabelsFolder, onExport, labelsFolderName, message }) {
  const { projectName, images, lastSavedAt, supportsFSAccess } = useProjectStore();
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef(null);

  const doneCount = images.filter((i) => i.status === 'done').length;
  const hasProject = images.length > 0;

  function handleExportPick(key) {
    setExportOpen(false);
    onExport(key);
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Boxes size={20} strokeWidth={2.2} />
        <span className="topbar-name">Yolomi</span>
        {projectName && <span className="topbar-project">{projectName}</span>}
      </div>

      {hasProject && (
        <div className="topbar-progress">
          <span className="topbar-progress-count">
            {doneCount} / {images.length}
          </span>
          <span className="topbar-progress-label">done</span>
        </div>
      )}

      <div className="topbar-actions">
        <button className="tb-btn" onClick={onOpenFolder}>
          <FolderOpen size={16} />
          Open folder
        </button>

        {/* Labels save folder: choose exactly where label files land,
            then export straight into it. No separate project-save step. */}
        <div className="tb-group">
          <button
            className="tb-btn tb-btn-grouped tb-btn-folder"
            onClick={onChooseLabelsFolder}
            disabled={!hasProject}
            title="Choose where label files are saved"
          >
            <FolderCog size={14} />
            {labelsFolderName || 'Labels save folder'}
          </button>

          <div className="tb-menu-wrap" ref={menuRef}>
            <button
              className="tb-btn tb-btn-grouped tb-btn-accent"
              onClick={() => setExportOpen((v) => !v)}
              disabled={!hasProject}
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} className={`tb-chevron ${exportOpen ? 'is-open' : ''}`} />
            </button>
            {exportOpen && (
              <div className="tb-menu">
                {EXPORT_FORMATS.map((f) => (
                  <button key={f.key} className="tb-menu-item" onClick={() => handleExportPick(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lastSavedAt && (
        <div className="topbar-saved">
          <Check size={13} />
          Saved {lastSavedAt}
        </div>
      )}

      {!supportsFSAccess && (
        <div className="topbar-note">Read-only folder access in this browser — exports will download instead.</div>
      )}

      {message && (
        <div key={message.text} className={`topbar-toast tone-${message.tone}`}>
          {message.text}
        </div>
      )}
    </header>
  );
}
