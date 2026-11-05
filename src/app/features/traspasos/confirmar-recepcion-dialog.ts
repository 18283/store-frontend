import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

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
import { TraspasosService } from './traspasos.service';

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
  private readonly snack = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<ConfirmarRecepcionDialog>);

  // Datos de la solicitud recibidos del padre mediante MAT_DIALOG_DATA
  protected readonly data = inject<{ solicitud: SolicitudTraspasoItem }>(MAT_DIALOG_DATA);

  // Formulario de confirmación
  protected readonly form: FormGroup = this.fb.group({
    cantidadRecibida: [this.data?.solicitud?.cantidad ?? '', [Validators.required, Validators.min(1)]],
    observaciones: [''],
  });

  // Estado de carga y resultados
  protected readonly cargando = signal(false);
  protected readonly recepcionExitosa = signal(false);

  ngOnInit(): void {
    const cantidadMax = this.data?.solicitud?.cantidad ?? 0;
    const cantidadCtrl = this.form.get('cantidadRecibida')!;
    if (cantidadMax > 0) {
      cantidadCtrl.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(cantidadMax),
      ]);
      cantidadCtrl.updateValueAndValidity();
      if (!cantidadCtrl.value) {
        cantidadCtrl.setValue(cantidadMax);
      }
    }
  }

  /** Confirmar la recepción: valida en el backend y cierra el diálogo. */
  onConfirmar(): void {
    if (this.form.invalid) {
      this.snack.open('Por favor, corrija los errores en el formulario.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    const dto = {
      cantidadRecibida: Number(this.form.value.cantidadRecibida),
      observaciones: this.form.value.observaciones ? String(this.form.value.observaciones) : undefined,
    };

    this.cargando.set(true);
    this.service
      .confirmarRecepcion(this.data.solicitud!.id, dto)
      .subscribe({
        next: (res) => {
          this.recepcionExitosa.set(true);
          this.snack.open(
            'Recepción confirmada correctamente. El inventario se ha actualizado y la solicitud se ha cerrado.',
            'Cerrar',
            { duration: 5000 }
          );
          this.dialogRef.close(true);
        },
        error: (e: unknown) => {
          this.cargando.set(false);
          const errorMsg =
            (e as { error?: { detail?: string } }).error?.detail ??
            'No se pudo confirmar la recepción. Por favor, intente de nuevo.';
          this.snack.open(errorMsg, 'Cerrar', { duration: 4000 });
        },
      });
  }

  onCancelar(): void {
    this.dialogRef.close();
  }
}