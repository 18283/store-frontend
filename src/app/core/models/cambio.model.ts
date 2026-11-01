// CU17-CU23 — cambios y devoluciones.

export type TipoSolicitud = 'CAMBIO' | 'DEVOLUCION';
export type EstadoSolicitud = 'SOLICITADO' | 'RECIBIDO' | 'RESUELTO' | 'CANCELADO';
export type FormaPagoDiferencia = 'EFECTIVO' | 'STRIPE';

export interface SolicitudCambioCrearDto {
  venta_id: number;
  venta_detalle_id: number;
  tipo: TipoSolicitud;
  variante_nueva_id?: number | null;
  cantidad: number;
}

export interface Solicitud {
  id: number;
  venta_id: number;
  venta_detalle_id: number;
  cliente_id: number;
  cliente: string | null;
  sucursal_id: number;
  sucursal: string | null;
  tipo: TipoSolicitud;
  motivo: string;
  producto: string | null;
  variante_devuelta_id: number;
  variante_devuelta: string | null;
  cantidad: number;
  variante_nueva_id: number | null;
  variante_nueva: string | null;
  estado: EstadoSolicitud;
  fecha_solicitud: string;
  fecha_limite: string;
  fecha_recepcion: string | null;
  fecha_resolucion: string | null;
  diferencia: string | null;
  forma_pago_diferencia: string | null;
}

export interface SolicitudPage {
  items: Solicitud[];
  total: number;
  page: number;
  size: number;
}

export interface ResolverSolicitudDto {
  accion: TipoSolicitud;
  forma_pago?: FormaPagoDiferencia | null;
  monto_recibido?: number | null;
}

export interface CobroPendiente {
  pago_id: number;
  monto: string;
  checkout_url: string;
  qr_data_url: string | null;
}

export interface ResolverSolicitudOut {
  solicitud: Solicitud;
  cobro_pendiente: CobroPendiente | null;
}

export interface NotaCambio {
  solicitud_id: number;
  tipo: TipoSolicitud;
  venta_id: number;
  cliente_nombre: string;
  sucursal: string;
  producto: string;
  variante_devuelta: string;
  variante_nueva: string | null;
  cantidad: number;
  fecha_recepcion: string | null;
  responsable_recepcion: string | null;
  fecha_resolucion: string | null;
  responsable_resolucion: string | null;
  diferencia: string | null;
  forma_pago_diferencia: string | null;
  estado: EstadoSolicitud;
}
