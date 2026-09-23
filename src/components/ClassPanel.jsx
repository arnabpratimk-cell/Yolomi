import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import './ClassPanel.css';

export default function ClassPanel() {
  const {
    classes,
    addClass,
    updateClass,
    removeClass,
    classIdConflict,
    activeClassId,
    setActiveClassId,
    focusClassInputRequest,
  } = useProjectStore();
  const [newName, setNewName] = useState('');
  const [idErrors, setIdErrors] = useState({});
  const [flash, setFlash] = useState(false);
  const inputRef = useRef(null);

  // One hidden <input type="color"> per class, keyed by class id
  const colorRefs = useRef({});

  useEffect(() => {
    if (focusClassInputRequest === 0) return;
    inputRef.current?.focus();
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [focusClassInputRequest]);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addClass(name);
    setNewName('');
  }

  function handleIdChange(cls, raw) {
    const value = raw.replace(/[^0-9]/g, '');
    const num = value === '' ? null : parseInt(value, 10);
    if (num !== null && classIdConflict(num, cls.id)) {
      setIdErrors((e) => ({ ...e, [cls.id]: `ID ${num} is already used` }));
      updateClass(cls.id, { pendingId: value });
      return;
    }
    setIdErrors((e) => ({ ...e, [cls.id]: null }));
    if (num !== null) updateClass(cls.id, { id: num, pendingId: undefined });
    else updateClass(cls.id, { pendingId: value });
  }

  function handleColorClick(e, cls) {
    e.stopPropagation();
    // Trigger the hidden native color picker for this class
    colorRefs.current[cls.id]?.click();
  }

  function handleColorChange(cls, newColor) {
    updateClass(cls.id, { color: newColor });
  }

  const sorted = [...classes].sort((a, b) => a.id - b.id);
  const idsInUse = classes.map((c) => c.id).sort((a, b) => a - b);
  const hasGap = idsInUse.some((id, i) => i > 0 && id !== idsInUse[i - 1] + 1);

  return (
    <section className="classpanel">
      <div className="classpanel-header">
        <span className="classpanel-title">Classes</span>
        {activeClassId !== null && (
          <span className="classpanel-active-hint">
            drawing as {classes.find((c) => c.id === activeClassId)?.name}
          </span>
        )}
      </div>

      {hasGap && (
        <div className="classpanel-warning">
          Class IDs have a gap — YOLO export expects a contiguous 0..N sequence.
        </div>
      )}

      <div className="classpanel-list">
        {sorted.map((cls) => (
          <div
            key={cls.id}
            className={`classpanel-row ${activeClassId === cls.id ? 'is-active' : ''}`}
            onClick={() => setActiveClassId(cls.id)}
          >
            {/* Clickable color swatch — opens native color picker */}
            <span
              className="classpanel-swatch classpanel-swatch-btn"
              style={{ background: cls.color }}
              onClick={(e) => handleColorClick(e, cls)}
              title="Click to change colour"
            />
            {/* Hidden native color input */}
            <input
              type="color"
              value={cls.color}
              ref={(el) => { colorRefs.current[cls.id] = el; }}
              onChange={(e) => handleColorChange(cls, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            />
            <input
              className="classpanel-id"
              value={cls.pendingId !== undefined ? cls.pendingId : cls.id}
              onChange={(e) => handleIdChange(cls, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              inputMode="numeric"
            />
            <input
              className="classpanel-name"
              value={cls.name}
              onChange={(e) => updateClass(cls.id, { name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="classpanel-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeClass(cls.id);
              }}
              aria-label={`Remove ${cls.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {idErrors && Object.entries(idErrors).some(([, v]) => v) && (
          <div className="classpanel-error">
            {Object.values(idErrors).find((v) => v)}
          </div>
        )}
      </div>

      <div className="classpanel-add">
        <input
          ref={inputRef}
          className={`classpanel-add-input ${flash ? 'is-flash' : ''}`}
          placeholder="New class name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="classpanel-add-btn" onClick={handleAdd}>
          <Plus size={15} />
        </button>
      </div>
    </section>
  );
}
