import { useProjectStore } from '../store/useProjectStore';
import './Sidebar.css';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'not-started', label: 'Not started' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export default function Sidebar() {
  const { images, currentIndex, statusFilter, setStatusFilter, selectImage } = useProjectStore();

  const doneCount = images.filter((i) => i.status === 'done').length;
  const filtered = images
    .map((img, idx) => ({ img, idx }))
    .filter(({ img }) => statusFilter === 'all' || img.status === statusFilter);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Images</span>
        <span className="sidebar-count">
          {doneCount}/{images.length}
        </span>
      </div>

      <div className="sidebar-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`sidebar-filter ${statusFilter === f.key ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="sidebar-list">
        {filtered.length === 0 && <div className="sidebar-empty">No images in this filter.</div>}
        {filtered.map(({ img, idx }) => (
          <button
            key={img.id}
            className={`sidebar-item status-${img.status} ${idx === currentIndex ? 'is-current' : ''}`}
            onClick={() => selectImage(idx)}
            title={img.name}
          >
            <div className="sidebar-thumb-wrap">
              <img src={img.url} alt="" className="sidebar-thumb" />
              <span className={`sidebar-badge badge-${img.status}`} />
            </div>
            <span className="sidebar-item-name">{img.name}</span>
            <span className="sidebar-item-boxes">{img.boxes.length}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
