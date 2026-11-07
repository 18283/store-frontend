import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

const FECHA_SIN_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

function marcarComoUtc(valor: unknown): unknown {
  if (typeof valor === 'string') {
    return FECHA_SIN_ZONA.test(valor) ? `${valor}Z` : valor;
  }
  if (Array.isArray(valor)) {
    return valor.map(marcarComoUtc);
  }
  if (valor && typeof valor === 'object') {
    const resultado: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor)) {
      resultado[clave] = marcarComoUtc(v);
    }
    return resultado;
  }
  return valor;
}

export const fechaUtcInterceptor: HttpInterceptorFn = (req, next) => {
  // 🔥 IGNORAR las peticiones que esperan un Blob (descargas de archivos)
  if (req.responseType === 'blob') {
    return next(req);
  }

  return next(req).pipe(
    map((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse && event.body) {
        return event.clone({ body: marcarComoUtc(event.body) });
      }
      return event;
    }),
  );
};