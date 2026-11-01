import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  NotaCambio,
  ResolverSolicitudDto,
  ResolverSolicitudOut,
  Solicitud,
  SolicitudCambioCrearDto,
  SolicitudPage,
} from '../../core/models/cambio.model';

@Injectable({ providedIn: 'root' })
export class CambiosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cambios`;

  // CU18
  solicitar(dto: SolicitudCambioCrearDto) {
    return this.http.post<Solicitud>(this.base, dto);
  }

  // CU23 (cliente)
  misSolicitudes() {
    return this.http.get<Solicitud[]>(`${this.base}/mias`);
  }

  // CU23 (sucursal)
  listarSucursal(estado?: string | null, page = 1, size = 50) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) params = params.set('estado', estado);
    return this.http.get<SolicitudPage>(`${this.base}/sucursal`, { params });
  }

  // CU21
  recepcionar(id: number) {
    return this.http.post<Solicitud>(`${this.base}/${id}/recepcionar`, {});
  }

  // CU19/CU20
  resolver(id: number, dto: ResolverSolicitudDto) {
    return this.http.post<ResolverSolicitudOut>(`${this.base}/${id}/resolver`, dto);
  }

  confirmarCobro(id: number) {
    return this.http.post<Solicitud>(`${this.base}/${id}/confirmar-cobro`, {});
  }

  // CU22
  nota(id: number) {
    return this.http.get<NotaCambio>(`${this.base}/${id}/nota`);
  }
}
