import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavItem, PanelShell } from '../shared/panel-shell';

@Component({
  selector: 'app-caja-layout',
  imports: [RouterOutlet, PanelShell],
  template: `
    <app-panel-shell etiqueta="Panel de caja" [nav]="nav">
      <router-outlet />
    </app-panel-shell>
  `,
})
export class CajaLayout {
  protected readonly nav: NavItem[] = [
    { label: 'Nueva venta', icon: 'point_of_sale', link: '/caja/nueva-venta' },
    { label: 'Por cobrar', icon: 'pending_actions', link: '/caja/por-cobrar' },
    { label: 'Cambios y devoluciones', icon: 'sync_alt', link: '/caja/cambios' },
    { label: 'Historial', icon: 'receipt_long', link: '/caja/historial' },
    { label: 'Catálogo offline', icon: 'offline_pin', link: '/offline' },
  ];
}