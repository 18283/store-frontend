export interface VarianteOffline {
  id: number;
  sku: string;
  talla_id: number;
  talla: string;
  color_id: number;
  color: string;
  codigo_hex: string | null;
  precio: number | null;
  imagen_url: string | null;
  cantidad_disponible: number;
  cantidad_reservada: number;
}

export interface ProductoOffline {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  categoria: string;
  precio_base: number | null;
  imagen_url: string | null;
  variantes: VarianteOffline[];
}

export interface DatosOffline {
  schema_version: number;
  version_datos: string;
  empresa_id: number;
  sucursal_id: number;
  sucursal_nombre: string;
  generado_en: string;
  productos: ProductoOffline[];
  total_productos: number;
  total_variantes: number;
}

export interface CopiaOffline extends DatosOffline {
  key: string;
  guardado_en: string;
}

export interface VarianteOfflineVista extends VarianteOffline {
  producto_id: number;
  producto_nombre: string;
  categoria: string;
  descripcion: string | null;
  imagen: string | null;
}

// --------------------------------------------------------------------------- #
//  CU11/CU12/CU13/CU14/CU15 — Cola de operaciones registradas sin conexión
// --------------------------------------------------------------------------- #
export type TipoOperacionOffline = 'RESERVA' | 'VENTA';
export type EstadoOperacionLocal = 'LOCAL' | 'ENVIANDO' | 'CONFIRMADO' | 'RECHAZADO';

export interface ItemOfflineDto {
  variante_id: number;
  cantidad: number;
}

export interface ReservaOfflinePayload {
  sucursal_id: number;
  fecha: string; // yyyy-MM-dd
  hora_inicio: string; // HH:mm:ss
  duracion_minutos: number;
  items: ItemOfflineDto[];
}

export interface VentaOfflinePayload {
  items: ItemOfflineDto[];
  direccion_entrega: string;
  referencia_entrega: string | null;
}

export interface OperacionPendiente {
  clave_idempotencia: string; // clave primaria local
  tipo: TipoOperacionOffline;
  estado: EstadoOperacionLocal;
  creado_en_dispositivo: string;
  // Resumen legible para la lista (CU13), sin tener que releer el payload.
  resumen: string;
  payload: ReservaOfflinePayload | VentaOfflinePayload;
  // Se completan cuando CU14 sincroniza (CONFIRMADO o RECHAZADO).
  motivo_rechazo?: string | null;
  reserva_id?: number | null;
  venta_id?: number | null;
}
