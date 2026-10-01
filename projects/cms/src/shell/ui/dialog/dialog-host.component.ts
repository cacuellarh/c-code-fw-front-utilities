import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { DialogService } from '../../state/dialog.service';

/** Draws the dialog of `DialogService` with a native modal `<dialog>` (focus trap and Esc for free). */
@Component({
  selector: 'cms-dialog-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog-host.component.html',
  styleUrl: './dialog-host.component.css',
})
export class DialogHostComponent {
  protected dialogs = inject(DialogService);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterRenderEffect(() => {
      const open = this.dialogs.current();
      const el = this.dialog().nativeElement;
      if (open && !el.open) {
        el.showModal();
        // Destructive actions start on "Cancelar"; the rest on the main button.
        el.querySelector<HTMLButtonElement>(open.tone === 'danger' && open.cancel !== null ? '.cancel' : '.main')?.focus();
      }
      if (!open && el.open) el.close();
    });
  }
}
