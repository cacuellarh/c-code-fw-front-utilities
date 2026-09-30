import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../state/auth.service';

/** Sign in with Google. Firestore rules decide afterwards which sites the user can edit. */
@Component({
  selector: 'cms-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  /** Page to return to after signing in. */
  readonly volver = input<string>('/');

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async signIn(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.signIn();
      await this.router.navigateByUrl(this.volver() || '/');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      this.error.set(
        code === 'auth/unauthorized-domain'
          ? 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).'
          : `No se pudo iniciar sesión: ${(e as Error).message}`
      );
    } finally {
      this.busy.set(false);
    }
  }
}
