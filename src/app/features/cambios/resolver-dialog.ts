import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  CobroPendiente,
  ResolverSolicitudDto,
  Solicitud,
  TipoSolicitud,
} from '../../core/models/cambio.model';
import { CambiosService } from './cambios.service';

type Fase = 'formulario' | 'cobro_pendiente' | 'error_stock';

const INTERVALO_MS = 3000;
const MAX_INTENTOS = 20; // ~60s de reintentos automáticos

/** CU19/CU20 — el cajero resuelve una solicitud ya recepcionada (RECIBIDO):
 * entrega la talla/color nuevo o devuelve el dinero, cobrando o pagando la diferencia. */
@Component({
  selector: 'app-resolver-dialog',
  imports: [
    DecimalPipe,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Resolver solicitud #{{ solicitud.id }}</h2>
    <mat-dialog-content>
      <p class="resumen">
        {{ solicitud.producto }} — devuelve {{ solicitud.variante_devuelta }} ×
        {{ solicitud.cantidad }}
        @if (solicitud.variante_nueva) {
          , pide {{ solicitud.variante_nueva }}
        }
      </p>

      @if (fase() === 'formulario') {
        <p class="ayuda">
          "Entregar cambio" le da la talla/color nueva que pidió (se cobra o devuelve la
          diferencia de precio entre ambas). "Devolver dinero" no le entrega ninguna prenda
          nueva, solo se le devuelve lo que pagó por la que trajo — usalo si no hay stock de la
          talla pedida o si el cliente se arrepintió del cambio.
        </p>
        <mat-button-toggle-group
          class="accion"
          [value]="accion()"
          (change)="accion.set($event.value)"
        >
          <mat-button-toggle value="CAMBIO" [disabled]="!puedeCambio()">
            Entregar cambio
          </mat-button-toggle>
          <mat-button-toggle value="DEVOLUCION">Devolver dinero</mat-button-toggle>
        </mat-button-toggle-group>

        @if (diferenciaEstimada(); as dif) {
          <p class="diferencia" [class.cobra]="dif > 0" [class.devuelve]="dif < 0">
            @if (dif > 0) {
              Diferencia: el cliente paga <strong>Bs {{ dif | number: '1.2-2' }}</strong>
            } @else if (dif < 0) {
              Diferencia: se le devuelve <strong>Bs {{ -dif | number: '1.2-2' }}</strong>
            } @else {
              Sin diferencia de precio — no hay que cobrar ni devolver nada.
            }
          </p>
        }

        @if (diferenciaEstimada(); as dif) {
          @if (dif > 0) {
            <mat-form-field appearance="outline" class="campo">
              <mat-label>Forma de pago de la diferencia</mat-label>
              <mat-select [value]="formaPago()" (valueChange)="formaPago.set($event)">
                <mat-option value="EFECTIVO">Efectivo</mat-option>
                <mat-option value="STRIPE">Stripe</mat-option>
              </mat-select>
            </mat-form-field>
            @if (formaPago() === 'EFECTIVO') {
              <mat-form-field appearance="outline" class="campo">
                <mat-label>Monto recibido del cliente (Bs)</mat-label>
                <input
                  matInput
                  type="number"
                  min="0"
                  step="0.01"
                  [ngModel]="montoRecibido()"
                  (ngModelChange)="montoRecibido.set($event)"
                />
              </mat-form-field>
            }
          } @else if (dif < 0) {
            <mat-form-field appearance="outline" class="campo">
              <mat-label>Forma de devolución</mat-label>
              <mat-select [value]="formaPago()" (valueChange)="formaPago.set($event)">
                <mat-option value="EFECTIVO">Efectivo</mat-option>
                <mat-option value="STRIPE">Stripe (reembolso)</mat-option>
              </mat-select>
            </mat-form-field>
          }
        }

        @if (error()) {
          <p class="err">{{ error() }}</p>
        }
      }

      @if (fase() === 'cobro_pendiente') {
        <div class="cobro">
          <p>
            El cliente debe pagar una diferencia de
            <strong>Bs {{ +(cobroPendiente()?.monto ?? 0) | number: '1.2-2' }}</strong> por
            Stripe.
          </p>
          @if (cobroPendiente()?.qr_data_url) {
            <img class="qr" [src]="cobroPendiente()!.qr_data_url" alt="QR de pago" />
          }
          <button mat-stroked-button (click)="abrirLinkPago()">Abrir link de pago</button>
          <p class="espera">
            @if (verificando()) {
              <mat-spinner diameter="20" />
              Esperando el pago...
            } @else {
              Todavía no se registró el pago.
            }
          </p>
        </div>
      }

      @if (fase() === 'error_stock') {
        <p class="err">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (fase() === 'formulario') {
        <button mat-button (click)="ref.close()">Cancelar</button>
        <button mat-flat-button (click)="resolver()" [disabled]="procesando()">Resolver</button>
      }
      @if (fase() === 'cobro_pendiente') {
        <button mat-button (click)="ref.close()">Cerrar (queda pendiente)</button>
        <button mat-flat-button (click)="verificarAhora()" [disabled]="verificando()">
          Ya pagó, verificar
        </button>
      }
      @if (fase() === 'error_stock') {
        <button mat-flat-button (click)="ref.close()">Cerrar</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .resumen { color: #334155; margin: 0 0 1rem; }
    .ayuda { color: #64748b; font-size: .82rem; margin: 0 0 1rem; max-width: 420px; }
    .accion { display: flex; margin-bottom: .75rem; }
    .accion mat-button-toggle { flex: 1; }
    .campo { width: min(360px, 80vw); display: block; }
    .nota { color: #64748b; font-size: .82rem; margin-top: .5rem; }
    .diferencia { font-size: .95rem; margin: 0 0 1rem; color: #334155; }
    .diferencia.cobra { color: #9a3412; }
    .diferencia.devuelve { color: #166534; }
    .err { color: #b3261e; font-size: .85rem; margin: .5rem 0 0; }
    .cobro { display: flex; flex-direction: column; align-items: center; gap: .75rem; text-align: center; }
    .qr { width: 200px; height: 200px; border: 1px solid #eef2f7; border-radius: 8px; }
    .espera { display: flex; align-items: center; gap: .5rem; color: #64748b; font-size: .85rem; }
  `,
})
export class ResolverDialog implements OnDestroy {
  private readonly service = inject(CambiosService);
  protected readonly ref = inject(MatDialogRef<ResolverDialog, Solicitud>);
  protected readonly solicitud = inject<Solicitud>(MAT_DIALOG_DATA);

  private sub: Subscription | null = null;

  protected readonly fase = signal<Fase>('formulario');
  protected readonly accion = signal<TipoSolicitud>(
    this.solicitud.variante_nueva_id != null ? 'CAMBIO' : 'DEVOLUCION',
  );
  protected readonly formaPago = signal<'EFECTIVO' | 'STRIPE'>('EFECTIVO');
  protected readonly montoRecibido = signal<number | null>(null);
  protected readonly procesando = signal(false);
  protected readonly verificando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cobroPendiente = signal<CobroPendiente | null>(null);

  protected readonly puedeCambio = computed(() => this.solicitud.variante_nueva_id != null);

  protected readonly diferenciaEstimada = computed<number | null>(() => {
    const campo =
      this.accion() === 'CAMBIO'
        ? this.solicitud.diferencia_cambio_estimada
        : this.solicitud.diferencia_devolucion_estimada;
    return campo != null ? Number(campo) : null;
  });

  resolver(): void {
    if (this.procesando()) return;
    this.procesando.set(true);
    this.error.set(null);
    const dto: ResolverSolicitudDto = {
      accion: this.accion(),
      forma_pago: this.formaPago(),
      monto_recibido: this.formaPago() === 'EFECTIVO' ? this.montoRecibido() : null,
    };
    this.service.resolver(this.solicitud.id, dto).subscribe({
      next: (res) => {
        this.procesando.set(false);
        if (res.cobro_pendiente) {
          this.cobroPendiente.set(res.cobro_pendiente);
          this.fase.set('cobro_pendiente');
          this.esperar(0);
        } else {
          this.ref.close(res.solicitud);
        }
      },
      error: (e: unknown) => {
        this.procesando.set(false);
        this.error.set(
          (e as { error?: { detail?: string } }).error?.detail ??
            'No se pudo resolver la solicitud.',
        );
      },
    });
  }

  abrirLinkPago(): void {
    const url = this.cobroPendiente()?.checkout_url;
    if (url) window.open(url, '_blank');
  }

  verificarAhora(): void {
    this.sub?.unsubscribe();
    this.esperar(0, true);
  }

  private esperar(intento: number, manual = false): void {
    this.verificando.set(true);
    this.service.confirmarCobro(this.solicitud.id).subscribe({
      next: (sol) => {
        this.verificando.set(false);
        this.ref.close(sol);
      },
      error: (e: unknown) => {
        const detail = (e as { error?: { detail?: string } }).error?.detail ?? '';
        if (detail.toLowerCase().includes('reembols')) {
          this.verificando.set(false);
          this.error.set(detail);
          this.fase.set('error_stock');
          return;
        }
        if (manual || intento + 1 >= MAX_INTENTOS) {
          this.verificando.set(false);
          return;
        }
        this.sub = timer(INTERVALO_MS).subscribe(() => this.esperar(intento + 1));
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
