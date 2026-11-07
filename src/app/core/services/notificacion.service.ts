import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  EnviarMasivaDto,
  EnviarMasivaResultado,
  Notificacion,
} from '../models/notificacion.model';

/**
 * Notificaciones reales desde el backend (CU29 + CU35).
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

  /** Total reportado por el backend (con pagination). Defaults a la lista. */
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly size = signal<number>(20);

  /** Notificaciones no leídas para el badge de la campanita. */
  readonly notificacionesNoLeidas = computed(() =>
    this.notificaciones().filter((n) => !n.leida)
  );

  readonly cargando = signal<boolean>(false);

  /**
   * GET /notificaciones?page=1&size=20&leidas= (CU35, pasos 3-5).
   * `leidas` es opcional: undefined = todas, true = solo leídas,
   * false = solo no leídas. El backend ya devuelve orden fecha DESC
   * (más recientes primero) junto con el total.
   */
  cargarNotificaciones(
    page = 1,
    size = 20,
    leidas?: boolean
  ): Observable<{ items: Notificacion[]; total: number }> {
    this.cargando.set(true);
    let params = new HttpParams().set('page', page).set('size', size);
    if (leidas !== undefined) {
      params = params.set('leidas', String(leidas));
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => this.parseResponse(res)),
      tap(({ items, total }) => {
        this.notificaciones.set(items);
        this.total.set(total);
        this.page.set(page);
        this.size.set(size);
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

  /**
   * POST /notificaciones/masiva (CU35, paso 9) — solo Administrador.
   * Devuelve { enviados: N } con los destinatarios reales (paso 12/A7).
   */
  enviarMasiva(dto: EnviarMasivaDto): Observable<EnviarMasivaResultado> {
    return this.http
      .post<any>(`${this.baseUrl}/masiva`, dto)
      .pipe(
        map((res) => ({
          enviados: Number(res?.enviados ?? res?.enviadas ?? 0),
        }))
      );
  }

  // ---------- helpers de mapeo (robusto al shape del backend) ----------

  private parseResponse(res: any): { items: Notificacion[]; total: number } {
    let rawItems: any[] = [];
    let total: number | null = null;

    if (Array.isArray(res)) {
      rawItems = res;
    } else if (Array.isArray(res?.items)) {
      rawItems = res.items;
      total = Number(res.total ?? res.count ?? rawItems.length);
    } else if (Array.isArray(res?.data)) {
      rawItems = res.data;
      total = Number(res.total ?? res.count ?? rawItems.length);
    } else if (Array.isArray(res?.content)) {
      rawItems = res.content;
      total = Number(res.total ?? res.count ?? rawItems.length);
    } else if (Array.isArray(res?.data?.items)) {
      rawItems = res.data.items;
      total = Number(res.data.total ?? res.data.count ?? rawItems.length);
    } else if (res?.data) {
      rawItems = [res.data];
    }

    const items = rawItems.map((item) => this.mapToNotificacion(item));
    return { items, total: total ?? items.length };
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
      modulo: raw.modulo ?? raw.module ?? undefined,
      codigoTraspaso:
        raw.codigoTraspaso ?? raw.codigo_traspaso ?? raw.codigo ?? undefined,
      rolDestino: raw.rolDestino ?? raw.rol_destino,
    };
  }
}
