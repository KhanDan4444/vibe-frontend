const MAX_DIMENSION = 800;
const TARGET_MAX_BYTES = 350 * 1024;

/**
 * Resize and compress a member photo before upload so enroll requests stay small.
 * @param {File} file
 * @returns {Promise<string>} JPEG data URL
 */
export async function compressMemberPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not process the photo in this browser.');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > TARGET_MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  return readBlobAsDataUrl(blob);
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not compress the photo.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the compressed photo.'));
    reader.readAsDataURL(blob);
  });
}
