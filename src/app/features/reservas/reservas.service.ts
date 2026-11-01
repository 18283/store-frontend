import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FinalizarReservaResultado,
  Reserva,
  ReservaSucursal,
  SlotsDisponibilidad,
} from '../../core/models/reserva.model';
import { Page } from '../../core/models/usuario.model';

export interface ReservaItemDto {
  variante_id: number;
  cantidad: number;
}

export interface ReservaCreateDto {
  sucursal_id: number;
  fecha: string; // "YYYY-MM-DD"
  hora_inicio: string; // "HH:MM"
  duracion_minutos: number;
  items: ReservaItemDto[];
}

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reservas`;

  disponibilidad(
    sucursalId: number,
    fecha: string,
    duracionMinutos: number,
  ): Observable<SlotsDisponibilidad> {
    const params = new HttpParams()
      .set('sucursal_id', sucursalId)
      .set('fecha', fecha)
      .set('duracion_minutos', duracionMinutos);
    return this.http.get<SlotsDisponibilidad>(`${this.base}/disponibilidad`, {
      params,
    });
  }

  crear(dto: ReservaCreateDto): Observable<Reserva> {
    return this.http.post<Reserva>(this.base, dto);
  }

  mias(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.base}/mias`);
  }

  cancelar(id: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.base}/${id}/cancelar`, {});
  }

  // CU18/CU19 — vista de la sucursal
  listarSucursal(f: {
    sucursal_id?: number | null;
    estado?: string | null;
    page: number;
    size: number;
  }): Observable<Page<ReservaSucursal>> {
    let params = new HttpParams().set('page', f.page).set('size', f.size);
    if (f.sucursal_id != null) params = params.set('sucursal_id', f.sucursal_id);
    if (f.estado) params = params.set('estado', f.estado);
    return this.http.get<Page<ReservaSucursal>>(`${this.base}/sucursal`, {
      params,
    });
  }

  notificar(id: number): Observable<ReservaSucursal> {
    return this.http.post<ReservaSucursal>(`${this.base}/${id}/notificar`, {});
  }

  recepcionar(id: number): Observable<ReservaSucursal> {
    return this.http.post<ReservaSucursal>(`${this.base}/${id}/recepcionar`, {});
  }

  finalizar(
    id: number,
    items: { detalle_id: number; cantidad_llevada: number; variante_sustituta_id?: number | null }[],
  ): Observable<FinalizarReservaResultado> {
    return this.http.post<FinalizarReservaResultado>(`${this.base}/${id}/finalizar`, { items });
  }
}
