import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PrediccionDemanda } from '../../core/models/analitica.model';
import { AnaliticaService } from './analitica.service';

/** CU32 — Generar predicción de demanda (Administrador). */
@Component({
  selector: 'app-prediccion-demanda-page',
  imports: [
    DecimalPipe,
    PercentPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './prediccion-demanda-page.html',
  styleUrl: './prediccion-demanda-page.scss',
})
export class PrediccionDemandaPage {
  private readonly service = inject(AnaliticaService);
  private readonly snack = inject(MatSnackBar);

  protected readonly opcionesSemanas = [4, 8, 12, 26, 52];
  protected readonly semanas = signal(12);
  protected readonly cargando = signal(true);
  protected readonly data = signal<PrediccionDemanda | null>(null);

  protected readonly maxPrediccion = computed(() => {
    const items = this.data()?.items ?? [];
    return Math.max(1, ...items.map((i) => i.prediccion_proxima_semana));
  });

  constructor() {
    this.generar();
  }

  generar(): void {
    this.cargando.set(true);
    this.service.prediccionDemanda(this.semanas()).subscribe({
      next: (r) => {
        this.data.set(r);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error(e, 'No se pudo generar la predicción de demanda.');
      },
    });
  }

  anchoBarra(valor: number): number {
    const max = this.maxPrediccion();
    return max > 0 ? Math.max(3, Math.round((valor / max) * 100)) : 3;
  }

  private error(e: unknown, mensaje: string): void {
    const detail = (e as { error?: { detail?: unknown } }).error?.detail;
    this.snack.open(typeof detail === 'string' ? detail : mensaje, 'Cerrar', { duration: 4000 });
  }
}
