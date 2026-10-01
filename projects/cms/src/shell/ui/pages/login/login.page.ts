import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, signal } from '@angular/core';
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
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  /** Page to return to after signing in. */
  readonly volver = input<string>('/');

  /** True until Firebase says whether the person is already signed in (for example, back from Google). */
  protected readonly busy = signal(true);
  protected readonly error = signal('');

  constructor() {
    effect(() => {
      const code = this.auth.redirectError();
      if (code) this.error.set(loginError(code, code));
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    if (this.auth.user()) await this.router.navigateByUrl(this.volver() || '/');
    else this.busy.set(false);
  }

  protected async signIn(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      // Online this leaves the page; the person comes back here already signed in.
      await this.auth.signIn();
      if (this.auth.user()) await this.router.navigateByUrl(this.volver() || '/');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return this.busy.set(false);
      this.error.set(loginError(code, (e as Error).message));
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
