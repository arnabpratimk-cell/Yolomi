import { FolderOpen, ScanLine } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({ onOpenFolder }) {
  return (
    <div className="empty">
      <ScanLine size={38} strokeWidth={1.5} className="empty-icon" />
      <h1 className="empty-title">Open a folder to start annotating</h1>
      <p className="empty-body">
        Choose a folder of images. Yolomi keeps everything on this device — nothing is
        uploaded anywhere.
      </p>
      <button className="empty-cta" onClick={onOpenFolder}>
        <FolderOpen size={16} />
        Open folder
      </button>
    </div>
  );
}
