import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
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

import { NotificacionService } from '../../core/services/notificacion.service';
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  templateUrl: './despachar-traspaso-dialog.html',
  styleUrl: './despachar-traspaso-dialog.scss',
})
export class DespacharTraspasoDialog implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly auth = inject(AuthService);
  private readonly notificacionService = inject(NotificacionService);
  private readonly snack = inject(MatSnackBar);
  protected readonly dialogRef = inject(MatDialogRef<DespacharTraspasoDialog, SolicitudTraspasoOut>);
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
      estado: (this.item.estado ?? 'APROBADA').toUpperCase() as any,
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
            estado: (this.item.estado ?? 'APROBADA').toUpperCase(),
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

    // Validación mejorada: Usa .toString() y .trim() para evitar errores de espacio o tipo
    const estadoStr = (d.estado ? d.estado.toString().trim().toUpperCase() : '');

    // Acepta APROBADA o APROBADO (con o sin tilde, mayúsculas o minúsculas)
    if (!estadoStr.includes('APROBAD')) {
      this.error.set(`La solicitud no está en estado APROBADA (estado actual: "${d.estado}"), no puede ser despachada.`);
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

    const identificador = this.item.codigo || this.item.id;

    this.service.despachar(identificador, dto).subscribe({
      next: (res: SolicitudTraspasoOut) => {
        this.procesando.set(false);
        // El backend crea la notificación del traspaso EN_TRANSITO;
        // refrescamos la campanita de inmediato en vez de esperar al polling.
        this.notificacionService.cargarNotificaciones().subscribe({ error: () => { } });
        this.snack.open(res.mensaje ?? 'Traspaso despachado correctamente.', 'OK', { duration: 4000 });
        this.dialogRef.close(res);
      },
      error: (e: any) => {
        this.procesando.set(false);

        // Si es un error de red (timeout), pero el backend pudo haber guardado:
        if (e.name === 'TimeoutError' || e.status === 0) {
          this.snack.open('El despacho está tardando. Verificando estado...', 'Cerrar', { duration: 3000 });
        } else {
          this.snack.open('No se pudo despachar el traspaso.', 'Cerrar', { duration: 5000 });
        }
        this.dialogRef.close(true); // Cerramos el diálogo y recargamos la tabla
      },
    });
  }
}