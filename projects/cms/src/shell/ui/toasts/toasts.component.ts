import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../state/toast.service';
import { IconComponent } from '../icon/icon.component';

/** The notices of `ToastService`, bottom left, read by screen readers as they appear. */
@Component({
  selector: 'cms-toasts',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toasts.component.html',
  styleUrl: './toasts.component.css',
})
export class ToastsComponent {
  protected toast = inject(ToastService);
}
