import { Component, OnInit, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TraspasosService } from './traspasos.service';
import { SolicitudTraspasoItem } from '../../core/models/traspaso.model';

@Component({
  selector: 'app-seguimiento-traspaso-page',
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    DatePipe,
  ],
  templateUrl: './seguimiento-traspaso-page.html',
  styleUrl: './seguimiento-traspaso-page.scss',
})
export class SeguimientoTraspasoPage implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly snack = inject(MatSnackBar);

  protected readonly displayedColumns: string[] = [
    'codigo',
    'fecha_solicitud',
    'variante',
    'origen',
    'destino',
    'cantidad',
    'estado'
  ];

  codigoCtrl = new FormControl('', { nonNullable: true });

  // Lista original y lista filtrada
  private todosLosTraspasos = signal<SolicitudTraspasoItem[]>([]);
  dataSource = signal<SolicitudTraspasoItem[]>([]);
  isLoading = signal(false);

  ngOnInit(): void {
    this.cargarDatos();

    // Escuchamos el buscador SIN usar takeUntilDestroyed (que causaba el error)
    this.codigoCtrl.valueChanges.subscribe((texto) => {
      this.filtrar(texto);
    });
  }

  private cargarDatos(): void {
    this.isLoading.set(true);
    this.service.listar().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res.items || []);
        this.todosLosTraspasos.set(items);
        this.dataSource.set(items);
        this.isLoading.set(false);
      },
      error: (e: any) => {
        this.isLoading.set(false);
        this.snack.open('Error al cargar las solicitudes', 'Cerrar', { duration: 4000 });
      },
    });
  }

  private filtrar(texto: string): void {
    const busqueda = texto.trim().toLowerCase();

    if (!busqueda) {
      this.dataSource.set(this.todosLosTraspasos());
      return;
    }

    const filtrados = this.todosLosTraspasos().filter(
      (t) => t.codigo?.toLowerCase().includes(busqueda) ||
        t.variante?.toLowerCase().includes(busqueda)
    );
    this.dataSource.set(filtrados);
  }
}