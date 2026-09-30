import { ImageEncoder } from '../../domain/ports';

/** `ImageEncoder` with the browser's canvas: scales the photo and encodes it as WebP. */
export class CanvasImageEncoder implements ImageEncoder {
  constructor(private quality = 0.82) {}

  async toWebp(image: Blob, maxSize: number): Promise<Blob> {
    const bitmap = await createImageBitmap(image);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo procesar la imagen.');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.convertToBlob({ type: 'image/webp', quality: this.quality });
  }
}
