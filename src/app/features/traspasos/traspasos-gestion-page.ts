import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { SolicitudTraspasoItem } from '../../core/models/traspaso.model';
import { TraspasosService } from './traspasos.service';
import { DecidirTraspasoDialog } from './decidir-traspaso-dialog';

/** CU25 — Gestión, aprobación y rechazo de traspasos por el Administrador. */
@Component({
  selector: 'app-traspasos-gestion-page',
  imports: [
    DatePipe,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './traspasos-gestion-page.html',
  styleUrl: './traspasos-gestion-page.scss',
})
export class TraspasosGestionPage implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly columnas = ['codigo', 'fecha', 'variante', 'ruta', 'solicitante', 'estado', 'acciones'];

  protected readonly cargando = signal(false);
  protected readonly solicitudes = signal<SolicitudTraspasoItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly size = signal(10);
  protected readonly estado = signal<string | null>(null);

  protected readonly sinResultados = computed(
    () => !this.cargando() && this.solicitudes().length === 0,
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarEstado(valor: string | null): void {
    this.estado.set(valor);
    this.page.set(0);
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex);
    this.size.set(ev.pageSize);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.service.listar(this.estado(), this.page() + 1, this.size()).subscribe({
      next: (res) => {
        this.solicitudes.set(res.items);
        this.total.set(res.total);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.snack.open(
          (e as { error?: { detail?: string } }).error?.detail ??
            'No se pudieron cargar las solicitudes de traspaso.',
          'Cerrar',
          { duration: 4000 },
        );
      },
    });
  }

  abrirDecision(s: SolicitudTraspasoItem): void {
    if (!s || s.id == null || isNaN(Number(s.id))) {
      this.snack.open('No se pudo identificar la solicitud de traspaso.', 'Cerrar', { duration: 4000 });
      return;
    }
    const ref = this.dialog.open(DecidirTraspasoDialog, {
      data: s,
      width: '640px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.cargar();
    });
  }
}
