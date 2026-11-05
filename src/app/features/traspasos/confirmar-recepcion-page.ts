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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TraspasosService } from './traspasos.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmarRecepcionDialog } from './confirmar-recepcion-dialog';
import { SolicitudTraspasoItem, EstadoTraspaso } from '../../core/models/traspaso.model';

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
    MatTooltipModule,
  ],
  templateUrl: './confirmar-recepcion-page.html',
  styleUrl: './confirmar-recepcion-page.scss',
})
export class ConfirmarRecepcionPage implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly columnas: string[] = ['codigo', 'fecha', 'variante', 'destino', 'solicitante', 'estado', 'acciones'];

  protected readonly cargando = signal(false);
  protected readonly solicitudes = signal<SolicitudTraspasoItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly size = signal(10);
  protected readonly sinResultados = computed(
    () => !this.cargando() && this.solicitudes().length === 0,
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiarEstado(valor: EstadoTraspaso | null): void {
    this.page.set(0);
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex);
    this.size.set(ev.pageSize);
    this.cargar();
  }

  private cargar(): void {
    const user = this.auth.user();
    const sucursalDestinoId = user?.sucursal_id ?? null;

    this.cargando.set(true);
    this.service.listar('EN_TRANSITO', this.page() + 1, this.size()).subscribe({
      next: (res) => {
        const filtrados = res.items.filter(
          (s) => s.destino_id === sucursalDestinoId
        );
        this.solicitudes.set(filtrados);
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

  confirmarRecepcion(s: SolicitudTraspasoItem): void {
    if (!s || s.id == null || isNaN(Number(s.id))) {
      this.snack.open('No se pudo identificar la solicitud de traspaso.', 'Cerrar', { duration: 4000 });
      return;
    }
    const ref = this.dialog.open(ConfirmarRecepcionDialog, {
      data: s,
      width: '500px',
    });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.cargar();
    });
  }
}