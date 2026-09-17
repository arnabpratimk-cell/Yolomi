// Builds { filename: xmlString } for a Pascal VOC export — one XML per image.
export function exportPascalVoc(images, classes, folderName) {
  const classById = new Map(classes.map((c) => [c.id, c]));
  const files = {};

  images.forEach((img) => {
    const objects = img.boxes
      .filter((b) => b.classId !== null && b.classId !== undefined)
      .map((b) => {
        const cls = classById.get(b.classId);
        const xmin = Math.round(b.x);
        const ymin = Math.round(b.y);
        const xmax = Math.round(b.x + b.w);
        const ymax = Math.round(b.y + b.h);
        return `  <object>
    <name>${escapeXml(cls ? cls.name : 'unknown')}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>${xmin}</xmin>
      <ymin>${ymin}</ymin>
      <xmax>${xmax}</xmax>
      <ymax>${ymax}</ymax>
    </bndbox>
  </object>`;
      })
      .join('\n');

    const xml = `<annotation>
  <folder>${escapeXml(folderName || '')}</folder>
  <filename>${escapeXml(img.name)}</filename>
  <size>
    <width>${img.width}</width>
    <height>${img.height}</height>
    <depth>3</depth>
  </size>
  <segmented>0</segmented>
${objects}
</annotation>`;

    const base = img.name.replace(/\.[^/.]+$/, '');
    files[`${base}.xml`] = xml;
  });

  return files;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
