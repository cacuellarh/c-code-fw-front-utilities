import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DialogHostComponent } from './ui/dialog/dialog-host.component';
import { ToastsComponent } from './ui/toasts/toasts.component';

@Component({
  selector: 'cms-root',
  imports: [RouterOutlet, DialogHostComponent, ToastsComponent],
  template: '<router-outlet /><cms-dialog-host /><cms-toasts />',
})
export class AppComponent {}
