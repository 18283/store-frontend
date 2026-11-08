import { Component, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ModeloAnalitico, TipoModeloAnalitico } from '../../core/models/analitica.model';
import { AnaliticaService } from './analitica.service';

/** CU34 — Entrenar, evaluar y actualizar modelos analíticos (Superadministrador). */
@Component({
  selector: 'app-entrenar-modelos-page',
  imports: [DatePipe, JsonPipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './entrenar-modelos-page.html',
  styleUrl: './entrenar-modelos-page.scss',
})
export class EntrenarModelosPage {
  private readonly service = inject(AnaliticaService);
  private readonly snack = inject(MatSnackBar);

  protected readonly cargandoHistorial = signal(true);
  protected readonly entrenando = signal<TipoModeloAnalitico | null>(null);
  protected readonly historial = signal<ModeloAnalitico[]>([]);

  constructor() {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.service.listarModelos().subscribe({
      next: (r) => {
        this.historial.set(r);
        this.cargandoHistorial.set(false);
      },
      error: (e: unknown) => {
        this.cargandoHistorial.set(false);
        this.error(e, 'No se pudo cargar el historial de entrenamientos.');
      },
    });
  }

  entrenar(tipo: TipoModeloAnalitico): void {
    if (this.entrenando()) return;
    this.entrenando.set(tipo);
    this.service.entrenarModelo(tipo).subscribe({
      next: (r) => {
        this.entrenando.set(null);
        this.snack.open(
          `Modelo de ${this.nombreTipo(tipo)} entrenado: versión ${r.version}, ${r.muestras_entrenamiento} muestras.`,
          'Cerrar',
          { duration: 5000 },
        );
        this.cargarHistorial();
      },
      error: (e: unknown) => {
        this.entrenando.set(null);
        this.error(e, 'No se pudo entrenar el modelo.');
      },
    });
  }

  nombreTipo(tipo: TipoModeloAnalitico): string {
    return tipo === 'DEMANDA' ? 'predicción de demanda' : 'agrupación de productos';
  }

  private error(e: unknown, mensaje: string): void {
    const detail = (e as { error?: { detail?: unknown } }).error?.detail;
    this.snack.open(typeof detail === 'string' ? detail : mensaje, 'Cerrar', { duration: 6000 });
  }
}
