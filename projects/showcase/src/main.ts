import { provideHttpClient, withFetch } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePlanCatalog, provideSeo } from '@c-code/c-code-fw/ui';
import { AppComponent } from './app/app.component';
import { routes } from './app/routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    providePlanCatalog(),
    provideSeo({ siteUrl: 'https://showcase.local', defaultImage: 'assets/images/8.jpeg' }),
  ],
}).catch((err) => console.error(err));
