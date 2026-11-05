import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmarStockDestinoData {
  destino: string;
  cantidad: number;
}

/**
 * CU24 — mensaje 33: el destino ya tiene stock suficiente. El backend pide
 * confirmación antes de registrar la solicitud.
 */
@Component({
  selector: 'app-confirmar-stock-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>La sucursal destino ya tiene stock</h2>
    <mat-dialog-content>
      <p>
        En <strong>{{ data.destino }}</strong> ya hay
        <strong>{{ data.cantidad }}</strong>
        {{ data.cantidad === 1 ? 'unidad disponible' : 'unidades disponibles' }}
        de esta prenda.
      </p>
      <p class="nota">
        El traspaso se puede pedir igual, pero puede que no haga falta mover la prenda. ¿Querés
        continuar?
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button class="btn-primary" [mat-dialog-close]="true">Sí, solicitar</button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0 0 0.75rem;
      color: #334155;
    }
    .nota {
      color: #64748b;
      font-size: 0.85rem;
      margin-bottom: 0;
    }
    .btn-primary {
      background: var(--fs-green-700);
      color: #fff;
    }
  `,
})
export class ConfirmarStockDialog {
  protected readonly data = inject<ConfirmarStockDestinoData>(MAT_DIALOG_DATA);
}
