import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';

import { NotificacionService } from '../../core/services/notificacion.service';
import { Notificacion } from '../../core/models/notificacion.model';

/**
 * CU35 — Campanita: muestra las notificaciones centralizadas de todos los
 * módulos (reservas, cambios, traspasos, suscripción, sincronización…),
 * no solo traspasos. El centro completo vive en /notificaciones.
 */
@Component({
  selector: 'app-notificacion-bell',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatBadgeModule, MatMenuModule],
  templateUrl: './notificacion-bell.html',
  styleUrl: './notificacion-bell.scss',
})
export class NotificacionBell implements OnInit, OnDestroy {
  public readonly service = inject(NotificacionService);

  private intervalo?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.service.cargarNotificaciones(1, 20).subscribe({ error: () => {} });

    this.intervalo = setInterval(() => {
      this.service.cargarNotificaciones(1, 20).subscribe({ error: () => {} });
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  /** Al hacer clic en una notificación: PATCH /notificaciones/{id}/leer */
  onNotificacionClick(notificacion: Notificacion): void {
    this.service
      .marcarComoLeida(notificacion.id)
      .subscribe({ error: () => {} });
  }

  /** Botón "Marcar todas como leídas": PATCH /notificaciones/leer-todas */
  onMarcarTodas(): void {
    this.service
      .marcarTodasComoLeidas()
      .subscribe({ error: () => {} });
  }
}
