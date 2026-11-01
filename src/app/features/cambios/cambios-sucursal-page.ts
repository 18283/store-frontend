import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';

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

import { AuthService } from '../../core/auth/auth.service';
import { ROL } from '../../core/models/usuario.model';
import { Solicitud } from '../../core/models/cambio.model';
import { CambiosService } from './cambios.service';
import { ResolverDialog } from './resolver-dialog';

const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITADO: 'Solicitado',
  RECIBIDO: 'Recibido',
  RESUELTO: 'Resuelto',
  CANCELADO: 'Cancelado',
};

/** CU19/CU20/CU21/CU23 — gestión de cambios y devoluciones por sucursal. */
@Component({
  selector: 'app-cambios-sucursal-page',
  imports: [
    DatePipe,
    DecimalPipe,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './cambios-sucursal-page.html',
  styleUrl: './cambios-sucursal-page.scss',
})
export class CambiosSucursalPage implements OnInit {
  private readonly service = inject(CambiosService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** El admin ve todas las sucursales de la empresa; encargado/cajero solo la suya. */
  protected readonly esAdmin = computed(() => this.auth.hasRole(ROL.ADMIN));

  protected readonly columnas = computed(() =>
    this.esAdmin()
      ? ['fecha', 'tipo', 'cliente', 'prenda', 'sucursal', 'estado', 'acciones']
      : ['fecha', 'tipo', 'cliente', 'prenda', 'estado', 'acciones'],
  );

  protected readonly cargando = signal(false);
  protected readonly procesando = signal<number | null>(null);
  protected readonly solicitudes = signal<Solicitud[]>([]);
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

  etiquetaEstado(estado: string): string {
    return ETIQUETA_ESTADO[estado] ?? estado;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.service
      .listarSucursal(this.estado(), this.page() + 1, this.size())
      .subscribe({
        next: (res) => {
          this.solicitudes.set(res.items);
          this.total.set(res.total);
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.cargando.set(false);
          this.snack.open(
            (e as { error?: { detail?: string } }).error?.detail ??
              'No se pudieron cargar las solicitudes.',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
  }

  recepcionar(s: Solicitud): void {
    this.procesando.set(s.id);
    this.service.recepcionar(s.id).subscribe({
      next: (actualizada) => {
        this.solicitudes.update((lista) =>
          lista.map((x) => (x.id === actualizada.id ? actualizada : x)),
        );
        this.procesando.set(null);
        this.snack.open('Prenda recepcionada. Ya se puede resolver.', 'OK', { duration: 3000 });
      },
      error: (e: unknown) => {
        this.procesando.set(null);
        this.snack.open(
          (e as { error?: { detail?: string } }).error?.detail ??
            'No se pudo recepcionar la solicitud.',
          'Cerrar',
          { duration: 4000 },
        );
      },
    });
  }

  resolver(s: Solicitud): void {
    const ref = this.dialog.open(ResolverDialog, { data: s });
    ref.afterClosed().subscribe((actualizada) => {
      if (!actualizada) return;
      this.solicitudes.update((lista) =>
        lista.map((x) => (x.id === actualizada.id ? actualizada : x)),
      );
      if (actualizada.estado === 'RESUELTO') {
        this.snack.open('Solicitud resuelta.', 'OK', { duration: 3000 });
      }
    });
  }

  verNota(s: Solicitud): void {
    void this.router.navigate(['nota', s.id], { relativeTo: this.route });
  }
}
