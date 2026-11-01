import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavItem, PanelShell } from '../shared/panel-shell';

@Component({
  selector: 'app-encargado-layout',
  imports: [RouterOutlet, PanelShell],
  template: `
    <app-panel-shell etiqueta="Panel de sucursal" [nav]="nav">
      <router-outlet />
    </app-panel-shell>
  `,
})
export class EncargadoLayout {
  protected readonly nav: NavItem[] = [
    { label: 'Reservas', icon: 'event_available', link: '/encargado/reservas' },
    { label: 'Cambios y devoluciones', icon: 'assignment_return', link: '/encargado/cambios' },
    { label: 'Inventario', icon: 'inventory_2', link: '/encargado/inventario' },
    { label: 'Catálogo offline', icon: 'offline_pin', link: '/offline' },
    {
      label: 'Movimientos de stock',
      icon: 'sync_alt',
      link: '/encargado/movimientos',
    },
    { label: 'Ventas', icon: 'point_of_sale', link: '/encargado/ventas' },
  ];
}
