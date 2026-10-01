import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { IconName, ICONS } from './icons';

/** A Lucide icon, 20 px by default, in the current text color. Decorative (hidden from screen readers). */
@Component({
  selector: 'cms-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.--size.px]': 'size()' },
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);
  /** An icon name; unknown names (a scope's typo) draw nothing. */
  readonly name = input.required<IconName | string>();
  readonly size = input(20);

  // The markup is ours (icons.ts), never user content.
  protected readonly markup = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name() as IconName] ?? ''));
}
