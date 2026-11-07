import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FiltrosExportacion, ReporteInventario, ReporteVentas } from '../../core/models/reporte.model';

/** CU30/CU31 — reportes de ventas e inventario + exportación a Excel/PDF. */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reportes`;

  ventas(desde: string, hasta: string, sucursalId: number | null): Observable<ReporteVentas> {
    let params = new HttpParams().set('fecha_desde', desde).set('fecha_hasta', hasta);
    if (sucursalId != null) params = params.set('sucursal_id', sucursalId);
    return this.http.get<ReporteVentas>(`${this.base}/ventas`, { params });
  }

  inventario(sucursalId: number | null, umbral: number): Observable<ReporteInventario> {
    let params = new HttpParams().set('umbral', umbral);
    if (sucursalId != null) params = params.set('sucursal_id', sucursalId);
    return this.http.get<ReporteInventario>(`${this.base}/inventario`, { params });
  }

  /**
   * CU30 — steps 10-11/18-19: SolicitarExportacion(tipo, filtros, formato).
   * GET /reportes/exportar?tipo=&formato=&fecha_desde=&fecha_hasta=&sucursal_id=&umbral=
   *
   * Devuelve el blob (ArchivoBinario) + el nombre del archivo (Content-Disposition).
   * El interceptor de auth ya inyecta el JWT y redirige a /ingresar ante 401.
   * Errores: 403 (A1/A3), 404 (A4), 400 (A6) vienen como Blob — los parsea
   * el llamador (extraerDetail) para mostrar `detail` en el SnackBar.
   */
  exportar(filtros: FiltrosExportacion): Observable<Blob> {
    let params = new HttpParams()
      .set('tipo_reporte', filtros.tipo)
      .set('formato', filtros.formato);

    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.sucursal_id != null) params = params.set('sucursal_id', filtros.sucursal_id.toString());
    if (filtros.umbral != null) params = params.set('umbral', filtros.umbral.toString());

    // 🔥 FORZAR el responseType como 'blob' con el tipo correcto
    return this.http.get(`${this.base}/exportar`, {
      params,
      responseType: 'blob',
    }) as Observable<Blob>;
  }
}
