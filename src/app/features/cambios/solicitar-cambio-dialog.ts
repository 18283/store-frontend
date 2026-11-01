import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ItemVenta } from '../../core/models/venta.model';
import { CatalogoVariante } from '../../core/models/catalogo-cliente.model';
import { Solicitud, TipoSolicitud } from '../../core/models/cambio.model';
import { TiendaService } from '../tienda/tienda.service';
import { CambiosService } from './cambios.service';

export interface SolicitarCambioData {
  ventaId: number;
  item: ItemVenta;
}

/** CU18 — el cliente pide cambiar de talla/color o devolver una prenda,
 * dentro de las 48 horas desde la compra. */
@Component({
  selector: 'app-solicitar-cambio-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item.producto }}</h2>
    <mat-dialog-content>
      <p class="actual">
        Comprado: {{ data.item.talla }} · {{ data.item.color }} × {{ data.item.cantidad }}
      </p>

      <mat-button-toggle-group
        class="tipo"
        [value]="tipo()"
        (change)="tipo.set($event.value)"
      >
        <mat-button-toggle value="CAMBIO">Cambiar talla/color</mat-button-toggle>
        <mat-button-toggle value="DEVOLUCION">Devolver</mat-button-toggle>
      </mat-button-toggle-group>

      @if (tipo() === 'CAMBIO') {
        @if (cargandoVariantes()) {
          <mat-spinner diameter="28" />
        } @else {
          <mat-form-field appearance="outline" class="campo">
            <mat-label>Nueva talla / color</mat-label>
            <mat-select [value]="varianteNuevaId()" (valueChange)="varianteNuevaId.set($event)">
              @for (v of otrasVariantes(); track v.id) {
                <mat-option [value]="v.id">{{ v.talla }} · {{ v.color }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (otrasVariantes().length === 0) {
            <p class="aviso">No hay otras tallas/colores disponibles de esta prenda.</p>
          }
        }
      }

      @if (data.item.cantidad > 1) {
        <mat-form-field appearance="outline" class="campo">
          <mat-label>Cantidad</mat-label>
          <mat-select [value]="cantidad()" (valueChange)="cantidad.set($event)">
            @for (n of cantidadesPosibles(); track n) {
              <mat-option [value]="n">{{ n }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <p class="nota">
        Tenés hasta 48 horas desde la compra para pedirlo. Después vas a tener que llevar la
        prenda a la sucursal donde compraste para completar el trámite.
      </p>

      @if (error()) {
        <p class="err">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancelar</button>
      <button mat-flat-button (click)="confirmar()" [disabled]="procesando() || !puedeConfirmar()">
        Solicitar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .actual { color: #64748b; margin: 0 0 .75rem; }
    .tipo { display: flex; margin-bottom: 1rem; }
    .tipo mat-button-toggle { flex: 1; }
    .campo { width: min(320px, 80vw); display: block; }
    .aviso { color: #9a3412; font-size: .85rem; }
    .nota { color: #64748b; font-size: .82rem; margin-top: .75rem; }
    .err { color: #b3261e; font-size: .85rem; margin: .5rem 0 0; }
  `,
})
export class SolicitarCambioDialog {
  private readonly tienda = inject(TiendaService);
  private readonly service = inject(CambiosService);
  protected readonly ref = inject(MatDialogRef<SolicitarCambioDialog, Solicitud>);
  protected readonly data = inject<SolicitarCambioData>(MAT_DIALOG_DATA);

  protected readonly tipo = signal<TipoSolicitud>('CAMBIO');
  protected readonly cantidad = signal(1);
  protected readonly variantes = signal<CatalogoVariante[]>([]);
  protected readonly varianteNuevaId = signal<number | null>(null);
  protected readonly cargandoVariantes = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly otrasVariantes = computed(() =>
    this.variantes().filter((v) => v.id !== this.data.item.variante_id),
  );

  protected readonly cantidadesPosibles = computed(() =>
    Array.from({ length: this.data.item.cantidad }, (_, i) => i + 1),
  );

  protected readonly puedeConfirmar = computed(() => {
    if (this.tipo() === 'CAMBIO') return this.varianteNuevaId() != null;
    return true;
  });

  constructor() {
    if (this.data.item.producto_id != null) {
      this.cargandoVariantes.set(true);
      this.tienda.detalle(this.data.item.producto_id).subscribe({
        next: (d) => {
          this.variantes.set(d.variantes);
          this.cargandoVariantes.set(false);
        },
        error: () => this.cargandoVariantes.set(false),
      });
    }
  }

  async confirmar(): Promise<void> {
    if (this.procesando() || !this.puedeConfirmar()) return;
    this.procesando.set(true);
    this.error.set(null);
    try {
      const solicitud = await firstValueFrom(
        this.service.solicitar({
          venta_id: this.data.ventaId,
          venta_detalle_id: this.data.item.id,
          tipo: this.tipo(),
          variante_nueva_id: this.tipo() === 'CAMBIO' ? this.varianteNuevaId() : null,
          cantidad: this.cantidad(),
        }),
      );
      this.ref.close(solicitud);
    } catch (e: unknown) {
      const detail = (e as { error?: { detail?: unknown } }).error?.detail;
      this.error.set(typeof detail === 'string' ? detail : 'No se pudo crear la solicitud.');
    } finally {
      this.procesando.set(false);
    }
  }
}
