export interface Notificacion {
  id: string;
  mensaje: string;
  tipo: 'success' | 'info' | 'warning' | 'error';
  fecha: Date;
  leida: boolean;
  codigoTraspaso?: string;
  rolDestino?: 'CLIENTE' | 'ENCARGADO' | 'ADMIN';
}

/** Forma paginada que devuelve GET /notificaciones (compat. con API). */
export interface NotificacionPage {
  items: Notificacion[];
  total: number;
  page: number;
  size: number;
}
