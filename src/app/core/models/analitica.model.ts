// CU31/CU32/CU33/CU34 — Analítica inteligente (scikit-learn).

export type TendenciaDemanda = 'creciendo' | 'estable' | 'bajando';
export type MetodoPrediccion = 'regresion_lineal' | 'promedio_simple';
export type TipoModeloAnalitico = 'DEMANDA' | 'AGRUPACION';

export interface PrediccionProducto {
  producto_id: number;
  producto_nombre: string;
  semanas_con_datos: number;
  promedio_semanal: number;
  prediccion_proxima_semana: number;
  tendencia: TendenciaDemanda;
  confianza: number;
  metodo: MetodoPrediccion;
}

/** CU32 — Generar predicción de demanda. */
export interface PrediccionDemanda {
  generado_en: string;
  semanas_analizadas: number;
  metodo_modelo: string;
  items: PrediccionProducto[];
}

export interface ProductoAgrupado {
  producto_id: number;
  producto_nombre: string;
  unidades_vendidas: number;
  ingresos: string;
  rotacion: number;
}

export interface GrupoProducto {
  grupo: number;
  etiqueta: string;
  cantidad_productos: number;
  promedio_unidades: number;
  promedio_ingresos: string;
  promedio_rotacion: number;
  productos: ProductoAgrupado[];
}

/** CU33 — Analizar agrupaciones y patrones de productos. */
export interface Agrupaciones {
  generado_en: string;
  dias_analizados: number;
  k: number;
  metodo_modelo: string;
  grupos: GrupoProducto[];
}

export interface PuntoSemana {
  semana: string;
  ingresos: string;
  unidades: number;
}

export interface TopProducto {
  nombre: string;
  unidades: number;
  ingresos: string;
}

export interface ResumenGrupo {
  etiqueta: string;
  cantidad_productos: number;
}

/** CU31 — Consultar dashboard analítico. */
export interface DashboardAnalitico {
  generado_en: string;
  ingresos_mes: string;
  unidades_mes: number;
  cantidad_ventas_mes: number;
  ticket_promedio: string;
  variantes_stock_critico: number;
  serie_semanal: PuntoSemana[];
  top_productos: TopProducto[];
  prediccion_destacada: PrediccionProducto[];
  resumen_agrupacion: ResumenGrupo[];
}

/** CU34 — Entrenar, evaluar y actualizar modelos analíticos. */
export interface ModeloAnalitico {
  id: number;
  tipo: TipoModeloAnalitico;
  version: number;
  parametros: Record<string, unknown>;
  metricas: Record<string, unknown>;
  muestras_entrenamiento: number;
  activo: boolean;
  entrenado_por: string;
  entrenado_en: string;
}
