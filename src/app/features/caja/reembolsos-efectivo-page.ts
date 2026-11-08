import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ReembolsoEfectivo } from '../../core/models/offline.model';
import { ReembolsoEfectivoService } from '../../core/offline/reembolso-efectivo.service';
import { ConfirmarReembolsoDialog } from './confirmar-reembolso-dialog';

/**
 * CU16 — devoluciones de efectivo pendientes: una venta offline en efectivo
 * del Cajero se rechazó al sincronizar porque otra operación se llevó el
 * stock. El cliente tiene que volver a la sucursal, devolver la prenda y
 * recibir el efectivo; esta pantalla es donde el Cajero lo confirma.
 */
@Component({
  selector: 'app-reembolsos-efectivo-page',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './reembolsos-efectivo-page.html',
  styleUrl: './reembolsos-efectivo-page.scss',
})
export class ReembolsosEfectivoPage {
  private readonly service = inject(ReembolsoEfectivoService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly cargando = signal(true);
  protected readonly confirmando = signal<number | null>(null);
  protected readonly pendientes = signal<ReembolsoEfectivo[]>([]);
  protected readonly sinResultados = computed(
    () => !this.cargando() && this.pendientes().length === 0,
  );

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.service.listarPendientes().subscribe({
      next: (p) => {
        this.pendientes.set(p.items);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  confirmar(r: ReembolsoEfectivo): void {
    const ref = this.dialog.open(ConfirmarReembolsoDialog, { data: r });
    ref.afterClosed().subscribe((nota) => {
      if (nota === undefined) return;
      this.confirmando.set(r.id);
      this.service.confirmar(r.id, nota ?? null).subscribe({
        next: () => {
          this.confirmando.set(null);
          this.snack.open('Devolución de efectivo confirmada.', 'OK', { duration: 3000 });
          this.cargar();
        },
        error: (e: unknown) => {
          this.confirmando.set(null);
          this.snack.open(
            (e as { error?: { detail?: string } }).error?.detail ??
              'No se pudo confirmar la devolución.',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
    });
  }
}
