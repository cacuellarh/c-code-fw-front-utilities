import { ChangeDetectionStrategy, Component, inject, input, model, resource, signal } from '@angular/core';
import { ImageField } from '../../../../domain/schema';
import { EditorService } from '../../../state/editor.service';

/** Image of an entry: shows it, uploads a new one into the site or picks one already there. */
@Component({
  selector: 'cms-image-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-field.component.html',
  styleUrl: './image-field.component.css',
})
export class ImageFieldComponent {
  private editor = inject(EditorService);
  readonly field = input.required<ImageField>();
  readonly inputId = input<string>('');
  readonly value = model<string>('');

  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly picking = signal(false);

  protected readonly preview = resource({
    request: () => this.value(),
    loader: ({ request }) => this.editor.imageUrl(request),
  });

  protected readonly existing = resource({
    request: () => (this.picking() ? this.field() : undefined),
    loader: async ({ request }) => {
      const paths = request ? await this.editor.listImages(request) : [];
      return Promise.all(paths.map(async (path) => ({ path, url: await this.editor.imageUrl(path) })));
    },
  });

  protected async upload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      this.value.set(await this.editor.uploadImage(this.field(), file));
      this.picking.set(false);
    } catch (error) {
      this.error.set(`No se pudo guardar la imagen: ${(error as Error).message}`);
    } finally {
      this.uploading.set(false);
    }
  }

  protected choose(path: string): void {
    this.value.set(path);
    this.picking.set(false);
  }
}
