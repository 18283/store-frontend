import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ReembolsoEfectivo } from '../../core/models/offline.model';

/** CU16 — confirmación del Cajero de que ya devolvió el efectivo al cliente
 * que trajo de vuelta la prenda, con una nota opcional. */
@Component({
  selector: 'app-confirmar-reembolso-dialog',
  imports: [DecimalPipe, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Confirmar devolución</h2>
    <mat-dialog-content>
      <p class="resumen">
        ¿Ya recibiste la prenda de vuelta de <strong>{{ reembolso.cliente_nombre }}</strong> y le
        entregaste <strong>Bs {{ +reembolso.monto | number: '1.2-2' }}</strong> en efectivo?
      </p>
      <mat-form-field appearance="outline" class="campo">
        <mat-label>Nota (opcional)</mat-label>
        <textarea matInput rows="2" [(ngModel)]="nota"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancelar</button>
      <button mat-flat-button class="btn-primario" (click)="ref.close(nota.trim() || null)">
        Confirmar devolución
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen { color: #334155; margin: 0 0 1rem; max-width: 360px; }
    .campo { width: min(360px, 80vw); display: block; }
    .btn-primario { background: var(--fs-green-700); color: #fff; }
  `,
})
export class ConfirmarReembolsoDialog {
  protected readonly ref = inject(MatDialogRef<ConfirmarReembolsoDialog, string | null | undefined>);
  protected readonly reembolso = inject<ReembolsoEfectivo>(MAT_DIALOG_DATA);
  protected nota = '';
}
