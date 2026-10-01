import { booleanAttribute, ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';

export type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderTone = 'accent' | 'inverse' | 'current';
export type LoaderLayout = 'inline' | 'block' | 'overlay';

/**
 * Loading indicator: a ring with two opposite arcs that turns half a turn at a time. Screen
 * readers hear `label`; `showLabel` also shows it.
 *
 * ```html
 * <cc-loader />
 * <button ccButton [disabled]="saving()">@if (saving()) { <cc-loader size="sm" tone="current" /> } Guardar</button>
 * <section style="position: relative"> … <cc-loader layout="overlay" [delay]="300" /></section>
 * ```
 *
 * - `layout="block"` centers it in its own padded area (a section that is loading).
 * - `layout="overlay"` covers the nearest positioned ancestor (`position: relative`) with a
 *   translucent canvas.
 * - `delay` (ms) keeps it invisible during short waits, so fast loads do not flash.
 *
 * Tokens: --cc-loader-color, --cc-loader-size, --cc-loader-thickness, --cc-loader-speed,
 * --cc-loader-overlay. The color needs ≥3:1 against its background (WCAG 1.4.11).
 */
@Component({
  selector: 'cc-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    '[class.cc-loader--sm]': "size() === 'sm'",
    '[class.cc-loader--lg]': "size() === 'lg'",
    '[class.cc-loader--inverse]': "tone() === 'inverse'",
    '[class.cc-loader--current]': "tone() === 'current'",
    '[class.cc-loader--block]': "layout() === 'block'",
    '[class.cc-loader--overlay]': "layout() === 'overlay'",
    '[style.--_loader-delay]': "delay() + 'ms'",
  },
  templateUrl: './loader.component.html',
  styleUrls: ['../../theme/component-base.css', './loader.component.css'],
})
export class LoaderComponent {
  readonly size = input<LoaderSize>('md');
  /** `accent`: the site's accent (its readable version, `--cc-accent-text`); `inverse`: the dark role; `current`: the text color around it. */
  readonly tone = input<LoaderTone>('accent');
  readonly layout = input<LoaderLayout>('inline');
  /** What screen readers announce. */
  readonly label = input('Cargando…');
  /** Also shows `label` under the ring. */
  readonly showLabel = input(false, { transform: booleanAttribute });
  /** Milliseconds before it appears. */
  readonly delay = input(0, { transform: numberAttribute });
}
