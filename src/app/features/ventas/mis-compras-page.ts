import { Component, computed, inject, signal } from '@angular/core';
import { Location, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ItemVenta, Venta } from '../../core/models/venta.model';
import { VentasService } from './ventas.service';
import { SolicitarCambioDialog } from '../cambios/solicitar-cambio-dialog';

const PLAZO_HORAS_CAMBIO = 48;

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADA: 'Pagada',
  COMPLETADA: 'Completada',
  ANULADA: 'Anulada',
};

@Component({
  selector: 'app-mis-compras-page',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './mis-compras-page.html',
  styleUrl: './mis-compras-page.scss',
})
export class MisComprasPage {
  private readonly service = inject(VentasService);
  private readonly location = inject(Location);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  /** Cuánto se descontó en la compra por promociones (precio original − cobrado). */
  protected ahorro(v: Venta): number {
    return v.items.reduce(
      (t, i) => t + (i.precio_original ? (+i.precio_original - +i.precio_unitario) * i.cantidad : 0),
      0,
    );
  }

  protected readonly cargando = signal(true);
  protected readonly procesando = signal<number | null>(null);
  protected readonly ventas = signal<Venta[]>([]);
  protected readonly sinResultados = computed(
    () => !this.cargando() && this.ventas().length === 0,
  );

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.service.misCompras().subscribe({
      next: (v) => {
        this.ventas.set(v);
        this.cargando.set(false);
        this.revisarPendientes(v);
      },
      error: () => this.cargando.set(false),
    });
  }

  // Cubre el pago completado desde otro dispositivo (QR escaneado con el celular), donde nunca se abrió la pantalla de "resultado" que hace el polling.
  private revisarPendientes(ventas: Venta[]): void {
    for (const venta of ventas) {
      if (venta.estado !== 'PENDIENTE_PAGO') continue;
      this.service.estadoPago(venta.id).subscribe({
        next: (info) => {
          if (info.venta_estado === venta.estado) return;
          this.ventas.update((lista) =>
            lista.map((v) =>
              v.id === venta.id ? { ...v, estado: info.venta_estado } : v,
            ),
          );
        },
        error: () => {},
      });
    }
  }

  volver(): void {
    this.location.back();
  }

  etiquetaEstado(estado: string): string {
    return ETIQUETA_ESTADO[estado] ?? estado;
  }

  reintentarPago(venta: Venta): void {
    this.procesando.set(venta.id);
    this.service.iniciarPago(venta.id).subscribe({
      next: (pago) => {
        if (pago.checkout_url) window.location.href = pago.checkout_url;
      },
      error: (e: unknown) => {
        this.procesando.set(null);
        this.snack.open(
          (e as { error?: { detail?: string } }).error?.detail ??
            'No se pudo generar un nuevo link de pago.',
          'Cerrar',
          { duration: 4000 },
        );
      },
    });
  }

  // CU18 — dentro de 48h de una venta pagada/completada se puede pedir
  // cambio o devolución. El backend valida esto igual; esto es solo para
  // no mostrar el botón cuando obviamente ya no corresponde.
  protected puedeSolicitarCambio(v: Venta): boolean {
    if (v.estado !== 'PAGADA' && v.estado !== 'COMPLETADA') return false;
    const limite = new Date(v.fecha_creacion).getTime() + PLAZO_HORAS_CAMBIO * 3600_000;
    return Date.now() <= limite;
  }

  solicitarCambio(venta: Venta, item: ItemVenta): void {
    this.dialog
      .open(SolicitarCambioDialog, { data: { ventaId: venta.id, item } })
      .afterClosed()
      .subscribe((solicitud) => {
        if (solicitud) {
          this.snack.open('Solicitud enviada. Llevá la prenda a la sucursal.', 'OK', {
            duration: 4000,
          });
        }
      });
  }

  cancelar(venta: Venta): void {
    if (!confirm('¿Cancelar este pedido? El stock se libera.')) return;
    this.procesando.set(venta.id);
    this.service.cancelar(venta.id).subscribe({
      next: (actualizada) => {
        this.ventas.update((lista) =>
          lista.map((v) => (v.id === actualizada.id ? actualizada : v)),
        );
        this.procesando.set(null);
        this.snack.open('Pedido cancelado.', 'OK', { duration: 2500 });
      },
      error: (e: unknown) => {
        this.procesando.set(null);
        this.snack.open(
          (e as { error?: { detail?: string } }).error?.detail ??
            'No se pudo cancelar el pedido.',
          'Cerrar',
          { duration: 4000 },
        );
      },
    });
  }
}
