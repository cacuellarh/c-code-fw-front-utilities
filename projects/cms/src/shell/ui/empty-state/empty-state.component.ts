import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** An empty list or screen: icon, title, one line and (projected) a button. */
@Component({
  selector: 'cms-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  readonly icon = input('info');
  readonly heading = input.required<string>();
  readonly text = input('');
}
