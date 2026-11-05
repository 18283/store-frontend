// CU24 — Solicitar traspaso de prenda.
// El contrato refleja el diagrama de robustez: opciones, búsqueda de variantes
// con stock y registro de la solicitud.

export type EstadoTraspaso = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EN_TRANSITO' | 'ENVIADO' | 'RECIBIDO' | 'CANCELADO';

export interface SucursalTraspaso {
  id: number;
  nombre: string;
  ciudad: string;
}

/** GET /traspasos/opciones (mensajes 2-9 del diagrama). */
export interface OpcionesTraspaso {
  rol: string;
  sucursales: SucursalTraspaso[];
  /**
   * Sucursal fija como destino: el EncargadoSucursal solo puede pedir que la
   * prenda llegue a su propia sucursal. `null` = el actor elige el destino.
   */
  destino_permitido_id: number | null;
}

/**
 * Fila de GET /traspasos/variantes?q= (mensajes 12-19).
 * Cada fila es una variante con stock en una sucursal de origen; la UI las
 * agrupa por variante para mostrar todos los orígenes disponibles.
 */
export interface VarianteConStock {
  variante_id: number;
  producto_id: number | null;
  producto: string;
  sku: string | null;
  talla: string | null;
  color: string | null;
  color_hex: string | null;
  origen_id: number;
  origen: string;
  ciudad: string;
  cantidad_disponible: number;
}

/** POST /traspasos (mensaje 22). */
export interface SolicitudTraspasoCrearDto {
  variante_id: number;
  origen_id: number;
  destino_id: number;
  cantidad: number;
  motivo: string | null;
  /** true solo cuando el actor confirmó que el destino ya tiene stock. */
  confirmar_stock_destino: boolean;
}

/** POST /traspasos — respuesta (mensaje 39). */
export interface SolicitudTraspasoOut {
  id: number | null;
  codigo: string;
  estado: EstadoTraspaso;
  variante_id: number | null;
  variante: string | null;
  origen_id: number | null;
  origen: string | null;
  destino_id: number | null;
  destino: string | null;
  cantidad: number | null;
  motivo: string | null;
  fecha_solicitud: string | null;
  resumen: string | null;
  /**
   * El backend pide confirmación porque el destino ya tiene stock suficiente
   * (mensaje 33 del diagrama). La UI confirma y reintenta con
   * `confirmar_stock_destino: true`.
   */
  requiere_confirmacion?: boolean;
  mensaje?: string | null;
}

/** CU25 — Fila de solicitud de traspaso para listado y aprobación/rechazo. */
export interface SolicitudTraspasoItem {
  id: number;
  codigo: string;
  fecha_solicitud: string;
  estado: EstadoTraspaso;
  variante_id: number;
  variante: string;
  sku: string | null;
  talla: string | null;
  color: string | null;
  cantidad: number;
  origen_id: number;
  origen: string;
  destino_id: number;
  destino: string;
  solicitante: string;
  motivo: string | null;
  stock_origen_disponible: number;
}

/** CU25 — Detalle completo de solicitud de traspaso (mensajes 6-8). */
export interface SolicitudTraspasoDetalle extends SolicitudTraspasoItem {
  producto: string;
  stock_disponible_en_origen: number;
  sucursal_origen_activa: boolean;
  sucursal_destino_activa: boolean;
  fecha_decision?: string | null;
  usuario_decision?: string | null;
  observacion_decision?: string | null;
}

/** CU25 — DTO para aprobar o rechazar traspaso (mensaje 10). */
export interface DecisionTraspasoDto {
  decision: 'APROBAR' | 'RECHAZAR';
  motivo?: string | null;
}

/** CU25 — Respuesta paginada de solicitudes de traspaso. */
export interface SolicitudTraspasoPage {
  items: SolicitudTraspasoItem[];
  total: number;
  page: number;
  size: number;
}
