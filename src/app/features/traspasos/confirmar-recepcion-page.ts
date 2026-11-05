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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { ROL } from '../../core/models/usuario.model';
import { AuthService } from '../../core/auth/auth.service';
import { TraspasosService } from './traspasos.service';
import { SolicitudTraspasoItem, EstadoTraspaso } from '../../core/models/traspaso.model';
import { ConfirmarRecepcionDialog } from './confirmar-recepcion-dialog';

/** CU27 — Confirmar recepción de traspaso.
 *  El Encargado de sucursal de destino confirma la recepción de un traspaso en tránsito,
 *  incrementa el inventario del destino y actualiza el estado de la solicitud.
 */
@Component({
  selector: 'app-confirmar-recepcion-page',
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
    MatDividerModule,
  ],
  templateUrl: './confirmar-recepcion-page.html',
  styleUrl: './confirmar-recepcion-page.scss',
})
export class ConfirmarRecepcionPage implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly esEncargado = computed(() =>
    this.auth.hasRole(ROL.ENCARGADO)
  );

  // Columnas de la tabla Material para listado de solicitudes
  protected readonly columnas = [
    'codigo',
    'fecha',
    'variante',
    'origen',
    'destino',
    'cantidad_despachada',
    'estado',
    'acciones',
  ];

  protected readonly cargando = signal(false);
  protected readonly solicitudes = signal<SolicitudTraspasoItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly size = signal(10);
  protected readonly estadoFiltrado = signal<string | null>(null);

  protected readonly sinResultados = computed(
    () => !this.cargando() && this.solicitudes().length === 0,
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarEstado(valor: string | null): void {
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
    // Solicitamos con un tamaño mayor para asegurar capturar los traspasos destino de la sucursal
    this.service.listar(null, 1, 100).subscribe({
      next: (res) => {
        const usuario = this.auth.user();
        const sucursalId = usuario?.sucursal_id ?? null;
        console.log('CU27 - Usuario actual:', usuario, 'Sucursal ID:', sucursalId, 'Items recibidos:', res.items);

        // Estados válidos para recibir traspasos
        const estadosValidos: string[] = ['EN_TRANSITO', 'ENVIADO', 'RECEPCION_PARCIAL', 'APROBADO'];

        const solicitudesUsuario = (res.items ?? []).filter((s) => {
          // Filtrar por sucursal destino (si el usuario tiene sucursal asignada)
          const matchDestino = sucursalId == null || Number(s.destino_id) === Number(sucursalId);
          
          // Filtrar por estado
          const estadoFiltro = this.estadoFiltrado();
          const matchEstado = estadoFiltro
            ? s.estado === estadoFiltro
            : estadosValidos.includes(s.estado);

          return matchDestino && matchEstado;
        });

        this.solicitudes.set(solicitudesUsuario);
        this.total.set(solicitudesUsuario.length);
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

  /** Abre el detalle y el formulario de confirmación de recepción. */
  abrirConfirmacion(s: SolicitudTraspasoItem): void {
    if (!s || s.id == null || isNaN(Number(s.id))) {
      this.snack.open('No se pudo identificar la solicitud de traspaso.', 'Cerrar', { duration: 4000 });
      return;
    }

    const ref = this.dialog.open(ConfirmarRecepcionDialog, {
      data: { solicitud: s },
      width: '900px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((res: unknown) => {
      if (!res) return;
      this.cargar();
    });
  }
}