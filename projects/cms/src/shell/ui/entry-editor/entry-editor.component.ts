import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CollectionData, titleOf } from '../../../domain/content';
import { applyImage } from '../../../domain/media';
import { MediaItem } from '../../../domain/ports';
import { FieldDef } from '../../../domain/schema';
import { EditorService } from '../../state/editor.service';
import { FieldComponent } from '../fields/field/field.component';
import { PREVIEWS } from '../previews/previews';

/** Form of one entry, drawn from the fields of its collection, with the scope's preview. */
@Component({
  selector: 'cms-entry-editor',
  imports: [FieldComponent, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-editor.component.html',
  styleUrl: './entry-editor.component.css',
})
export class EntryEditorComponent {
  protected editor = inject(EditorService);
  readonly collection = input.required<CollectionData>();
  readonly index = input.required<number>();
  readonly removed = output<void>();
  readonly duplicated = output<number>();

  protected readonly item = computed(() => this.collection().items[this.index()]);
  protected readonly title = computed(() => titleOf(this.collection(), this.item()));
  protected readonly idLabel = computed(() => {
    const key = this.collection().def.idKey;
    return key ? `id ${this.item()[key]}` : '';
  });
  protected readonly issues = computed(() =>
    this.editor.issues().filter((i) => i.collection === this.collection().def.id && i.index === this.index())
  );
  protected readonly preview = computed(() => {
    const key = this.collection().def.preview;
    return key ? PREVIEWS[key] ?? null : null;
  });
  protected readonly previewInputs = computed(() => ({ item: this.item(), ctx: this.editor.ctx() }));

  protected set(key: string, value: unknown): void {
    this.editor.updateItem(this.collection().def.id, this.index(), { ...this.item(), [key]: value });
  }

  protected setImage(field: FieldDef, media: MediaItem | null): void {
    if (field.type !== 'image') return;
    this.editor.updateItem(this.collection().def.id, this.index(), applyImage(field, this.item(), media));
  }

  protected duplicate(): void {
    this.duplicated.emit(this.editor.addItem(this.collection().def.id, this.item()));
  }

  protected remove(): void {
    const { def } = this.collection();
    const refs = this.editor.referencesTo(def.id, this.index());
    const detail = refs.length
      ? `\n\nTambién se quitará de ${refs.length} ${refs.length === 1 ? 'entrada' : 'entradas'}: ` +
        refs.slice(0, 8).map((r) => r.title).join(', ') + (refs.length > 8 ? '…' : '')
      : '';
    if (!confirm(`¿Eliminar ${def.singular} "${this.title()}"?${detail}`)) return;
    this.editor.removeItem(def.id, this.index());
    this.removed.emit();
  }
}
