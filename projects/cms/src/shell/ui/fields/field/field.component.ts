import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { formatPrice } from '@c-code/c-code-fw/ui';
import { MediaItem } from '../../../../domain/ports';
import { FieldDef } from '../../../../domain/schema';
import { IconComponent } from '../../icon/icon.component';
import { ImageFieldComponent } from '../image-field/image-field.component';
import { RelationFieldComponent } from '../relation-field/relation-field.component';

let nextId = 0;

/** Input for one field of an entry, chosen by the field type of the scope, with its help and problems. */
@Component({
  selector: 'cms-field',
  imports: [ImageFieldComponent, RelationFieldComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.half]': "field().width === 'half'", '[class.invalid]': 'issues().length > 0' },
  templateUrl: './field.component.html',
  styleUrl: './field.component.css',
})
export class FieldComponent {
  readonly field = input.required<FieldDef>();
  readonly value = model<unknown>();
  /** Problems of this field, shown under it. */
  readonly issues = input<string[]>([]);
  /** The value differs from the saved one: shows `changedHelp` instead of `help`. */
  readonly changed = input(false);
  /** For image fields: the image chosen in the library (null to remove it). */
  readonly imagePicked = output<MediaItem | null>();

  protected readonly id = `field-${nextId++}`;
  protected readonly text = computed(() => (this.value() ?? '') as string);
  protected readonly helpText = computed(() => {
    const field = this.field();
    return (this.changed() && field.changedHelp) || field.help || '';
  });
  /** "45/120", only for fields with a limit; `near` in the last 10 %. */
  protected readonly counter = computed(() => {
    const field = this.field();
    if ((field.type !== 'text' && field.type !== 'textarea') || !field.maxLength) return null;
    const length = this.text().length;
    return { text: `${length}/${field.maxLength}`, near: length >= field.maxLength * 0.9 };
  });
  protected readonly describedBy = computed(
    () => [this.issues().length ? `${this.id}-issue` : '', this.helpText() ? `${this.id}-help` : ''].filter(Boolean).join(' ') || null
  );
  protected readonly price = computed(() => {
    const field = this.field();
    return field.type === 'number' && field.format === 'price' ? formatPrice(Number(this.value()) || 0) : '';
  });
  protected readonly selectedIndex = computed(() => {
    const field = this.field();
    return field.type === 'select' ? field.options.findIndex((o) => o.value === this.value()) : -1;
  });

  protected onText(raw: string): void {
    const field = this.field();
    this.value.set(field.type === 'text' && field.uppercase ? raw.toUpperCase() : raw);
  }

  protected onNumber(raw: string): void {
    this.value.set(raw === '' ? 0 : Number(raw));
  }

  protected onSelect(index: string): void {
    const field = this.field();
    if (field.type === 'select') this.value.set(field.options[Number(index)]?.value);
  }

  protected asIds(value: unknown): number[] {
    return Array.isArray(value) ? value : [];
  }
}
