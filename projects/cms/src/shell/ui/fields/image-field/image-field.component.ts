import { ChangeDetectionStrategy, Component, inject, input, model, resource, signal } from '@angular/core';
import { ImageField } from '../../../../domain/schema';
import { EditorService } from '../../../state/editor.service';

/**
 * Image of an entry: the path the JSON stores and the photo as the public site shows it.
 * Uploading images comes later, when we choose where to keep them.
 */
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

  protected readonly preview = resource({
    request: () => this.value(),
    loader: ({ request }) => this.editor.imageUrl(request),
  });
  protected readonly broken = signal(false);
}
