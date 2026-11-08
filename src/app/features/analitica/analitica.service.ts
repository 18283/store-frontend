import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Agrupaciones,
  DashboardAnalitico,
  ModeloAnalitico,
  PrediccionDemanda,
  TipoModeloAnalitico,
} from '../../core/models/analitica.model';

/** CU31/CU32/CU33/CU34 — Analítica inteligente (scikit-learn). */
@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/analitica`;

  /** CU31 — dashboard analítico (ventas del mes, stock crítico y un resumen de CU32/CU33). */
  dashboard(): Observable<DashboardAnalitico> {
    return this.http.get<DashboardAnalitico>(`${this.base}/dashboard`);
  }

  /** CU32 — predicción de demanda por producto (regresión lineal). */
  prediccionDemanda(semanas = 12): Observable<PrediccionDemanda> {
    const params = new HttpParams().set('semanas', semanas);
    return this.http.get<PrediccionDemanda>(`${this.base}/prediccion-demanda`, { params });
  }

  /** CU33 — agrupaciones y patrones de productos (K-Means). */
  agrupaciones(dias = 60): Observable<Agrupaciones> {
    const params = new HttpParams().set('dias', dias);
    return this.http.get<Agrupaciones>(`${this.base}/agrupaciones`, { params });
  }

  /** CU34 — entrena y evalúa uno de los dos modelos (Superadministrador). */
  entrenarModelo(tipo: TipoModeloAnalitico): Observable<ModeloAnalitico> {
    return this.http.post<ModeloAnalitico>(`${this.base}/modelos/entrenar`, { tipo });
  }

  /** CU34 — historial de entrenamientos (Superadministrador). */
  listarModelos(): Observable<ModeloAnalitico[]> {
    return this.http.get<ModeloAnalitico[]>(`${this.base}/modelos`);
  }
}
