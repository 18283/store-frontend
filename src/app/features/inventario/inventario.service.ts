import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../../core/models/usuario.model';
import {
  AlertasReposicionPage,
  FiltrosAlertas,
  InventarioItem,
  MovimientoInventario,
} from '../../core/models/inventario.model';

export interface InventarioAjusteDto {
  variante_id: number;
  sucursal_id: number;
  cantidad_disponible: number;
}

// CU14
export interface MovimientoIngresoDto {
  variante_id: number;
  sucursal_id: number;
  cantidad: number;
  costo_unitario: string;
  nota?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/inventario`;

  listar(f: {
    sucursal_id?: number | null;
    q?: string;
    page: number;
    size: number;
  }): Observable<Page<InventarioItem>> {
    let params = new HttpParams().set('page', f.page).set('size', f.size);
    if (f.sucursal_id != null) params = params.set('sucursal_id', f.sucursal_id);
    if (f.q) params = params.set('q', f.q);
    return this.http.get<Page<InventarioItem>>(this.base, { params });
  }

  ajustar(dto: InventarioAjusteDto): Observable<InventarioItem> {
    return this.http.post<InventarioItem>(`${this.base}/ajustar`, dto);
  }

  // CU14
  listarMovimientos(f: {
    sucursal_id?: number | null;
    variante_id?: number | null;
    page: number;
    size: number;
  }): Observable<Page<MovimientoInventario>> {
    let params = new HttpParams().set('page', f.page).set('size', f.size);
    if (f.sucursal_id != null) params = params.set('sucursal_id', f.sucursal_id);
    if (f.variante_id != null) params = params.set('variante_id', f.variante_id);
    return this.http.get<Page<MovimientoInventario>>(`${this.base}/movimientos`, {
      params,
    });
  }

  registrarIngreso(dto: MovimientoIngresoDto): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.base}/movimientos`, dto);
  }

  /**
   * CU36 — GET /inventario/alertas: stock bajo (disponible <= umbral) con
   * rotación del período, demanda diaria estimada, días restantes y
   * sugerencia "Reponer N unidades" (horizonte por defecto 30 días).
   * Admin: sucursal opcional (null = todas). Encargado: el backend fuerza
   * su sucursal asignada (A4 → 409 si no tiene una).
   * Errores: A3 → 404, A5 → 403, A6 → 422.
   */
  alertas(f: FiltrosAlertas): Observable<AlertasReposicionPage> {
    let params = new HttpParams()
      .set('umbral', f.umbral ?? 3)
      .set('horizonte_dias', f.horizonte_dias ?? 30)
      .set('page', f.page ?? 1)
      .set('size', f.size ?? 20);
    if (f.sucursal_id != null) params = params.set('sucursal_id', f.sucursal_id);
    if (f.fecha_desde) params = params.set('fecha_desde', f.fecha_desde);
    if (f.fecha_hasta) params = params.set('fecha_hasta', f.fecha_hasta);
    if (f.q) params = params.set('q', f.q);
    return this.http.get<AlertasReposicionPage>(`${this.base}/alertas`, { params });
  }
}
