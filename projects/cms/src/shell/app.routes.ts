import { Routes } from '@angular/router';
import { CollectionPage } from './ui/pages/collection/collection.page';
import { SitePage } from './ui/pages/site/site.page';
import { SitesPage } from './ui/pages/sites/sites.page';

export const routes: Routes = [
  { path: '', component: SitesPage, title: 'Sitios · C-Code CMS' },
  {
    path: 'sitio/:siteId',
    component: SitePage,
    title: 'Editar sitio · C-Code CMS',
    children: [{ path: ':collection', component: CollectionPage }],
  },
  { path: '**', redirectTo: '' },
];
