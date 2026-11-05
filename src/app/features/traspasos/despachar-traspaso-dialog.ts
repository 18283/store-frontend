import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { AuthService } from '../../core/auth/auth.service';
import {
  SolicitudTraspasoDetalle,
  SolicitudTraspasoItem,
  SolicitudTraspasoOut,
} from '../../core/models/traspaso.model';
import { TraspasosService } from './traspasos.service';

/** CU26 — Diálogo para despachar un traspaso aprobado (mensajes 10-21 del diagrama). */
@Component({
  selector: 'app-despachar-traspaso-dialog',
  imports: [
    DatePipe,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './despachar-traspaso-dialog.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  styles: `
    .cargando { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; color: #64748b; }
    .detalle-despacho { max-height: 700px; overflow-y: auto; }
    .info-solicitud { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .tarjeta-estado { margin-bottom: 1rem; }
    .label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; display: block; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; width: fit-content; }
    .badge.aprobado { background: #dcfce7; color: #166534; }
    .badge.en-transito { background: #fcd34d; color: #92400e; }

    .fila-detalle { display: flex; justify-content: space-between; margin: 0.25rem 0; }
    .fila-detalle .label { color: #64748b; font-size: 0.85rem; width: 40%; }
    .fila-detalle .val { color: #1e293b; font-size: 0.85rem; }

    .tarjeta-stock { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .tarjeta-origen-destino { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .tarjeta-origen-destino .error .val { color: #dc2626; }

    .form-datos-envio { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .form-datos-envio h3 { margin: 0 0 1rem; color: #1e293b; font-size: 0.95rem; }
    .form-datos-envio mat-form-field { margin-bottom: 0.75rem; width: 100%; display: block; }
    .form-datos-envio .textarea textarea { min-height: 60px; }
  `,
})
export class DespacharTraspasoDialog implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  protected readonly ref = inject(MatDialogRef<DespacharTraspasoDialog, SolicitudTraspasoOut>);
  protected readonly item = inject<SolicitudTraspasoItem>(MAT_DIALOG_DATA);

  protected readonly cargandoDetalle = signal(true);
  protected readonly detalle = signal<SolicitudTraspasoDetalle | null>(null);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Separación de fecha y hora
  protected readonly datosEnvio = {
    transportista: '',
    numero_guia: '',
    fecha: new Date(),
    hora: new Date().toTimeString().substring(0, 5),
    observaciones: '',
  };

  ngOnInit(): void {
    this.error.set(null);
    if (!this.item || this.item.id == null || isNaN(Number(this.item.id))) {
      this.error.set('No se especificó un identificador de traspaso válido.');
      this.cargandoDetalle.set(false);
      return;
    }
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    const idOrCodigo = this.item?.codigo || this.item?.id;
    if (!idOrCodigo) {
      this.cargandoDetalle.set(false);
      this.error.set('Identificador de traspaso inválido.');
      return;
    }

    this.cargandoDetalle.set(true);
    this.detalle.set({
      ...this.item,
      id: Number(this.item.id ?? 0),
      producto: this.item.variante,
      stock_disponible_en_origen: (this.item as any).stock_disponible_en_origen ?? (this.item as any).stock_origen_disponible ?? 0,
      sucursal_origen_activa: true,
      sucursal_destino_activa: true,
      estado: (this.item.estado ?? 'APROBADO').toUpperCase() as any,
    });
    this.cargandoDetalle.set(false);

    // Si el backend requiere código o ID, probamos buscando por el identificador disponible
    this.service.detalle(idOrCodigo as any).subscribe({
      next: (res: any) => {
        if (res) {
          this.detalle.set({
            ...res,
            id: Number(res.id ?? this.item.id),
            sucursal_origen_activa: res.sucursal_origen_activa ?? res.origen_activo ?? true,
            sucursal_destino_activa: res.sucursal_destino_activa ?? res.destino_activo ?? true,
            stock_disponible_en_origen: res.stock_disponible_en_origen ?? res.stock_origen_disponible ?? this.item.stock_origen_disponible ?? 0,
            estado: (res.estado ?? this.item.estado ?? 'APROBADO').toUpperCase(),
          });
        }
      },
      error: () => {
        // Fallback to item data
      },
    });
  }

  despachar(): void {
    if (this.procesando()) return;
    const d = this.detalle();
    if (!d) return;

    // ---- Debug: Mostrar el valor real de la estado en la consola del backend ----
    console.log('[DEBUG DESPACHO] Valor de d.estado:', d.estado);
    // ------------------------------------------------------------

    // Validación mejorada: Usa .toString() y .trim() para evitar errores de espacio o tipo
    const estadoStr = (d.estado ? d.estado.toString().trim() : '').toUpperCase();

    if (estadoStr !== 'APROBADO' && estadoStr !== 'APROBADA') {
      this.error.set('La solicitud no está en estado APROBADO, no puede ser despachada.');
      this.snack.open(this.error()!, 'Cerrar', { duration: 5000 });
      return;
    }

    if (!d.sucursal_destino_activa) {
      this.error.set('La sucursal de destino no está activa, no puede despacharse.');
      this.snack.open(this.error()!, 'Cerrar', { duration: 5000 });
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    const form = this.datosEnvio;
    let fechaHoraIso: string | undefined = undefined;

    if (form.fecha) {
      const f = new Date(form.fecha);
      if (!isNaN(f.getTime())) {
        const [horas, minutos] = (form.hora || '00:00').split(':');
        f.setHours(Number(horas) || 0, Number(minutos) || 0, 0, 0);
        fechaHoraIso = f.toISOString();
      }
    }

    const dto = {
      transportista: form.transportista?.trim() || undefined,
      numero_guia: form.numero_guia?.trim() || undefined,
      fecha_hora: fechaHoraIso,
      observaciones: form.observaciones?.trim() || undefined,
      usuarioId: this.auth.user()?.id ?? 1,
      sucursalOrigenId: d.origen_id,
    };

    const identificador = d.codigo || d.id;

    this.service.despachar(identificador, dto).subscribe({
      next: (res: SolicitudTraspasoOut) => {
        this.procesando.set(false);
        this.snack.open(
          res.mensaje ?? 'Traspaso despachado correctamente.',
          'OK',
          { duration: 4000 },
        );
        this.ref.close(res);
      },
      error: (e: unknown) => {
        this.procesando.set(false);
        const errDetail =
          (e as { error?: { detail?: string } }).error?.detail ??
          'No se pudo despachar el traspaso.';
        this.error.set(errDetail);
        this.snack.open(errDetail, 'Cerrar', { duration: 5000 });
      },
    });
  }
}