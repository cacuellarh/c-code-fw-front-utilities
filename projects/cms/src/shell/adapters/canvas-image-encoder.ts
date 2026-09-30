import { EncodedImage, EncodeOptions, ImageEncoder } from '../../domain/ports';

/** `ImageEncoder` with the browser's canvas: scales the image and encodes it as WebP or JPEG. */
export class CanvasImageEncoder implements ImageEncoder {
  async encode(image: Blob, options: EncodeOptions): Promise<EncodedImage> {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(image);
    } catch {
      throw new Error('El navegador no pudo abrir la imagen. Usa JPG, PNG o WebP.');
    }
    const scale = Math.min(1, options.maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo procesar la imagen.');
    if (options.format === 'jpeg') {
      // JPEG has no transparency: put transparent areas on white instead of black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const type = options.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const blob = await canvas.convertToBlob({ type, quality: options.quality });
    // Browsers without a WebP encoder silently return PNG.
    if (blob.type !== type) throw new Error(`Este navegador no puede generar ${options.format.toUpperCase()}. Usa Chrome o Edge.`);
    return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
  }
}
