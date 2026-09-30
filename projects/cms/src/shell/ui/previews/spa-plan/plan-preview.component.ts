import { ChangeDetectionStrategy, Component, computed, inject, input, resource } from '@angular/core';
import { AdditionalService, defaultPlanMeta, Plan, PlanCardComponent, planSlug } from '@c-code/c-code-fw/ui';
import { Entry, ScopeContext } from '../../../../domain/schema';
import { MediaService } from '../../../state/media.service';
import { planRoute } from '../../../../domain/scopes/spa/spa.generators';

/** How the plan looks on the site: its card with the site's colors, its address and its services. */
@Component({
  selector: 'cms-plan-preview',
  imports: [PlanCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-preview.component.html',
  styleUrl: './plan-preview.component.css',
})
export class PlanPreviewComponent {
  private media = inject(MediaService);
  readonly item = input.required<Entry>();
  readonly ctx = input.required<ScopeContext>();

  /** Shown while there is no photo, instead of a broken image. */
  protected readonly placeholder =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e7e5e4"/><text x="200" y="158" font-family="sans-serif" font-size="20" fill="#78716c" text-anchor="middle">Sin foto</text></svg>'
    );
  protected readonly plan = computed(() => this.item() as unknown as Plan);
  protected readonly meta = computed(() => defaultPlanMeta(this.plan()));
  protected readonly url = computed(() => {
    const site = (this.ctx().manifest.siteUrl ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return site + planRoute(this.ctx()) + planSlug(this.plan().name ?? '');
  });
  protected readonly image = resource({
    request: () => this.plan().imgPath,
    loader: ({ request }) => this.media.urlFor(request),
  });
  protected readonly services = computed(() => {
    const byId = new Map(this.ctx().data('additionals').map((s) => [s['id'], s as unknown as AdditionalService]));
    return (this.plan().additionalServicesId ?? []).map((id) => byId.get(id)).filter((s): s is AdditionalService => !!s);
  });
  protected readonly icons = resource({
    request: () => this.services().map((s) => s.iconPath),
    loader: ({ request }) => Promise.all(request.map((path) => this.media.urlFor(path))),
  });
}
