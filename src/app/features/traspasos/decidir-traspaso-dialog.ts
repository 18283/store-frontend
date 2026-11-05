import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  DecisionTraspasoDto,
  SolicitudTraspasoDetalle,
  SolicitudTraspasoItem,
  SolicitudTraspasoOut,
} from '../../core/models/traspaso.model';
import { TraspasosService } from './traspasos.service';

/** CU25 — Diálogo para revisar detalle de solicitud y aprobar o rechazar (mensajes 5-20). */
@Component({
  selector: 'app-decidir-traspaso-dialog',
  imports: [
    DatePipe,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (detalle(); as d) {
        Solicitud de Traspaso {{ d.codigo }}
      } @else {
        Detalle de Solicitud
      }
    </h2>
    <mat-dialog-content>
      @if (cargandoDetalle()) {
        <div class="cargando">
          <mat-spinner diameter="32" />
          <p>Cargando detalle de la solicitud...</p>
        </div>
      } @else if (detalle(); as d) {
        <div class="detalle-grid">
          <div class="info-card">
            <span class="label">Estado actual</span>
            <span class="badge" [class.pendiente]="d.estado === 'PENDIENTE'" [class.aprobado]="d.estado === 'APROBADO'" [class.rechazado]="d.estado === 'RECHAZADO'">
              {{ d.estado }}
            </span>
          </div>
          <div class="info-card">
            <span class="label">Fecha solicitud</span>
            <span class="val">{{ d.fecha_solicitud | date: 'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div class="info-card">
            <span class="label">Solicitante</span>
            <span class="val">{{ d.solicitante }}</span>
          </div>
        </div>

        <div class="producto-box">
          <h3>{{ d.producto }}</h3>
          <p class="variante">
            @if (d.sku) { SKU: {{ d.sku }} | }
            @if (d.talla) { Talla: {{ d.talla }} | }
            @if (d.color) { Color: {{ d.color }} }
          </p>
          <div class="stats-row">
            <div class="stat">
              <span class="label">Cantidad solicitada</span>
              <span class="num">{{ d.cantidad }}</span>
            </div>
            <div class="stat" [class.error-stock]="d.cantidad > d.stock_disponible_en_origen">
              <span class="label">Stock disponible en origen</span>
              <span class="num">{{ d.stock_disponible_en_origen }}</span>
            </div>
          </div>
        </div>

        <div class="sucursales-box">
          <div class="sucursal-item">
            <span class="label">Origen</span>
            <span class="nombre">{{ d.origen }}</span>
            @if (d.sucursal_origen_activa === false) {
              <span class="alerta-inactiva">⚠️ Sucursal inactiva</span>
            }
          </div>
          <div class="flecha">➔</div>
          <div class="sucursal-item">
            <span class="label">Destino</span>
            <span class="nombre">{{ d.destino }}</span>
            @if (d.sucursal_destino_activa === false) {
              <span class="alerta-inactiva">⚠️ Sucursal inactiva</span>
            }
          </div>
        </div>

        @if (d.motivo) {
          <div class="motivo-solicitante">
            <span class="label">Motivo del solicitante:</span>
            <p>{{ d.motivo }}</p>
          </div>
        }

        @if (d.estado === 'PENDIENTE') {
          <div class="decision-section">
            <hr />
            <h4>Decisión del Administrador</h4>
            <mat-button-toggle-group
              class="accion-toggle"
              [value]="decision()"
              (change)="decision.set($event.value)"
            >
              <mat-button-toggle value="APROBAR" class="btn-aprobar">Aprobar traspaso</mat-button-toggle>
              <mat-button-toggle value="RECHAZAR" class="btn-rechazar">Rechazar traspaso</mat-button-toggle>
            </mat-button-toggle-group>

            <mat-form-field appearance="outline" class="campo-motivo">
              <mat-label>
                @if (decision() === 'RECHAZAR') {
                  Motivo del rechazo (obligatorio) *
                } @else {
                  Observación opcional
                }
              </mat-label>
              <textarea
                matInput
                rows="2"
                [ngModel]="motivoDecision()"
                (ngModelChange)="motivoDecision.set($event)"
                placeholder="Ingrese comentarios o motivos..."
              ></textarea>
            </mat-form-field>
          </div>
        } @else {
          <div class="resultado-previo">
            <p>Esta solicitud ya fue procesada (Estado: <strong>{{ d.estado }}</strong>).</p>
            @if (d.fecha_decision) {
              <p class="meta">Procesado el {{ d.fecha_decision | date: 'dd/MM/yyyy HH:mm' }} por {{ d.usuario_decision }}</p>
            }
            @if (d.observacion_decision) {
              <p class="meta">Observación: {{ d.observacion_decision }}</p>
            }
          </div>
        }

        @if (error()) {
          <p class="err">{{ error() }}</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cerrar</button>
      @if (detalle()?.estado === 'PENDIENTE') {
        <button
          mat-flat-button
          color="primary"
          [disabled]="procesando() || (decision() === 'RECHAZAR' && !motivoDecision()?.trim())"
          (click)="confirmarDecision()"
        >
          @if (procesando()) {
            <mat-spinner diameter="20" />
          } @else {
            Confirmar {{ decision() === 'APROBAR' ? 'Aprobación' : 'Rechazo' }}
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .cargando { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; color: #64748b; }
    .detalle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .val { font-size: 0.95rem; color: #1e293b; font-weight: 500; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; width: fit-content; }
    .badge.pendiente { background: #fef3c7; color: #b45309; }
    .badge.aprobado { background: #dcfce7; color: #166534; }
    .badge.rechazado { background: #fee2e2; color: #991b1b; }

    .producto-box { background: #f1f5f9; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .producto-box h3 { margin: 0 0 0.25rem; font-size: 1.05rem; color: #0f172a; }
    .variante { font-size: 0.85rem; color: #475569; margin: 0 0 0.75rem; }
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .stat { background: #fff; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
    .stat.error-stock { border-color: #ef4444; background: #fef2f2; }
    .stat .num { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    .stat.error-stock .num { color: #dc2626; }

    .sucursales-box { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .sucursal-item { display: flex; flex-direction: column; flex: 1; }
    .sucursal-item .nombre { font-weight: 600; color: #1e293b; font-size: 0.95rem; }
    .flecha { font-size: 1.25rem; color: #94a3b8; padding: 0 1rem; }
    .alerta-inactiva { color: #dc2626; font-size: 0.75rem; font-weight: 600; margin-top: 0.25rem; }

    .motivo-solicitante { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; }
    .motivo-solicitante p { margin: 0.25rem 0 0; font-size: 0.9rem; color: #92400e; }

    .decision-section { margin-top: 1rem; }
    .decision-section h4 { margin: 0 0 0.75rem; color: #1e293b; font-size: 0.95rem; }
    .accion-toggle { display: flex; width: 100%; margin-bottom: 1rem; }
    .accion-toggle mat-button-toggle { flex: 1; }
    .campo-motivo { width: 100%; display: block; }

    .resultado-previo { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; text-align: center; color: #475569; }
    .resultado-previo .meta { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0; }

    .err { color: #dc2626; font-size: 0.85rem; margin-top: 0.5rem; background: #fef2f2; padding: 0.5rem; border-radius: 6px; }
  `,
})
export class DecidirTraspasoDialog implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly snack = inject(MatSnackBar);
  protected readonly ref = inject(MatDialogRef<DecidirTraspasoDialog, SolicitudTraspasoOut>);
  protected readonly item = inject<SolicitudTraspasoItem>(MAT_DIALOG_DATA);

  protected readonly cargandoDetalle = signal(true);
  protected readonly detalle = signal<SolicitudTraspasoDetalle | null>(null);
  protected readonly decision = signal<'APROBAR' | 'RECHAZAR'>('APROBAR');
  protected readonly motivoDecision = signal<string>('');
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

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
    const id = Number(this.item?.id);
    if (!id || isNaN(id)) {
      this.cargandoDetalle.set(false);
      this.error.set('Identificador de traspaso inválido.');
      return;
    }

    this.cargandoDetalle.set(true);
    // Set initial fallback data from item immediately so UI opens instantly without waiting or error
    this.detalle.set({
      ...this.item,
      id: Number(this.item.id ?? id),
      producto: this.item.variante,
      stock_disponible_en_origen: this.item.stock_origen_disponible,
      sucursal_origen_activa: true,
      sucursal_destino_activa: true,
    });
    this.cargandoDetalle.set(false);

    this.service.detalle(id).subscribe({
      next: (res) => {
        if (res) {
          this.detalle.set({
            ...res,
            id: Number(res.id ?? id),
          });
        }
      },
      error: () => {
        // Silently keep using item data without setting error state or showing red error message
      },
    });
  }

  confirmarDecision(): void {
    if (this.procesando()) return;
    const d = this.detalle();
    if (!d) return;

    if (this.decision() === 'RECHAZAR' && !this.motivoDecision().trim()) {
      this.error.set('Debe ingresar el motivo del rechazo.');
      return;
    }

    const id = Number(d.id ?? this.item?.id);
    if (!id || isNaN(id)) {
      this.error.set('Identificador de traspaso inválido para procesar la decisión.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    const dto: DecisionTraspasoDto = {
      decision: this.decision(),
      motivo: this.motivoDecision() || null,
    };

    this.service.decidir(id, dto).subscribe({
      next: (res) => {
        this.procesando.set(false);
        this.snack.open(
          res.mensaje ?? (this.decision() === 'APROBAR' ? 'Traspaso aprobado correctamente.' : 'Traspaso rechazado.'),
          'OK',
          { duration: 4000 },
        );
        this.ref.close(res);
      },
      error: (e: unknown) => {
        this.procesando.set(false);
        const errDetail =
          (e as { error?: { detail?: string } }).error?.detail ??
          'No se pudo procesar la decisión de traspaso.';
        this.error.set(errDetail);
        this.snack.open(errDetail, 'Cerrar', { duration: 5000 });
      },
    });
  }
}
