import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallBanner } from './core/pwa/pwa-install-banner';
import { NotificacionToastComponent } from './shared/notificacion-toast/notificacion-toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallBanner, NotificacionToastComponent],
  template: '<router-outlet /><app-pwa-install-banner /><app-notificacion-toast />',
})
export class App { }
