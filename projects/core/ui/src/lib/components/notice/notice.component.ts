import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Highlighted note for important conditions, warnings or tips. The content is projected.
 *
 * ```html
 * <cc-notice tone="warning" title="Importante">Su bono tiene vigencia de 30 días.</cc-notice>
 * ```
 *
 * Tokens: --cc-notice-bg, --cc-notice-border, --cc-notice-color.
 */
@Component({
  selector: 'cc-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'note',
    '[class.cc-notice--warning]': "tone() === 'warning'",
    '[class.cc-notice--success]': "tone() === 'success'",
  },
  templateUrl: './notice.component.html',
  styleUrls: ['../../theme/component-base.css', './notice.component.css'],
})
export class NoticeComponent {
  /** `info` uses the brand colors, `warning` a red accent, `success` the primary color. */
  readonly tone = input<'info' | 'warning' | 'success'>('info');
  readonly title = input<string>('');
}
