import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { formatPrice } from '@c-code/c-code-fw/ui';
import { FieldDef } from '../../../../domain/schema';
import { ImageFieldComponent } from '../image-field/image-field.component';
import { RelationFieldComponent } from '../relation-field/relation-field.component';

let nextId = 0;

/** Input for one field of an entry, chosen by the field type of the scope. */
@Component({
  selector: 'cms-field',
  imports: [ImageFieldComponent, RelationFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.half]': "field().width === 'half'" },
  templateUrl: './field.component.html',
  styleUrl: './field.component.css',
})
export class FieldComponent {
  readonly field = input.required<FieldDef>();
  readonly value = model<unknown>();

  protected readonly id = `field-${nextId++}`;
  protected readonly text = computed(() => (this.value() ?? '') as string);
  protected readonly empty = computed(() => this.field().required && (this.value() === '' || this.value() == null));
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
