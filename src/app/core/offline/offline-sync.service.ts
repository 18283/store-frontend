import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  OperacionPendiente,
  ReservaOfflinePayload,
  VentaOfflinePayload,
} from '../models/offline.model';
import { OfflineStorageService } from './offline-storage.service';

interface ResultadoSincronizacionDto {
  clave_idempotencia: string;
  tipo: 'RESERVA' | 'VENTA';
  estado: 'CONFIRMADO' | 'RECHAZADO';
  motivo_rechazo: string | null;
  reserva_id: number | null;
  venta_id: number | null;
}

function uuid(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * CU11/CU12 — guardan la reserva/venta en la cola local (no tocan el
 * servidor). CU13 lee esa cola. CU14 la sincroniza apenas vuelve la conexión:
 * cada operación se manda con su clave de idempotencia, así un reintento (o
 * que el usuario toque "sincronizar" dos veces) nunca la duplica. CU15 es el
 * resultado que queda guardado en cada operación tras sincronizar.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(OfflineStorageService);
  private sincronizando = false;

  readonly operaciones = signal<OperacionPendiente[]>([]);
  readonly pendientes = signal(0);

  async cargar(): Promise<void> {
    const todas = await this.storage.listarOperaciones();
    this.operaciones.set(todas);
    this.pendientes.set(todas.filter((o) => o.estado === 'LOCAL').length);
  }

  async registrarReserva(payload: ReservaOfflinePayload, resumen: string): Promise<void> {
    await this.encolar('RESERVA', payload, resumen);
  }

  async registrarVenta(payload: VentaOfflinePayload, resumen: string): Promise<void> {
    await this.encolar('VENTA', payload, resumen);
  }

  private async encolar(
    tipo: 'RESERVA' | 'VENTA',
    payload: ReservaOfflinePayload | VentaOfflinePayload,
    resumen: string,
  ): Promise<void> {
    const op: OperacionPendiente = {
      clave_idempotencia: uuid(),
      tipo,
      estado: 'LOCAL',
      creado_en_dispositivo: new Date().toISOString(),
      resumen,
      payload,
    };
    await this.storage.agregarOperacion(op);
    await this.cargar();
  }

  async sincronizar(): Promise<{ confirmadas: number; rechazadas: number }> {
    if (this.sincronizando || !navigator.onLine) {
      return { confirmadas: 0, rechazadas: 0 };
    }
    this.sincronizando = true;
    let confirmadas = 0;
    let rechazadas = 0;
    try {
      const pendientes = (await this.storage.listarOperaciones()).filter(
        (op) => op.estado === 'LOCAL',
      );
      for (const op of pendientes) {
        op.estado = 'ENVIANDO';
        await this.storage.actualizarOperacion(op);

        const ruta = op.tipo === 'RESERVA' ? 'reservas' : 'ventas';
        const cuerpo = {
          clave_idempotencia: op.clave_idempotencia,
          creado_en_dispositivo: op.creado_en_dispositivo,
          ...op.payload,
        };
        try {
          const resultado = await firstValueFrom(
            this.http.post<ResultadoSincronizacionDto>(
              `${environment.apiUrl}/offline/sincronizar/${ruta}`,
              cuerpo,
            ),
          );
          op.estado = resultado.estado;
          op.motivo_rechazo = resultado.motivo_rechazo;
          op.reserva_id = resultado.reserva_id;
          op.venta_id = resultado.venta_id;
          if (resultado.estado === 'CONFIRMADO') confirmadas++;
          else rechazadas++;
        } catch {
          // Se cortó la conexión a mitad de camino: vuelve a LOCAL y se
          // reintenta en la próxima sincronización. No se pierde.
          op.estado = 'LOCAL';
        }
        await this.storage.actualizarOperacion(op);
      }
    } finally {
      this.sincronizando = false;
      await this.cargar();
    }
    return { confirmadas, rechazadas };
  }
}
