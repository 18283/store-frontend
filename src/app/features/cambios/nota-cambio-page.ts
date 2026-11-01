import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe, Location } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { NotaCambio } from '../../core/models/cambio.model';
import { CambiosService } from './cambios.service';

/** CU22 — nota de recepción y/o resolución de un cambio o devolución. */
@Component({
  selector: 'app-nota-cambio-page',
  imports: [DatePipe, DecimalPipe, MatIconModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './nota-cambio-page.html',
  styleUrl: './nota-cambio-page.scss',
})
export class NotaCambioPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(CambiosService);
  private readonly location = inject(Location);

  protected readonly cargando = signal(true);
  protected readonly nota = signal<NotaCambio | null>(null);
  protected readonly error = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.nota(id).subscribe({
      next: (n) => {
        this.nota.set(n);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  volver(): void {
    this.location.back();
  }

  imprimir(): void {
    window.print();
  }
}
