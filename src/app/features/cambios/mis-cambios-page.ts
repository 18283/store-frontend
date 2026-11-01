import { Component, computed, inject, signal } from '@angular/core';
import { Location, DatePipe, DecimalPipe } from '@angular/common';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Solicitud } from '../../core/models/cambio.model';
import { CambiosService } from './cambios.service';

const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITADO: 'Solicitado — llevá la prenda a la sucursal',
  RECIBIDO: 'Prenda recibida, en proceso',
  RESUELTO: 'Resuelto',
  CANCELADO: 'Cancelado',
};

/** CU23 — historial de cambios y devoluciones del cliente. */
@Component({
  selector: 'app-mis-cambios-page',
  imports: [DatePipe, DecimalPipe, MatToolbarModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './mis-cambios-page.html',
  styleUrl: './mis-cambios-page.scss',
})
export class MisCambiosPage {
  private readonly service = inject(CambiosService);
  private readonly location = inject(Location);

  protected readonly cargando = signal(true);
  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly sinResultados = computed(
    () => !this.cargando() && this.solicitudes().length === 0,
  );

  constructor() {
    this.service.misSolicitudes().subscribe({
      next: (s) => {
        this.solicitudes.set(s);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  volver(): void {
    this.location.back();
  }

  etiquetaEstado(estado: string): string {
    return ETIQUETA_ESTADO[estado] ?? estado;
  }
}
