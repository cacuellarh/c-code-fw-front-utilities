import { Routes } from '@angular/router';
import { adminOnly, signedIn } from './auth.guard';
import { CollectionPage } from './ui/pages/collection/collection.page';
import { LoginPage } from './ui/pages/login/login.page';
import { MediaPage } from './ui/pages/media/media.page';
import { NewSitePage } from './ui/pages/new-site/new-site.page';
import { SettingsPage } from './ui/pages/settings/settings.page';
import { SitePage } from './ui/pages/site/site.page';
import { SitesPage } from './ui/pages/sites/sites.page';

export const routes: Routes = [
  { path: 'entrar', component: LoginPage, title: 'Entrar · C-Code' },
  { path: '', component: SitesPage, canActivate: [signedIn], title: 'Sitios · C-Code' },
  { path: 'nuevo-sitio', component: NewSitePage, canActivate: [signedIn, adminOnly], title: 'Nuevo sitio · C-Code' },
  {
    path: 'sitio/:siteId',
    component: SitePage,
    canActivate: [signedIn],
    title: 'Editar sitio · C-Code',
    children: [
      { path: 'imagenes', component: MediaPage, title: 'Imágenes · C-Code' },
      { path: 'configuracion', component: SettingsPage, canActivate: [adminOnly], title: 'Configuración · C-Code' },
      { path: ':collection', component: CollectionPage },
    ],
  },
  { path: '**', redirectTo: '' },
];
