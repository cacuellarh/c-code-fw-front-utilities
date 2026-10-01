import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { slugify } from '@c-code/c-code-fw/ui';
import { titleOf } from '../../../../domain/content';
import { emptyText, emptyTitle, newLabel, pickPrompt } from '../../../../domain/labels';
import { EditorService } from '../../../state/editor.service';
import { MediaService } from '../../../state/media.service';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { EntryEditorComponent } from '../../entry-editor/entry-editor.component';
import { IconComponent } from '../../icon/icon.component';

/** One section of the site: the list of entries and the editor of the selected one (`?i=`). */
@Component({
  selector: 'cms-collection-page',
  host: { '[class.is-single]': 'state()?.def?.single', '[class.has-selection]': 'selected() >= 0' },
  imports: [EntryEditorComponent, IconComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './collection.page.html',
  styleUrl: './collection.page.css',
})
export class CollectionPage {
  protected editor = inject(EditorService);
  private media = inject(MediaService);
  private router = inject(Router);

  readonly collection = input.required<string>();
  readonly i = input(-1, { transform: (v: unknown) => (v === undefined || v === '' ? -1 : numberAttribute(v, -1)) });

  protected readonly query = signal('');
  protected readonly state = computed(() => this.editor.collection(this.collection()));
  protected readonly labels = computed(() => {
    const def = this.state()?.def;
    return def ? { add: newLabel(def), empty: emptyTitle(def), emptyText: emptyText(def), pick: pickPrompt(def) } : null;
  });
  protected readonly selected = computed(() => {
    const items = this.state()?.items ?? [];
    return this.i() >= 0 && this.i() < items.length ? this.i() : -1;
  });
  protected readonly thumbIsIcon = computed(() => {
    const def = this.state()?.def;
    const field = def?.fields.find((f) => f.key === def.imageKey);
    return field?.type === 'image' && field.kind === 'icon';
  });
  protected readonly issuesByIndex = computed(() => {
    const counts = new Map<number, number>();
    for (const issue of this.editor.issues()) {
      if (issue.collection === this.collection()) counts.set(issue.index, (counts.get(issue.index) ?? 0) + 1);
    }
    return counts;
  });
  protected readonly rows = computed(() => {
    const state = this.state();
    const ctx = this.editor.ctx();
    if (!state || !ctx) return [];
    const q = slugify(this.query());
    return state.items
      .map((item, index) => ({
        index,
        title: titleOf(state, item),
        subtitle: state.def.subtitle?.(item, ctx) ?? '',
        image: state.def.imageKey ? String(item[state.def.imageKey] ?? '') : '',
      }))
      .filter((row) => !q || slugify(row.title + ' ' + row.subtitle).includes(q));
  });
  protected readonly thumbs = resource({
    request: () => this.rows().map((row) => row.image),
    loader: async ({ request }) => {
      const urls = await Promise.all(request.map((path) => this.media.urlFor(path)));
      return new Map(request.map((path, i) => [path, urls[i]]));
    },
  });

  protected select(index: number): void {
    this.router.navigate([], { queryParams: { i: index >= 0 ? index : null }, queryParamsHandling: 'merge' });
  }

  protected add(): void {
    this.select(this.editor.addItem(this.collection()));
  }

  protected move(index: number, by: number, event: Event): void {
    event.stopPropagation();
    this.editor.moveItem(this.collection(), index, index + by);
    if (this.selected() === index) this.select(index + by);
  }
}
