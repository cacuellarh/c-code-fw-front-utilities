import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'info' | 'error';
}

/** Short notices that go away on their own ("Guardado"), drawn by `cms-toasts`. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, tone: Toast['tone'] = 'ok'): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => this.dismiss(id), tone === 'error' ? 8000 : 4500);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
