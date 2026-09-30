import { ChangeDetectionStrategy, Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { slugify } from '@c-code/c-code-fw/ui';
import { RelationField } from '../../../../domain/schema';
import { EditorService } from '../../../state/editor.service';

/** Picks entries of another collection (the services a plan includes) with checkboxes. */
@Component({
  selector: 'cms-relation-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './relation-field.component.html',
  styleUrl: './relation-field.component.css',
})
export class RelationFieldComponent {
  private editor = inject(EditorService);
  readonly field = input.required<RelationField>();
  readonly inputId = input<string>('');
  readonly value = input<number[]>([]);
  readonly valueChange = output<number[]>();

  protected readonly query = signal('');
  protected readonly target = computed(() => this.editor.collection(this.field().collection));
  protected readonly selected = computed(() => new Set(this.value()));
  protected readonly options = computed(() => {
    const target = this.target();
    if (!target) return [];
    const idKey = target.def.idKey ?? 'id';
    return target.items.map((item) => ({
      id: item[idKey] as number,
      label: String(item[target.def.titleKey] ?? ''),
      icon: target.def.imageKey ? String(item[target.def.imageKey] ?? '') : '',
    }));
  });
  protected readonly visible = computed(() => {
    const q = slugify(this.query());
    return q ? this.options().filter((o) => slugify(o.label).includes(q)) : this.options();
  });
  protected readonly icons = resource({
    request: () => this.options().map((o) => o.icon),
    loader: async ({ request }) => {
      const urls = await Promise.all(request.map((path) => this.editor.imageUrl(path)));
      return new Map(request.map((path, i) => [path, urls[i]]));
    },
  });

  protected toggle(id: number, on: boolean): void {
    const current = this.value();
    this.valueChange.emit(on ? [...current.filter((v) => v !== id), id] : current.filter((v) => v !== id));
  }
}
