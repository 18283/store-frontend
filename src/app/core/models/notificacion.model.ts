export interface Notificacion {
  id: string;
  mensaje: string;
  tipo: 'success' | 'info' | 'warning' | 'error';
  fecha: Date;
  leida: boolean;
  modulo?: string;
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

/** CU35 — roles destino que acepta POST /notificaciones/masiva (backend). */
export type RolDestino = 'CLIENTE' | 'ENCARGADO' | 'CAJERO';

export const ROLES_DESTINO: ReadonlyArray<{ value: RolDestino; label: string }> =
  [
    { value: 'CLIENTE', label: 'Cliente' },
    { value: 'ENCARGADO', label: 'Encargado de sucursal' },
    { value: 'CAJERO', label: 'Cajero' },
  ];

export interface EnviarMasivaDto {
  mensaje: string;
  tipo: 'info' | 'warning' | 'success';
  roles_destino: RolDestino[];
}

export interface EnviarMasivaResultado {
  enviados: number;
}

