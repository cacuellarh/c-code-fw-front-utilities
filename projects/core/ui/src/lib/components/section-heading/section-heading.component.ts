import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Section title with optional eyebrow, icon, subtitle and decorative rule.
 * Use one per page section so every page shares the same heading rhythm.
 *
 * ```html
 * <cc-section-heading title="Planes" subtitle="Para ti, en pareja o en grupo" iconSrc="assets/images/trebol.png" />
 * <cc-section-heading title="Contacto" tone="inverse" align="center" level="h3" />
 * ```
 *
 * Tokens: --cc-section-heading-color, --cc-section-heading-size, --cc-section-heading-rule,
 * --cc-section-heading-gap, --cc-section-heading-icon-size.
 */
@Component({
  selector: 'cc-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-sh--center]': "align() === 'center'",
    '[class.cc-sh--inverse]': "tone() === 'inverse'",
    '[class.cc-sh--accent]': "tone() === 'accent'",
    '[class.cc-sh--rule]': 'rule()',
    '[class.cc-sh--sm]': "size() === 'sm'",
    '[class.cc-sh--lg]': "size() === 'lg'",
    '[class.cc-sh--italic]': 'italic()',
  },
  templateUrl: './section-heading.component.html',
  styleUrls: ['../../theme/component-base.css', './section-heading.component.css'],
})
export class SectionHeadingComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  /** Small text above the title. */
  readonly eyebrow = input<string>('');
  readonly iconSrc = input<string>('');
  /** Heading level. The visual size does not change with the level. */
  readonly level = input<'h1' | 'h2' | 'h3'>('h2');
  readonly align = input<'start' | 'center'>('start');
  /** `default` for light backgrounds, `inverse` for dark ones, `accent` for brand-colored titles. */
  readonly tone = input<'default' | 'inverse' | 'accent'>('default');
  /** Shows a short accent line under the title. */
  readonly rule = input(false, { transform: booleanAttribute });
  /** `sm` for sub-sections, `md` (default) for page sections, `lg` for heroes. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly italic = input(false, { transform: booleanAttribute });
  /** Id of the heading element, for anchors. */
  readonly headingId = input<string | null>(null);
}
