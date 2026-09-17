// Builds a single COCO-format instances.json.
export function exportCoco(images, classes) {
  const categories = classes.map((c) => ({ id: c.id, name: c.name, supercategory: 'none' }));

  const cocoImages = [];
  const annotations = [];
  let annotationId = 1;

  images.forEach((img, idx) => {
    const imageId = idx + 1;
    cocoImages.push({
      id: imageId,
      file_name: img.name,
      width: img.width,
      height: img.height,
    });

    img.boxes
      .filter((b) => b.classId !== null && b.classId !== undefined)
      .forEach((b) => {
        annotations.push({
          id: annotationId++,
          image_id: imageId,
          category_id: b.classId,
          bbox: [round(b.x), round(b.y), round(b.w), round(b.h)],
          area: round(b.w * b.h),
          iscrowd: 0,
        });
      });
  });

  const data = {
    images: cocoImages,
    annotations,
    categories,
  };

  return { 'instances.json': JSON.stringify(data, null, 2) };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
