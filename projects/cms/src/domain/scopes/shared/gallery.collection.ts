import { CollectionDef } from '../../schema';

/**
 * Photo gallery: photos with a caption, in order. Reusable by any kind of site; the site shows
 * it with `cc-gallery` (`GalleryImage`: src, thumb, caption). The thumbnail is filled in
 * automatically when a photo is chosen.
 */
export function galleryCollection(options: { file?: string; label?: string; description?: string } = {}): CollectionDef {
  return {
    id: 'gallery',
    label: options.label ?? 'Galería',
    singular: 'foto',
    feminine: true,
    icon: 'images',
    description: options.description ?? 'Fotos de la página de galería, en el orden en que se muestran.',
    file: options.file ?? 'src/assets/data/gallery.json',
    optional: true,
    titleKey: 'caption',
    imageKey: 'thumb',
    fields: [
      { key: 'src', label: 'Foto', type: 'image', kind: 'photo', thumbKey: 'thumb', required: true },
      {
        key: 'caption',
        label: 'Leyenda',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Jacuzzi con espuma para parejas',
        help: 'Se muestra al abrir la foto.',
      },
    ],
    create: () => ({ src: '', thumb: '', caption: '' }),
    validate: (photo, all) => {
      const src = String(photo['src'] ?? '');
      return src && all.some((other) => other !== photo && other['src'] === src)
        ? [{ field: 'src', message: 'Esta foto ya está en la galería.' }]
        : [];
    },
  };
}
