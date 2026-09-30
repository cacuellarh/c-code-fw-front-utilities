import { ChangeDetectionStrategy, Component, computed, inject, input, resource } from '@angular/core';
import { ButtonComponent, PromoConfig, promoState } from '@c-code/c-code-fw/ui';
import { Entry, ScopeContext } from '../../../../domain/schema';
import { describePromoSchedule, PROMO_STATE_LABELS } from '../../../../domain/scopes/shared/promo.collection';
import { MediaService } from '../../../state/media.service';

/** How the popup looks on the site and, in words, when it shows. */
@Component({
  selector: 'cms-promo-preview',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promo-preview.component.html',
  styleUrl: './promo-preview.component.css',
})
export class PromoPreviewComponent {
  private media = inject(MediaService);
  readonly item = input.required<Entry>();
  readonly ctx = input.required<ScopeContext>();

  protected readonly promo = computed(() => this.item() as unknown as PromoConfig);
  protected readonly state = computed(() => promoState(this.promo()));
  protected readonly stateLabel = computed(() => PROMO_STATE_LABELS[this.state()]);
  protected readonly image = resource({
    request: () => this.promo().imageSrc,
    loader: ({ request }) => this.media.urlFor(request),
  });

  protected readonly when = computed(() => describePromoSchedule(this.promo()));
}
