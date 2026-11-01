// CU31 — reportes de ventas e inventario.

export interface SucursalVentas {
  sucursal: string;
  cantidad_ventas: number;
  ingresos: string;
}

export interface ProductoVendido {
  nombre: string;
  unidades: number;
  ingresos: string;
}

export interface ReporteVentas {
  fecha_desde: string;
  fecha_hasta: string;
  sucursal: string;
  cantidad_ventas: number;
  unidades: number;
  ingresos: string;
  costo: string;
  ganancia: string;
  descuentos: string;
  ticket_promedio: string;
  lineas_sin_costo: number;
  // CU14: ventas offline cobradas y luego reembolsadas por falta de stock.
  egresos_reembolsos: string;
  cantidad_reembolsos: number;
  por_sucursal: SucursalVentas[];
  top_productos: ProductoVendido[];
}

export interface ItemInventario {
  producto: string;
  talla: string | null;
  color: string | null;
  sucursal: string;
  disponible: number;
  reservada: number;
  costo_promedio: string | null;
  valor: string | null;
  stock_bajo: boolean;
}

export interface ReporteInventario {
  sucursal: string;
  umbral: number;
  total_variantes: number;
  unidades_disponibles: number;
  unidades_reservadas: number;
  valor_inventario: string;
  variantes_stock_bajo: number;
  items: ItemInventario[];
}
