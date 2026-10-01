import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The C-Code mark (a coral "C/" tile) and, unless `compact`, the "C-Code" wordmark. */
@Component({
  selector: 'cms-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact]': 'compact()' },
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.css',
})
export class LogoComponent {
  readonly compact = input(false);
}
