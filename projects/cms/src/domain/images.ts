import { slugify } from '@cc/ui-domain';
import { sitePath, uploadDir } from './paths';
import { ImageEncoder, SiteFiles } from './ports';
import { ImageField, SiteManifest } from './schema';

export const IMAGE_FILE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

/** An image chosen by the user. */
export interface UploadedImage {
  name: string;
  type: string;
  data: Blob;
}

/** File name that is not taken yet in the folder: "Foto Spa.JPG" -> "foto-spa.webp", "foto-spa-2.webp"… */
export function freeFileName(original: string, extension: string, taken: string[]): string {
  const base = slugify(original.replace(/\.[^.]+$/, '')) || 'imagen';
  const names = new Set(taken.map((name) => name.toLowerCase()));
  let name = `${base}.${extension}`;
  for (let n = 2; names.has(name); n++) name = `${base}-${n}.${extension}`;
  return name;
}

export function extensionOf(name: string): string {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
}

/** Photos are converted to WebP; icons, SVG and GIF are kept as they are. */
export function shouldConvert(field: ImageField, image: UploadedImage): boolean {
  return field.kind !== 'icon' && !/svg|gif/i.test(image.type);
}

/** Saves an image in the field's folder and returns the path to store in the JSON. */
export async function saveImage(
  files: SiteFiles,
  encoder: ImageEncoder,
  manifest: SiteManifest,
  field: ImageField,
  image: UploadedImage
): Promise<string> {
  const dir = uploadDir(manifest, field);
  const convert = shouldConvert(field, image);
  const data = convert ? await encoder.toWebp(image.data, field.maxSize ?? 1600) : image.data;
  const name = freeFileName(image.name, convert ? 'webp' : extensionOf(image.name) || 'png', await files.list(dir));
  await files.write(`${dir}/${name}`, data);
  return sitePath(manifest, field, name);
}

/** Images already in the field's folder, as the paths the JSON stores. */
export async function listImages(files: SiteFiles, manifest: SiteManifest, field: ImageField): Promise<string[]> {
  const names = await files.list(uploadDir(manifest, field));
  return names.filter((name) => IMAGE_FILE.test(name)).map((name) => sitePath(manifest, field, name));
}
