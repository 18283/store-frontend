export interface InventarioItem {
  id: number;
  variante_id: number;
  producto_id: number | null;
  producto: string | null;
  talla: string | null;
  color: string | null;
  color_hex: string | null;
  sku: string | null;
  sucursal_id: number;
  sucursal: string | null;
  ciudad: string | null;
  cantidad_disponible: number;
  cantidad_reservada: number;
  costo_promedio: string | null;
  estado: 'DISPONIBLE' | 'AGOTADO';
}

export interface DisponibilidadSucursal {
  sucursal_id: number;
  sucursal: string;
  ciudad: string;
  cantidad_disponible: number;
}

// CU36 — Alertas y sugerencias de reposición (inventario inteligente).
export type EstadoAlerta = 'AGOTADO' | 'STOCK_BAJO';

export interface AlertaReposicion {
  variante_id: number;
  producto_id: number | null;
  producto: string | null;
  talla: string | null;
  color: string | null;
  color_hex: string | null;
  sku: string | null;
  sucursal_id: number;
  sucursal: string | null;
  ciudad: string | null;
  cantidad_disponible: number;
  cantidad_reservada: number;
  estado: EstadoAlerta;
  rotacion_periodo: number;
  demanda_diaria_estimada: number | null;
  dias_stock_restantes: number | null;
  cantidad_a_reponer: number | null;
  sugerencia: string;
}

export interface AlertasReposicionPage {
  items: AlertaReposicion[];
  total: number;
  page: number;
  size: number;
  umbral: number;
  fecha_desde: string;
  fecha_hasta: string;
  horizonte_dias: number;
  agotados: number;
  stock_bajo: number;
  sin_datos_demanda: boolean;
}

/** CU36 — Filtros de GET /inventario/alertas. */
export interface FiltrosAlertas {
  sucursal_id?: number | null;
  umbral?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  horizonte_dias?: number;
  q?: string;
  page?: number;
  size?: number;
}

// CU14
export interface MovimientoInventario {
  id: number;
  variante_id: number;
  producto_id: number | null;
  producto: string | null;
  talla: string | null;
  color: string | null;
  sku: string | null;
  sucursal_id: number;
  sucursal: string | null;
  ciudad: string | null;
  tipo: 'INGRESO' | 'AJUSTE' | 'SALIDA_VENTA' | 'LIBERACION_RESERVA' | 'ANULACION_VENTA';
  cantidad: number;
  costo_unitario: string | null;
  nota: string | null;
  usuario_id: number;
  usuario: string | null;
  fecha: string;
}
