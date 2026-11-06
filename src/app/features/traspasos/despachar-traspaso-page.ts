import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ROL } from '../../core/models/usuario.model';
import { AuthService } from '../../core/auth/auth.service';
import { TraspasosService } from './traspasos.service';
import { SolicitudTraspasoItem, EstadoTraspaso } from '../../core/models/traspaso.model';
import { DespacharTraspasoDialog } from './despachar-traspaso-dialog';

/** CU26 — Despachar traspaso: registrar salida en tránsito sin incrementar el destino. */
@Component({
  selector: 'app-despachar-traspaso-page',
  imports: [
    DatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './despachar-traspaso-page.html',
  styles: [],
})
export class DespacharTraspasoPage implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly esEncargado = computed(() => this.auth.hasRole(ROL.ENCARGADO));

  // Columnas de la tabla Material
  protected readonly columnas = ['codigo', 'fecha', 'variante', 'destino', 'solicitante', 'estado', 'acciones'];

  // CU26 — listado de solicitudes APROBADAs de la sucursal del actor
  protected readonly cargando = signal(false);
  protected readonly solicitudes = signal<SolicitudTraspasoItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly size = signal(10);
  protected readonly estadoFiltrado = signal<EstadoTraspaso | null>(null);

  protected readonly sinResultados = computed(
    () => !this.cargando() && this.solicitudes().length === 0,
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarEstado(valor: EstadoTraspaso | null): void {
    this.estadoFiltrado.set(valor);
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
    this.service.listar('APROBADA', this.page() + 1, this.size()).subscribe({
      next: (res) => {
        const usuario = this.auth.user();
        const sucursalId = usuario?.sucursal_id ?? null;
        const solicitudesUsuario = res.items.filter((s) => s.origen_id === sucursalId);
        this.solicitudes.set(solicitudesUsuario);
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

  abrirDespacho(s: SolicitudTraspasoItem): void {
    if (!s || s.id == null || isNaN(Number(s.id))) {
      this.snack.open('No se pudo identificar la solicitud de traspaso.', 'Cerrar', { duration: 4000 });
      return;
    }
    const ref = this.dialog.open(DespacharTraspasoDialog, {
      data: s,
      width: '800px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((res: unknown) => {
      if (!res) return;
      this.cargar();
    });
  }
}