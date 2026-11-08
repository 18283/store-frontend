import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ReembolsoEfectivo, ReembolsoEfectivoPage } from '../models/offline.model';

/**
 * CU16 — devoluciones de efectivo pendientes (venta offline en efectivo del
 * Cajero que se rechazó al sincronizar por conflicto de stock): listarlas y
 * confirmarlas una vez que el cliente devuelve la prenda y recibe el dinero.
 */
@Injectable({ providedIn: 'root' })
export class ReembolsoEfectivoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/offline/reembolsos-efectivo`;

  listarPendientes(): Observable<ReembolsoEfectivoPage> {
    return this.http.get<ReembolsoEfectivoPage>(this.base);
  }

  confirmar(id: number, nota: string | null): Observable<ReembolsoEfectivo> {
    return this.http.post<ReembolsoEfectivo>(`${this.base}/${id}/confirmar`, { nota });
  }
}
