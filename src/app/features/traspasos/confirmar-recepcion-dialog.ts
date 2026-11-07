import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { timeout } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { SolicitudTraspasoItem } from '../../core/models/traspaso.model';
import { NotificacionService } from '../../core/services/notificacion.service';
import { TraspasosService } from '../../features/traspasos/traspasos.service';

@Component({
  selector: 'app-confirmar-recepcion-dialog',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './confirmar-recepcion-dialog.html',
  styleUrl: './confirmar-recepcion-dialog.scss',
})
export class ConfirmarRecepcionDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TraspasosService);
  private readonly notificacionService = inject(NotificacionService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<ConfirmarRecepcionDialog>);
  protected readonly solicitud = inject<SolicitudTraspasoItem>(MAT_DIALOG_DATA);
  protected readonly cargando = signal(false);
  protected readonly form: FormGroup = this.fb.group({
    cantidadRecibida: [, [Validators.required, Validators.min(1)]],
    observaciones: [''],
  });

  ngOnInit(): void {
    if (this.solicitud?.cantidad) {
      this.form.get('cantidadRecibida')?.setValue(this.solicitud.cantidad);
    }
  }

  onConfirmar(): void {
    if (this.form.invalid) {
      this.snack.open('Por favor, corrija los errores en el formulario.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.cargando.set(true);

    // Añadimos un timeout de 15 segundos para darle tiempo al backend
    this.service.confirmarRecepcion(this.solicitud!.id, this.form.value)
      .pipe(timeout(15000))
      .subscribe({
        next: (res) => {
          this.cargando.set(false);
          // El backend crea la notificación del traspaso RECIBIDO;
          // refrescamos la campanita de inmediato en vez de esperar al polling.
          this.notificacionService.cargarNotificaciones().subscribe({ error: () => {} });
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.cargando.set(false);

          // Si es un error de red (timeout o CORS), pero sabemos que el backend pudo haber guardado:
          if (e.name === 'TimeoutError' || e.status === 0) {
            this.snack.open('La operación está tardando. Verificando estado...', 'Cerrar', { duration: 3000 });
            this.dialogRef.close(true); // Cerramos y recargamos la tabla para ver si se guardó
            return;
          }

          // Si el backend dice que ya está recibido, lo tratamos como éxito
          const errorMsg = (e.error as { detail?: string })?.detail || 'No se pudo confirmar la recepción';
          if (errorMsg.includes('RECIBIDO') || errorMsg.includes('confirmada')) {
            this.snack.open('El traspaso ya había sido recibido exitosamente.', 'OK', { duration: 5000 });
            this.dialogRef.close(true);
            return;
          }

          // Si es otro error real
          this.snack.open(errorMsg, 'Cerrar', { duration: 5000 });
        },
      });
  }

  onCancelar(): void {
    this.dialogRef.close();
  }
}