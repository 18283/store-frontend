import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import {
  FinalizarReservaResultado,
  ReservaSucursal,
} from '../../core/models/reserva.model';
import { CatalogoVariante } from '../../core/models/catalogo-cliente.model';
import { ReservasService } from '../reservas/reservas.service';
import { TiendaService } from '../tienda/tienda.service';

/** CU35 — el cliente ya se probó las prendas: el Encargado indica cuántas se lleva.
 * CU17 — si se lleva otra talla/color de la misma prenda, se elige acá. */
@Component({
  selector: 'app-finalizar-reserva-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Finalizar reserva #{{ reserva.id }}</h2>
    <mat-dialog-content>
      <p class="ayuda">
        Cliente: <strong>{{ reserva.cliente }}</strong>. Indicá cuántas unidades de cada prenda se
        lleva. Lo que devuelve vuelve al stock, y lo que se lleva pasa a caja para cobrarse. Si se
        prueba otra talla o color, elegilo abajo.
      </p>
      <form [formGroup]="form" class="col">
        @for (item of reserva.items; track item.detalle_id) {
          <div class="fila">
            <div class="prenda">
              {{ item.producto }}
              <span class="detalle">{{ item.talla }} · {{ item.color }} (reservó {{ item.cantidad }})</span>
            </div>
            <mat-form-field appearance="outline" class="cant">
              <mat-label>Se lleva</mat-label>
              <input
                matInput
                type="number"
                min="0"
                [max]="item.cantidad"
                [formControlName]="'d' + item.detalle_id"
              />
            </mat-form-field>
            @if (item.producto_id != null) {
              <mat-form-field appearance="outline" class="talla">
                <mat-label>Talla / color a llevar</mat-label>
                <mat-select [formControlName]="'v' + item.detalle_id">
                  <mat-option [value]="item.variante_id">
                    La reservada ({{ item.talla }} · {{ item.color }})
                  </mat-option>
                  @for (v of otrasVariantes(item.producto_id, item.variante_id); track v.id) {
                    <mat-option [value]="v.id">{{ v.talla }} · {{ v.color }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          </div>
        }
      </form>
      <p class="resumen">
        Se lleva <strong>{{ llevadas }}</strong> · Devuelve <strong>{{ devueltas }}</strong>
      </p>
      @if (error()) {
        <p class="err">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancelar</button>
      <button mat-flat-button (click)="confirmar()" [disabled]="guardando() || form.invalid">
        Finalizar reserva
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .ayuda { margin: 0 0 1rem; color: #475569; font-size: .9rem; max-width: 460px; }
    .col { display: flex; flex-direction: column; gap: .5rem; min-width: min(560px, 85vw); }
    .fila { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .prenda { font-size: .92rem; color: #0f172a; flex: 1 1 160px; }
    .detalle { display: block; color: #94a3b8; font-size: .8rem; }
    .cant { width: 110px; flex-shrink: 0; }
    .talla { width: 220px; flex-shrink: 0; }
    .resumen { margin: .25rem 0 0; color: #334155; }
    .err { color: #b3261e; font-size: .85rem; margin: .5rem 0 0; }
  `,
})
export class FinalizarReservaDialog {
  private readonly service = inject(ReservasService);
  private readonly tienda = inject(TiendaService);
  protected readonly ref = inject(MatDialogRef<FinalizarReservaDialog, FinalizarReservaResultado>);
  protected readonly reserva = inject<ReservaSucursal>(MAT_DIALOG_DATA);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly variantesPorProducto = signal<Map<number, CatalogoVariante[]>>(new Map());

  protected readonly form = new FormGroup(
    Object.fromEntries([
      ...this.reserva.items.map((i) => [
        'd' + i.detalle_id,
        new FormControl(i.cantidad, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0), Validators.max(i.cantidad)],
        }),
      ]),
      ...this.reserva.items.map((i) => [
        'v' + i.detalle_id,
        new FormControl(i.variante_id, { nonNullable: true }),
      ]),
    ]),
  );

  constructor() {
    const idsProducto = [...new Set(this.reserva.items.map((i) => i.producto_id).filter((id): id is number => id != null))];
    for (const productoId of idsProducto) {
      this.tienda.detalle(productoId).subscribe({
        next: (d) => {
          const mapa = new Map(this.variantesPorProducto());
          mapa.set(productoId, d.variantes);
          this.variantesPorProducto.set(mapa);
        },
        error: () => {},
      });
    }
  }

  protected otrasVariantes(productoId: number, varianteActualId: number): CatalogoVariante[] {
    return (this.variantesPorProducto().get(productoId) ?? []).filter((v) => v.id !== varianteActualId);
  }

  protected get llevadas(): number {
    return this.reserva.items.reduce(
      (t, i) => t + (Number(this.form.get('d' + i.detalle_id)?.value) || 0),
      0,
    );
  }

  protected get devueltas(): number {
    return this.reserva.items.reduce((t, i) => t + i.cantidad, 0) - this.llevadas;
  }

  async confirmar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.service.finalizar(
          this.reserva.id,
          this.reserva.items.map((i) => {
            const cantidadLlevada = Number(this.form.get('d' + i.detalle_id)?.value) || 0;
            const sustitutaId = Number(this.form.get('v' + i.detalle_id)?.value);
            return {
              detalle_id: i.detalle_id,
              cantidad_llevada: cantidadLlevada,
              variante_sustituta_id:
                cantidadLlevada > 0 && sustitutaId && sustitutaId !== i.variante_id
                  ? sustitutaId
                  : null,
            };
          }),
        ),
      );
      this.ref.close(res);
    } catch (e: unknown) {
      const detail = (e as { error?: { detail?: unknown } }).error?.detail;
      this.error.set(typeof detail === 'string' ? detail : 'No se pudo finalizar la reserva.');
    } finally {
      this.guardando.set(false);
    }
  }
}
