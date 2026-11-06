import { Injectable, signal } from '@angular/core';

type TipoNotificacion = 'success' | 'info' | 'warning' | 'error';

export interface Notificacion {
  id: string;
  mensaje: string;
  tipo: TipoNotificacion;
  codigoTraspaso?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  // Signal con la notificación actual que se está mostrando
  readonly notificacionActual = signal<Notificacion | null>(null);

  /**
   * Muestra una notificación flotante.
   * Agrega la notificación al signal actual para que el Toast sea visible.
   * @param mensaje - Texto de la notificación
   * @param tipo - Tipo: 'success', 'info', 'warning', 'error'
   * @param codigoTraspaso - Código opcional del traspaso (ej: TRP-1234)
   * @returns ID de la notificación generada
   */
  mostrar(mensaje: string, tipo: TipoNotificacion, codigoTraspaso?: string): string {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substr(2, 9);
    const notificacion: Notificacion = {
      id,
      mensaje,
      tipo,
      codigoTraspaso,
    };

    this.notificacionActual.set(notificacion);

    // Auto-ocultar después de 5 segundos reseteando el signal
    setTimeout(() => {
      this.notificacionActual.set(null);
    }, 5000);

    return id;
  }

  /** Oculta manualmente la notificación actual */
  ocultar(): void {
    this.notificacionActual.set(null);
  }

  /** Marca como leída (preparado para futuras expansiones CU35) */
  marcarComoLeida(): void {
    // Por ahora es un placeholder para la estructura
  }
}