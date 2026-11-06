import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  DecisionTraspasoDto,
  OpcionesTraspaso,
  SolicitudTraspasoCrearDto,
  SolicitudTraspasoDetalle,
  SolicitudTraspasoOut,
  SolicitudTraspasoPage,
  VarianteConStock,
  SolicitudTraspasoItem,
} from '../../core/models/traspaso.model';
import { ROL } from '../../core/models/usuario.model';

type VariantesConStockOut = VarianteConStock[] | { items: VarianteConStock[] };

/** CU24 — traspasos de prendas entre sucursales. */
@Injectable({ providedIn: 'root' })
export class TraspasosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/traspasos`;

  /** Mensajes 2-9: rol del actor, sucursales activas y destino permitido. */
  opciones(): Observable<OpcionesTraspaso> {
    return this.http.get<OpcionesTraspaso>(`${this.base}/opciones`);
  }

  /** Mensajes 12-19: variantes activas con stock, agrupables por origen. */
  buscarVariantes(q: string): Observable<VariantesConStockOut> {
    const params = new HttpParams().set('q', q);
    return this.http
      .get<VariantesConStockOut>(`${this.base}/variantes`, { params })
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return res;
          return res.items;
        }),
      );
  }

  /** Mensajes 22-39: registra la solicitud en estado PENDIENTE. */
  solicitar(dto: SolicitudTraspasoCrearDto): Observable<SolicitudTraspasoOut> {
    return this.http.post<SolicitudTraspasoOut>(this.base, dto);
  }

  /** CU25 — Mensajes 1-4: Listar solicitudes de traspaso con filtros y paginación. */
  listar(estado?: string | null, page = 1, size = 10): Observable<SolicitudTraspasoPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) params = params.set('estado', estado);
    return this.http.get<SolicitudTraspasoPage>(this.base, { params });
  }

  /** CU25 — Mensajes 5-8: Obtener detalle completo de una solicitud de traspaso. */
  detalle(idOrCodigo: number | string): Observable<SolicitudTraspasoDetalle> {
    return this.http.get<SolicitudTraspasoDetalle>(`${this.base}/${idOrCodigo}`);
  }

  /** CU25 — Mensajes 9-20: Procesar decisión de traspaso (aprobar o rechazar). */
  decidir(id: number, dto: DecisionTraspasoDto): Observable<SolicitudTraspasoOut> {
    return this.http.patch<SolicitudTraspasoOut>(`${this.base}/${id}/decidir`, dto);
  }

  /** CU26 — Mensajes 10-21: Despachar un traspaso aprobado (registrar salida en tránsito). */
  despachar(idOrCodigo: number | string, datosEnvio: { transportista?: string; numero_guia?: string; fecha_hora?: string; observaciones?: string; usuarioId: number; sucursalOrigenId: number }): Observable<SolicitudTraspasoOut> {
    return this.http.patch<SolicitudTraspasoOut>(`${this.base}/${idOrCodigo}/despachar`, datosEnvio);
  }

  /** CU27 — Mensajes 1-12: Confirmar recepción de traspaso. */
  confirmarRecepcion(id: number, dto: { cantidadRecibida: number; observaciones?: string }): Observable<SolicitudTraspasoOut> {
    return this.http.patch<SolicitudTraspasoOut>(`${this.base}/${id}/confirmar-recepcion`, dto);
  }

  /** CU28 — Consultar seguimiento de traspaso. */
  buscarSolicitud(codigo_o_id: string, rol: string, empresa_id?: number): Observable<SolicitudTraspasoItem> {
    const params = new HttpParams().set('q', codigo_o_id);
    const url = `${this.base}/buscar`;
    return this.http.get<SolicitudTraspasoItem>(url, { params });
  }

  /** CU28 — Consultar seguimiento de traspaso por código. */
  consultarSeguimiento(codigo: string): Observable<SolicitudTraspasoItem> {
    return this.http.get<SolicitudTraspasoItem>(`${this.base}/${codigo}`);
  }

  /** CU29 — Notificar estado del traspaso.
   *  Mensajes del diagrama de robustez:
   *  5. ObtenerSolicitudYEstado(solicitudId)
   *  6. SELECT * FROM solicitud_traspaso WHERE id = solicitudId
   *  Notifica al cliente/personal el cambio de estado mediante push.
   */
  notificarEstado(solicitudId: number): Observable<SolicitudTraspasoDetalle> {
    return this.http.get<SolicitudTraspasoDetalle>(`${this.base}/${solicitudId}/notificar-estado`);
  }
}