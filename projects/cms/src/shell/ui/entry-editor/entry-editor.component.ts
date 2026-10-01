import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CollectionData, savedEntry, titleOf } from '../../../domain/content';
import { applyImage } from '../../../domain/media';
import { MediaItem } from '../../../domain/ports';
import { FieldDef } from '../../../domain/schema';
import { AuthService } from '../../state/auth.service';
import { DialogService } from '../../state/dialog.service';
import { EditorService } from '../../state/editor.service';
import { FieldComponent } from '../fields/field/field.component';
import { IconComponent } from '../icon/icon.component';
import { PREVIEWS } from '../previews/previews';

/** Form of one entry, drawn from the fields of its collection, with the scope's preview. */
@Component({
  selector: 'cms-entry-editor',
  imports: [FieldComponent, NgComponentOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-editor.component.html',
  styleUrl: './entry-editor.component.css',
})
export class EntryEditorComponent {
  protected editor = inject(EditorService);
  protected auth = inject(AuthService);
  private dialogs = inject(DialogService);
  readonly collection = input.required<CollectionData>();
  readonly index = input.required<number>();
  /** Single-entry collection (settings): the section's name is the title; no duplicate or delete. */
  readonly single = input(false);
  /** Id for the title, so the page's section can point to it. */
  readonly headingId = input<string | null>(null);
  readonly removed = output<void>();
  readonly duplicated = output<number>();

  protected readonly item = computed(() => this.collection().items[this.index()]);
  protected readonly title = computed(() => (this.single() ? this.collection().def.label : titleOf(this.collection(), this.item())));
  protected readonly kind = computed(() => {
    const { singular } = this.collection().def;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  });
  protected readonly idLabel = computed(() => {
    const key = this.collection().def.idKey;
    return key ? `id ${this.item()[key]}` : '';
  });
  private readonly issues = computed(() =>
    this.editor.issues().filter((i) => i.collection === this.collection().def.id && i.index === this.index())
  );
  /** Problems about the whole entry; the rest show next to their field. */
  protected readonly generalIssues = computed(() => this.issues().filter((i) => !i.field));
  protected readonly fieldIssues = computed(() => {
    const byField = new Map<string, string[]>();
    for (const issue of this.issues()) if (issue.field) byField.set(issue.field, [...(byField.get(issue.field) ?? []), issue.message]);
    return byField;
  });
  private readonly saved = computed(() => savedEntry(this.collection(), this.index()));
  protected readonly preview = computed(() => {
    const key = this.collection().def.preview;
    return key ? PREVIEWS[key] ?? null : null;
  });
  protected readonly previewInputs = computed(() => ({ item: this.item(), ctx: this.editor.ctx() }));

  /** The field's value differs from the saved one (not for new entries). */
  protected changed(key: string): boolean {
    const saved = this.saved();
    return !!saved && JSON.stringify(saved[key] ?? null) !== JSON.stringify(this.item()[key] ?? null);
  }

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

  protected async remove(): Promise<void> {
    const { def } = this.collection();
    const refs = this.editor.referencesTo(def.id, this.index());
    const also = refs.length
      ? `También se quitará de: ${refs.slice(0, 6).map((r) => r.title).join(', ')}${refs.length > 6 ? '…' : ''}. `
      : '';
    const ok = await this.dialogs.confirm({
      title: `¿Eliminar «${this.title()}»?`,
      body: `${also}Tu sitio dejará de mostrarlo cuando publiques.`,
      confirm: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.editor.removeItem(def.id, this.index());
    this.removed.emit();
  }
}
