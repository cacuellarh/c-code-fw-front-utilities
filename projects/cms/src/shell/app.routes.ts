import { Routes } from '@angular/router';
import { signedIn } from './auth.guard';
import { CollectionPage } from './ui/pages/collection/collection.page';
import { LoginPage } from './ui/pages/login/login.page';
import { MediaPage } from './ui/pages/media/media.page';
import { SitePage } from './ui/pages/site/site.page';
import { SitesPage } from './ui/pages/sites/sites.page';

export const routes: Routes = [
  { path: 'entrar', component: LoginPage, title: 'Entrar · C-Code CMS' },
  { path: '', component: SitesPage, canActivate: [signedIn], title: 'Sitios · C-Code CMS' },
  {
    path: 'sitio/:siteId',
    component: SitePage,
    canActivate: [signedIn],
    title: 'Editar sitio · C-Code CMS',
    children: [
      { path: 'imagenes', component: MediaPage, title: 'Imágenes · C-Code CMS' },
      { path: ':collection', component: CollectionPage },
    ],
  },
  { path: '**', redirectTo: '' },
];
