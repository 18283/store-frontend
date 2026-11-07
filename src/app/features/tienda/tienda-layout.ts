import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

import { AuthService } from '../../core/auth/auth.service';
import { ROL } from '../../core/models/usuario.model';
import { NotificacionBell } from '../../shared/notificacion-bell/notificacion-bell';
import { CarritoService } from '../carrito/carrito.service';
import { ReservaBolsaService } from '../reservas/reserva-bolsa.service';

@Component({
  selector: 'app-tienda-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    NotificacionBell,
  ],
  templateUrl: './tienda-layout.html',
  styleUrl: './tienda-layout.scss',
})
export class TiendaLayout {
  private readonly auth = inject(AuthService);
  private readonly carritoSvc = inject(CarritoService);
  private readonly reservaBolsa = inject(ReservaBolsaService);

  protected readonly usuario = this.auth.user;
  protected readonly esAdmin = () => this.auth.hasRole(ROL.ADMIN);
  protected readonly esProveedor = () => this.auth.hasRole(ROL.PROVEEDOR);
  protected readonly esEncargado = () => this.auth.hasRole(ROL.ENCARGADO);
  protected readonly esCajero = () => this.auth.hasRole(ROL.CAJERO);
  protected readonly esCliente = () => this.auth.hasRole(ROL.CLIENTE);
  protected readonly cantidadCarrito = this.carritoSvc.cantidadItems;
  protected readonly cantidadReserva = this.reservaBolsa.cantidad;

  constructor() {
    if (this.esCliente()) {
      this.carritoSvc.cargar().subscribe();
    }
  }

  salir(): void {
    this.carritoSvc.limpiarLocal();
    this.reservaBolsa.limpiar();
    this.auth.logout();
  }
}
