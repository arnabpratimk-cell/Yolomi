// Builds { filename: content } for a YOLO-format export:
// one .txt per image (normalized "class_id x_center y_center width height")
// plus a classes.txt indexed by class_id.
export function exportYolo(images, classes) {
  const files = {};

  const maxId = classes.reduce((m, c) => Math.max(m, c.id), -1);
  const classLines = new Array(maxId + 1).fill('');
  classes.forEach((c) => {
    classLines[c.id] = c.name;
  });
  files['classes.txt'] = classLines.join('\n');

  images.forEach((img) => {
    const lines = img.boxes
      .filter((b) => b.classId !== null && b.classId !== undefined)
      .map((b) => {
        const xc = (b.x + b.w / 2) / img.width;
        const yc = (b.y + b.h / 2) / img.height;
        const w = b.w / img.width;
        const h = b.h / img.height;
        return `${b.classId} ${xc.toFixed(6)} ${yc.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`;
      });
    const base = img.name.replace(/\.[^/.]+$/, '');
    files[`${base}.txt`] = lines.join('\n');
  });

  return files;
}
