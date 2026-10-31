import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface TarjetaEstado {
  tiene_tarjeta_guardada: boolean;
}

/**
 * CU12/CU14 — tarjeta guardada en Stripe (Customer + PaymentMethod), para
 * poder cobrar una compra sin conexión recién al sincronizar. Sigue el mismo
 * patrón que el pago normal (CU27): redirección a una página de Stripe, sin
 * tocar datos de la tarjeta directamente.
 */
@Injectable({ providedIn: 'root' })
export class TarjetaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ventas/tarjeta`;

  estado(): Promise<TarjetaEstado> {
    return firstValueFrom(this.http.get<TarjetaEstado>(this.base));
  }

  async iniciarGuardado(): Promise<void> {
    const { checkout_url } = await firstValueFrom(
      this.http.post<{ checkout_url: string }>(`${this.base}/iniciar`, {}),
    );
    window.location.href = checkout_url;
  }

  confirmar(): Promise<TarjetaEstado> {
    return firstValueFrom(this.http.post<TarjetaEstado>(`${this.base}/confirmar`, {}));
  }

  eliminar(): Promise<TarjetaEstado> {
    return firstValueFrom(this.http.delete<TarjetaEstado>(this.base));
  }
}
