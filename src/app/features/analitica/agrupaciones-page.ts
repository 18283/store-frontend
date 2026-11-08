import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Agrupaciones } from '../../core/models/analitica.model';
import { AnaliticaService } from './analitica.service';

/** CU33 — Analizar agrupaciones y patrones de productos (Administrador). */
@Component({
  selector: 'app-agrupaciones-page',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './agrupaciones-page.html',
  styleUrl: './agrupaciones-page.scss',
})
export class AgrupacionesPage {
  private readonly service = inject(AnaliticaService);
  private readonly snack = inject(MatSnackBar);

  protected readonly opcionesDias = [30, 60, 90, 180];
  protected readonly dias = signal(60);
  protected readonly cargando = signal(true);
  protected readonly data = signal<Agrupaciones | null>(null);

  constructor() {
    this.generar();
  }

  generar(): void {
    this.cargando.set(true);
    this.service.agrupaciones(this.dias()).subscribe({
      next: (r) => {
        this.data.set(r);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error(e, 'No se pudo generar la agrupación de productos.');
      },
    });
  }

  private error(e: unknown, mensaje: string): void {
    const detail = (e as { error?: { detail?: unknown } }).error?.detail;
    this.snack.open(typeof detail === 'string' ? detail : mensaje, 'Cerrar', { duration: 4000 });
  }
}
