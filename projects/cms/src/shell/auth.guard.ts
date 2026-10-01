import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './state/auth.service';

/** Sends to the login page when there is no session, and back afterwards. */
export const signedIn: CanActivateFn = async (_route, state) => {
  // inject() only works before the first await.
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.user() ? true : router.createUrlTree(['/entrar'], { queryParams: { volver: state.url } });
};

/** Configuration pages: only admins. Others go back to the site (or the home page). */
export const adminOnly: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  if (auth.isAdmin()) return true;
  const siteId = route.parent?.paramMap.get('siteId');
  return router.createUrlTree(siteId ? ['/sitio', siteId] : ['/']);
};
