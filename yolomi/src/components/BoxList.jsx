import { Trash2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import './BoxList.css';

export default function BoxList() {
  const { images, currentIndex, classes, selectedBoxId, selectBox, deleteBox } = useProjectStore();
  const img = currentIndex >= 0 ? images[currentIndex] : null;
  const classById = new Map(classes.map((c) => [c.id, c]));

  return (
    <section className="boxlist">
      <div className="boxlist-header">
        <span className="boxlist-title">Boxes on this image</span>
        <span className="boxlist-count">{img ? img.boxes.length : 0}</span>
      </div>

      <div className="boxlist-items">
        {!img || img.boxes.length === 0 ? (
          <div className="boxlist-empty">
            {img ? 'No boxes yet — draw one on the canvas.' : 'Open a project to begin.'}
          </div>
        ) : (
          img.boxes.map((box, i) => {
            const cls = classById.get(box.classId);
            return (
              <div
                key={box.id}
                className={`boxlist-row ${selectedBoxId === box.id ? 'is-selected' : ''}`}
                onClick={() => selectBox(box.id)}
              >
                <span className="boxlist-swatch" style={{ background: cls ? cls.color : '#555' }} />
                <span className="boxlist-label">{cls ? cls.name : 'Unassigned'}</span>
                <span className="boxlist-index">#{i + 1}</span>
                <button
                  className="boxlist-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBox(currentIndex, box.id);
                  }}
                  aria-label="Delete annotation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
