import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../state/auth.service';
import { LogoComponent } from '../../logo/logo.component';

/** Sign in with Google. Firestore rules decide afterwards which sites the user can edit. */
@Component({
  selector: 'cms-login-page',
  imports: [LogoComponent],
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
      this.error.set(loginError(code, (e as Error).message));
    } finally {
      this.busy.set(false);
    }
  }
}

function loginError(code: string, detail: string): string {
  switch (code) {
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/unauthorized-domain':
      // Only happens while setting up a new address of the CMS.
      return 'Esta dirección no está autorizada en Firebase (Authentication → Configuración → Dominios autorizados).';
    default:
      return `No se pudo entrar. Intenta de nuevo. (${detail})`;
  }
}
