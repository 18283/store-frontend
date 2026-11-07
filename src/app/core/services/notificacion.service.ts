import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.model';

/**
 * Notificaciones reales desde el backend.
 * El backend usa el JWT del usuario (inyectado por authInterceptor) para
 * conocer a quién pertenecen las notificaciones. Ante un 401, el
 * interceptor limpia la sesión y navega a /ingresar.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notificaciones`;

  /** Lista que viene del backend (se actualiza con cargarNotificaciones). */
  readonly notificaciones = signal<Notificacion[]>([]);

  /** Notificaciones no leídas para el badge de la campanita. */
  readonly notificacionesNoLeidas = computed(() =>
    this.notificaciones().filter((n) => !n.leida)
  );

  readonly cargando = signal<boolean>(false);

  /** GET /notificaciones?page=1&size=50 — actualiza el signal con la lista. */
  cargarNotificaciones(page = 1, size = 50): Observable<Notificacion[]> {
    this.cargando.set(true);
    const params = new HttpParams().set('page', page).set('size', size);

    return this.http
      .get<any>(this.baseUrl, { params })
      .pipe(
        map((res) => this.parseResponse(res)),
        tap((items) => {
          this.notificaciones.set(items);
          this.cargando.set(false);
        }),
        catchError((err) => {
          this.cargando.set(false);
          // El 401 ya lo gestiona authInterceptor (limpia y redirige).
          // No limpiamos la lista para no perder las notificaciones
          // que ya se estaban viendo.
          return throwError(() => err);
        })
      );
  }

  /** PATCH /notificaciones/{id}/leer — marca una notificación como leída. */
  marcarComoLeida(id: string): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/${id}/leer`, {})
      .pipe(
        tap(() => {
          this.notificaciones.update((list) =>
            list.map((n) => (n.id === id ? { ...n, leida: true } : n))
          );
        })
      );
  }

  /** PATCH /notificaciones/leer-todas — marca todas como leídas. */
  marcarTodasComoLeidas(): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/leer-todas`, {})
      .pipe(
        tap(() => {
          this.notificaciones.update((list) =>
            list.map((n) => ({ ...n, leida: true }))
          );
        })
      );
  }

  // ---------- helpers de mapeo (robusto al shape del backend) ----------

  private parseResponse(res: any): Notificacion[] {
    let rawItems: any[] = [];

    if (Array.isArray(res)) {
      rawItems = res;
    } else if (Array.isArray(res?.items)) {
      rawItems = res.items;
    } else if (Array.isArray(res?.data)) {
      rawItems = res.data;
    } else if (Array.isArray(res?.content)) {
      rawItems = res.content;
    } else if (Array.isArray(res?.data?.items)) {
      rawItems = res.data.items;
    } else if (res?.data) {
      rawItems = [res.data];
    }

    return rawItems.map((item) => this.mapToNotificacion(item));
  }

  private mapToNotificacion(raw: any): Notificacion {
    const tipoRaw = (raw.tipo ?? raw.type ?? 'info').toString().toLowerCase();
    const tipo: Notificacion['tipo'] =
      tipoRaw === 'success' ||
      tipoRaw === 'info' ||
      tipoRaw === 'warning' ||
      tipoRaw === 'error'
        ? tipoRaw
        : 'info';

    const fechaBruta =
      raw.fecha ?? raw.created_at ?? raw.createdAt ?? raw.creado_en ?? new Date();

    return {
      id: String(raw.id ?? raw._id ?? ''),
      mensaje:
        raw.mensaje ??
        raw.message ??
        raw.texto ??
        raw.descripcion ??
        'Sin mensaje',
      tipo,
      fecha: new Date(fechaBruta),
      leida: Boolean(raw.leida ?? raw.is_read ?? raw.read ?? raw.leido ?? false),
      codigoTraspaso:
        raw.codigoTraspaso ?? raw.codigo_traspaso ?? raw.codigo ?? undefined,
      rolDestino: raw.rolDestino ?? raw.rol_destino,
    };
  }
}
