import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ROL } from '../../core/models/usuario.model';
import { NavItem, PanelShell } from '../shared/panel-shell';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, PanelShell],
  template: `
    <app-panel-shell etiqueta="Administración" [nav]="nav()">
      <router-outlet />
    </app-panel-shell>
  `,
})
export class AdminLayout {
  private readonly auth = inject(AuthService);

  protected readonly nav = computed<NavItem[]>(() => [
    ...(this.auth.hasRole(ROL.SUPERADMIN)
      ? [{ label: 'Volver a plataforma SaaS', icon: 'arrow_back', link: '/plataforma/empresas' }]
      : [{ label: 'Mi plan y consumo', icon: 'workspace_premium', link: '/admin/mi-plan' }]),
    { label: 'Usuarios', icon: 'group', link: '/admin/usuarios' },
    { label: 'Centro de notificaciones', icon: 'notifications', link: '/notificaciones' },
    { label: 'Sucursales', icon: 'store', link: '/admin/sucursales' },
    { label: 'Catálogo offline', icon: 'offline_pin', link: '/offline' },
    { label: 'Proveedores', icon: 'local_shipping', link: '/admin/proveedores' },
    { label: 'Productos', icon: 'checkroom', link: '/admin/productos' },
    { label: 'Inventario', icon: 'inventory_2', link: '/admin/inventario' },
    {
      label: 'Movimientos de stock',
      icon: 'sync_alt',
      link: '/admin/movimientos',
    },
    {
      label: 'Alertas y reposición',
      icon: 'notifications_active',
      link: '/admin/alertas',
    },
    { label: 'Ventas', icon: 'point_of_sale', link: '/admin/ventas' },
    { label: 'Reservas', icon: 'event_available', link: '/admin/reservas' },
    { label: 'Cambios y devoluciones', icon: 'assignment_return', link: '/admin/cambios' },
    { label: 'Gestión de traspasos', icon: 'gavel', link: '/admin/traspasos' },
    { label: 'Datos del catálogo', icon: 'sell', link: '/admin/catalogo-base' },
    {
      label: 'Temporadas y colecciones',
      icon: 'calendar_month',
      link: '/admin/temporadas',
    },
    { label: 'Promociones', icon: 'local_offer', link: '/admin/promociones' },
    {
      label: 'Analítica inteligente',
      icon: 'auto_graph',
      children: [
        { label: 'Dashboard analítico', icon: 'dashboard', link: '/admin/analitica' },
        { label: 'Predicción de demanda', icon: 'insights', link: '/admin/analitica/demanda' },
        {
          label: 'Agrupaciones de productos',
          icon: 'scatter_plot',
          link: '/admin/analitica/agrupaciones',
        },
      ],
    },
    {
      label: 'Reportes de ventas e inventario',
      icon: 'bar_chart',
      link: '/admin/reportes-gestion',
    },
    {
      label: 'Exportar reportes Excel/PDF',
      icon: 'file_download',
      link: '/admin/exportar-reportes',
    },
    { label: 'Reportes (IA por voz)', icon: 'mic', link: '/admin/reportes' },
  ]);
}