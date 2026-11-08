import { Routes } from '@angular/router';

import {
  adminGuard,
  authGuard,
  cajeroGuard,
  companyAdminGuard,
  encargadoGuard,
  noAuthGuard,
  proveedorGuard,
  redirectStaffGuard,
  superadminGuard,
} from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/tienda/tienda-layout').then((m) => m.TiendaLayout),
    children: [
      {
        path: '',
        canActivate: [redirectStaffGuard],
        loadComponent: () =>
          import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'catalogo',
        loadComponent: () =>
          import('./features/tienda/catalogo-page').then(
            (m) => m.CatalogoPage,
          ),
      },
      {
        path: 'offline',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/offline/offline-page').then((m) => m.OfflinePage),
      },
      {
        path: 'catalogo/:id',
        loadComponent: () =>
          import('./features/tienda/producto-detalle-cliente-page').then(
            (m) => m.ProductoDetalleClientePage,
          ),
      },
      {
        path: 'mi-cuenta',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/identidad/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta),
      },
      {
        path: 'mi-reserva',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/reservas/mi-reserva-page').then(
            (m) => m.MiReservaPage,
          ),
      },
      {
        path: 'mis-reservas',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/reservas/mis-reservas-page').then(
            (m) => m.MisReservasPage,
          ),
      },
      {
        path: 'carrito',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/carrito/carrito-page').then((m) => m.CarritoPage),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/ventas/checkout-page').then((m) => m.CheckoutPage),
      },
      {
        path: 'checkout/resultado',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/ventas/checkout-resultado-page').then(
            (m) => m.CheckoutResultadoPage,
          ),
      },
      {
        path: 'mis-compras',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/ventas/mis-compras-page').then(
            (m) => m.MisComprasPage,
          ),
      },
      {
        path: 'mis-cambios',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/cambios/mis-cambios-page').then(
            (m) => m.MisCambiosPage,
          ),
      },
      {
        path: 'traspasos',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/traspasos/solicitar-traspaso-page').then(
            (m) => m.SolicitarTraspasoPage,
          ),
      },
      {
        path: 'confirmar-recepcion',
        loadComponent: () =>
          import('./features/traspasos/confirmar-recepcion-page').then(
            (m) => m.ConfirmarRecepcionPage,
          ),
      },
      {
        path: 'asistente',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/ia/asistente-page').then((m) => m.AsistentePage),
      },
      {
        // CU35 — Centro de notificaciones (Cliente, Admin, Encargado, Cajero)
        path: 'notificaciones',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/notificaciones/notificaciones-page').then(
            (m) => m.NotificacionesPage,
          ),
      },
    ],
  },
  {
    path: 'ingresar',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/identidad/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/identidad/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'plataforma',
    canActivate: [superadminGuard],
    loadComponent: () =>
      import('./features/saas/platform-layout').then((m) => m.PlatformLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empresas' },
      {
        path: 'empresas',
        loadComponent: () =>
          import('./features/saas/empresas-page').then((m) => m.EmpresasPage),
      },
      {
        path: 'planes',
        loadComponent: () =>
          import('./features/saas/planes-page').then((m) => m.PlanesPage),
      },
      {
        path: 'suscripciones',
        loadComponent: () =>
          import('./features/saas/suscripciones-page').then(
            (m) => m.SuscripcionesPage,
          ),
      },
    ],
  },
  {
    path: 'proveedor',
    canActivate: [proveedorGuard],
    loadComponent: () =>
      import('./features/portal-proveedor/proveedor-layout').then(
        (m) => m.ProveedorLayout,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'productos' },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/portal-proveedor/mis-productos-page').then(
            (m) => m.MisProductosPage,
          ),
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./features/portal-proveedor/mi-producto-detalle-page').then(
            (m) => m.MiProductoDetallePage,
          ),
      },
    ],
  },
  {
    path: 'encargado',
    canActivate: [encargadoGuard],
    loadComponent: () =>
      import('./features/encargado/encargado-layout').then(
        (m) => m.EncargadoLayout,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reservas' },
      {
        path: 'reservas',
        loadComponent: () =>
          import('./features/encargado/reservas-sucursal-page').then(
            (m) => m.ReservasSucursalPage,
          ),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario-page').then(
            (m) => m.InventarioPage,
          ),
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/inventario/movimientos-page').then(
            (m) => m.MovimientosPage,
          ),
      },
      {
        // CU36 — Alertas y reposición (Encargado: solo su sucursal)
        path: 'alertas',
        loadComponent: () =>
          import('./features/inventario/alertas-page').then((m) => m.AlertasPage),
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas-sucursal-page').then(
            (m) => m.VentasSucursalPage,
          ),
      },
      {
        path: 'cambios',
        loadComponent: () =>
          import('./features/cambios/cambios-sucursal-page').then(
            (m) => m.CambiosSucursalPage,
          ),
      },
      {
        path: 'cambios/nota/:id',
        loadComponent: () =>
          import('./features/cambios/nota-cambio-page').then(
            (m) => m.NotaCambioPage,
          ),
      },
      {
        path: 'traspasos',
        loadComponent: () =>
          import('./features/traspasos/solicitar-traspaso-page').then(
            (m) => m.SolicitarTraspasoPage,
          ),
      },
      {
        path: 'confirmar-recepcion',
        loadComponent: () =>
          import('./features/traspasos/confirmar-recepcion-page').then(
            (m) => m.ConfirmarRecepcionPage,
          ),
      },
      {
        path: 'despachar',
        loadComponent: () =>
          import('./features/traspasos/despachar-traspaso-page').then(
            (m) => m.DespacharTraspasoPage,
          ),
      },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./features/traspasos/seguimiento-traspaso-page').then(
            (m) => m.SeguimientoTraspasoPage,
          ),
      },
    ],
  },
  {
    path: 'caja',
    canActivate: [cajeroGuard],
    loadComponent: () =>
      import('./features/caja/caja-layout').then((m) => m.CajaLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'nueva-venta' },
      {
        path: 'nueva-venta',
        loadComponent: () =>
          import('./features/caja/nueva-venta-page').then(
            (m) => m.NuevaVentaPage,
          ),
      },
      {
        path: 'por-cobrar',
        loadComponent: () =>
          import('./features/caja/por-cobrar-page').then(
            (m) => m.PorCobrarPage,
          ),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./features/caja/historial-caja-page').then(
            (m) => m.HistorialCajaPage,
          ),
      },
      {
        path: 'comprobante/:id',
        loadComponent: () =>
          import('./features/caja/comprobante-page').then(
            (m) => m.ComprobantePage,
          ),
      },
      {
        path: 'cambios',
        loadComponent: () =>
          import('./features/cambios/cambios-sucursal-page').then(
            (m) => m.CambiosSucursalPage,
          ),
      },
      {
        path: 'cambios/nota/:id',
        loadComponent: () =>
          import('./features/cambios/nota-cambio-page').then(
            (m) => m.NotaCambioPage,
          ),
      },
      {
        path: 'reembolsos-efectivo',
        loadComponent: () =>
          import('./features/caja/reembolsos-efectivo-page').then(
            (m) => m.ReembolsosEfectivoPage,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'mi-plan',
        canActivate: [companyAdminGuard],
        loadComponent: () =>
          import('./features/saas/mi-plan-page').then((m) => m.MiPlanPage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/identidad/usuarios/usuarios-page').then(
            (m) => m.UsuariosPage,
          ),
      },
      {
        path: 'sucursales',
        loadComponent: () =>
          import('./features/sucursales/sucursales-page').then(
            (m) => m.SucursalesPage,
          ),
      },
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./features/proveedores/proveedores-page').then(
            (m) => m.ProveedoresPage,
          ),
      },
      {
        path: 'catalogo-base',
        loadComponent: () =>
          import('./features/catalogo/catalogo-base-page').then(
            (m) => m.CatalogoBasePage,
          ),
      },
      {
        path: 'temporadas',
        loadComponent: () =>
          import('./features/temporadas/temporadas-page').then(
            (m) => m.TemporadasPage,
          ),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-page').then(
            (m) => m.ProductosPage,
          ),
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./features/productos/producto-detalle-page').then(
            (m) => m.ProductoDetallePage,
          ),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario-page').then(
            (m) => m.InventarioPage,
          ),
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/inventario/movimientos-page').then(
            (m) => m.MovimientosPage,
          ),
      },
      {
        // CU36 — Alertas y reposición (Administrador)
        path: 'alertas',
        loadComponent: () =>
          import('./features/inventario/alertas-page').then((m) => m.AlertasPage),
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas-sucursal-page').then(
            (m) => m.VentasSucursalPage,
          ),
      },
      {
        path: 'reservas',
        loadComponent: () =>
          import('./features/encargado/reservas-sucursal-page').then(
            (m) => m.ReservasSucursalPage,
          ),
      },
      {
        path: 'cambios',
        loadComponent: () =>
          import('./features/cambios/cambios-sucursal-page').then(
            (m) => m.CambiosSucursalPage,
          ),
      },
      {
        path: 'cambios/nota/:id',
        loadComponent: () =>
          import('./features/cambios/nota-cambio-page').then(
            (m) => m.NotaCambioPage,
          ),
      },
      {
        path: 'traspasos',
        loadComponent: () =>
          import('./features/traspasos/traspasos-gestion-page').then(
            (m) => m.TraspasosGestionPage,
          ),
      },
      {
        path: 'promociones',
        loadComponent: () =>
          import('./features/promociones/promociones-page').then(
            (m) => m.PromocionesPage,
          ),
      },
      {
        path: 'reportes-gestion',
        loadComponent: () =>
          import('./features/reportes/reportes-gestion-page').then(
            (m) => m.ReportesGestionPage,
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/ia/reporte-voz-page').then(
            (m) => m.ReporteVozPage,
          ),
      },
      {
        path: 'exportar-reportes',
        loadComponent: () =>
          import('./features/reportes/exportar-reporte-page').then(
            (m) => m.ExportarReportePage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
