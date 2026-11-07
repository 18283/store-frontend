import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SucursalOpcion } from '../../core/models/sucursal.model';
import { FormatoExportacion, TipoReporte } from '../../core/models/reporte.model';
import { SucursalesService } from '../sucursales/sucursales.service';
import { ReportesService } from './reportes.service';

function fechaISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * CU30 — Exportar reporte dinámico a Excel o PDF.
 *
 * Flujo (diagrama de robustez):
 * 1) SeleccionarReporte(tipo) → selector de tipoVentas/inventario
 * 8) MostrarFiltros() → filtros según tipo (fechas para ventas, umbral para inventario)
 * 9) DefinirFiltros(...) → sucursal opcional (null = multisucursal), formato xlsx/pdf
 * 10) SolicitarExportacion(tipo, filtros, formato) → ReportesService.exportar(...)
 * 19/20) DescargarArchivo + ConfirmarDescarga → descarga del blob en el navegador
 *
 * Backend valida: JWT (interceptor), rol Administrador (A1 → 403),
 * plan REPORTES_CONVENCIONALES / REPORTES_MULTISUCURSAL (A3 → 403),
 * sucursal existente (A4 → 404), formato válido (A6 → 400).
 */
@Component({
  selector: 'app-exportar-reporte-page',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
  ],
  templateUrl: './exportar-reporte-page.html',
  styleUrl: './exportar-reporte-page.scss',
})
export class ExportarReportePage {
  private readonly service = inject(ReportesService);
  private readonly sucursalesSvc = inject(SucursalesService);
  private readonly snack = inject(MatSnackBar);

  protected readonly sucursales = toSignal(this.sucursalesSvc.opciones(), {
    initialValue: [] as SucursalOpcion[],
  });

  // 1) Selector de tipo — step 1 del CU30
  protected readonly tipo = signal<TipoReporte>('ventas');

  // 9) Filtros dinámicos (step 9) — se muestran según tipo (step 8)
  private readonly hoy = new Date();
  protected readonly desde = new FormControl<Date>(
    new Date(this.hoy.getFullYear(), this.hoy.getMonth(), this.hoy.getDate() - 29),
    { nonNullable: true, validators: [Validators.required] },
  );
  protected readonly hasta = new FormControl<Date>(this.hoy, {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly umbral = new FormControl(3, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(1000)],
  });

  // 9) Formato solicitado (A6 → solo xlsx/pdf)
  protected readonly formato = signal<FormatoExportacion>('xlsx');

  protected readonly descargando = signal(false);
  protected readonly ultimoArchivo = signal<string | null>(null);

  /** Cambia de tipo y limpia el archivo anterior (8) MostrarFiltros */
  onTipoChange(tipo: TipoReporte): void {
    this.tipo.set(tipo);
    this.ultimoArchivo.set(null);
  }

  /** 10) SolicitarExportacion → 16DescargarArchivo → 20 ConfirmarDescarga */
  exportar(): void {
    const tipo = this.tipo();
    const formato = this.formato();

    // Validaciones frontend (sin formato inválido → A6)
    if (formato !== 'xlsx' && formato !== 'pdf') {
      this.snack.open('Formato no válido. Solo se admite xlsx o pdf.', 'Cerrar', { duration: 4000 });
      return;
    }

    if (tipo === 'ventas') {
      if (this.desde.invalid || this.hasta.invalid) {
        this.snack.open('Definí el rango de fechas para el reporte de ventas.', 'Cerrar', { duration: 4000 });
        return;
      }
      if (this.hasta.value < this.desde.value) {
        this.snack.open('La fecha final no puede ser anterior a la inicial.', 'Cerrar', { duration: 4000 });
        return;
      }
    } else if (this.umbral.invalid) {
      this.snack.open('El umbral de stock bajo es obligatorio (0–1000).', 'Cerrar', { duration: 4000 });
      return;
    }

    this.descargando.set(true);
    this.ultimoArchivo.set(null);

    this.service
      .exportar({
        tipo,
        formato,
        fecha_desde: tipo === 'ventas' ? fechaISO(this.desde.value) : undefined,
        fecha_hasta: tipo === 'ventas' ? fechaISO(this.hasta.value) : undefined,
        sucursal_id: this.sucursalId(),
        umbral: tipo === 'inventario' ? this.umbral.value : undefined,
      })
      .subscribe({
        next: (blob: Blob) => {
          this.descargando.set(false);
          console.log('[DEBUG] Blob recibido:', blob);
          console.log('[DEBUG] Tamaño del Blob:', blob?.size);
          console.log('[DEBUG] Tipo del Blob:', blob?.type);

          if (blob instanceof Blob && blob.size > 0) {
            const filename = `reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.${formato}`;
            this.descargarBlob(blob, filename);
            this.ultimoArchivo.set(filename);
            this.snack.open('Descarga completada.', 'Cerrar', { duration: 4000 });
          } else {
            console.error('El Blob está vacío o no es válido:', blob);
            this.snack.open('El backend no devolvió el archivo.', 'Cerrar', { duration: 4000 });
          }
        },
        error: (e: any) => {
          this.descargando.set(false);
          console.error('[DEBUG] Error en la petición:', e);
          console.error('[DEBUG] Status:', e?.status);
          console.error('[DEBUG] Mensaje:', e?.message);
          console.error('[DEBUG] Error body:', e?.error);
          this.manejarErrorExport(e);
        },
      });
  }

  private descargarBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /** Mapea errores de exportación a mensajes según flujos alternativos. */
  private async manejarErrorExport(e: unknown): Promise<void> {
    const err = e as {
      status?: number;
      error?: Blob | { detail?: unknown } | string;
    };

    let message = 'No se pudo exportar el reporte. Intentá nuevamente.';

    // El backend devuelve errores como Blob cuando responseType=blob
    const detail = await this.extraerDetail(err);
    if (detail) message = detail;

    // A1 / A3 → 403, A4 → 404, A6 → 400 (mensajes genéricos si no hay detalle)
    if (err.status === 403) {
      message = detail ?? 'No tenés permisos para exportar reportes. Se requiere el plan REPORTES_CONVENCIONALES (y REPORTES_MULTISUCURSAL si es multisucursal).';
    } else if (err.status === 404) {
      message = detail ?? 'La sucursal solicitada no existe o no pertenece a tu empresa.';
    } else if (err.status === 400) {
      message = detail ?? 'Formato de reporte no válido. Solo se admite xlsx o pdf.';
    } else if (err.status === 401) {
      message = 'Sesión vencida. Volvé a iniciar sesión.';
    }

    this.snack.open(message, 'Cerrar', { duration: 5000 });
  }

  private async extraerDetail(err: { error?: unknown }): Promise<string | null> {
    const cuerpo = (err as { error?: unknown }).error;
    if (!cuerpo) return null;

    try {
      // Blob (responseType blob) → texto JSON con {detail}
      if (cuerpo instanceof Blob) {
        const texto = await cuerpo.text();
        if (!texto) return null;
        try {
          const json = JSON.parse(texto);
          return typeof json.detail === 'string'
            ? json.detail
            : Array.isArray(json.detail)
              ? json.detail.map((d: { msg?: string }) => d.msg ?? '').join(', ')
              : null;
        } catch {
          return texto.slice(0, 200);
        }
      }
      // JSON directo
      if (typeof cuerpo === 'object') {
        const detail = (cuerpo as { detail?: unknown }).detail;
        return typeof detail === 'string' ? detail : null;
      }
      if (typeof cuerpo === 'string') return cuerpo.slice(0, 200);
    } catch {
      return null;
    }
    return null;
  }
}
