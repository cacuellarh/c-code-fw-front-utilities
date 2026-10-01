import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  body?: string;
  /** Label of the main button. Default: "Aceptar". */
  confirm?: string;
  /** Label of the second button; null for a dialog with one button. Default: "Cancelar". */
  cancel?: string | null;
  /** `danger` paints the main button red and focuses "Cancelar" first. */
  tone?: 'default' | 'danger';
}

interface OpenDialog extends DialogOptions {
  resolve: (ok: boolean) => void;
}

/** Confirmations and notices in the CMS's own dialog (drawn by `cms-dialog-host`), instead of confirm() and alert(). */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly current = signal<OpenDialog | null>(null);

  /** Resolves true when the person accepts. */
  confirm(options: DialogOptions): Promise<boolean> {
    this.current()?.resolve(false);
    return new Promise((resolve) => this.current.set({ ...options, resolve }));
  }

  /** A notice with a single button. */
  async alert(options: Omit<DialogOptions, 'cancel' | 'tone'>): Promise<void> {
    await this.confirm({ confirm: 'Entendido', ...options, cancel: null });
  }

  close(ok: boolean): void {
    const open = this.current();
    if (!open) return;
    this.current.set(null);
    open.resolve(ok);
  }
}
