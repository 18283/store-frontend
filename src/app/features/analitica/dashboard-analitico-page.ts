import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DashboardAnalitico } from '../../core/models/analitica.model';
import { AnaliticaService } from './analitica.service';

/** CU31 — Consultar dashboard analítico (Administrador). */
@Component({
  selector: 'app-dashboard-analitico-page',
  imports: [DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './dashboard-analitico-page.html',
  styleUrl: './dashboard-analitico-page.scss',
})
export class DashboardAnaliticoPage {
  private readonly service = inject(AnaliticaService);
  private readonly snack = inject(MatSnackBar);

  protected readonly cargando = signal(true);
  protected readonly data = signal<DashboardAnalitico | null>(null);

  protected readonly maxIngresoSemana = computed(() => {
    const serie = this.data()?.serie_semanal ?? [];
    return Math.max(1, ...serie.map((p) => +p.ingresos));
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.dashboard().subscribe({
      next: (r) => {
        this.data.set(r);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error(e, 'No se pudo cargar el dashboard analítico.');
      },
    });
  }

  alturaBarra(ingresos: string): number {
    const valor = +ingresos;
    const max = this.maxIngresoSemana();
    return max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 4;
  }

  private error(e: unknown, mensaje: string): void {
    const detail = (e as { error?: { detail?: unknown } }).error?.detail;
    this.snack.open(typeof detail === 'string' ? detail : mensaje, 'Cerrar', { duration: 4000 });
  }
}
