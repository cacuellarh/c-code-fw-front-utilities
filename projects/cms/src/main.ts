import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './shell/app.component';
import { appConfig } from './shell/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
