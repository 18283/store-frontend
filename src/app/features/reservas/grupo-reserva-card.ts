import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Reserva } from '../../core/models/reserva.model';
import { NotificacionService } from '../../core/services/notificacion.service';
import { GrupoBolsa, ReservaBolsaService } from './reserva-bolsa.service';
import { ReservasService } from './reservas.service';

function fechaISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** CU16 — las prendas de "Mi reserva" que van a una misma sucursal + turno para reservarlas. */
@Component({
  selector: 'app-grupo-reserva-card',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <section class="grupo">
      <header>
        <mat-icon>store</mat-icon>
        <div>
          <strong>{{ grupo().sucursal }}</strong>
          <span class="ciudad">{{ grupo().ciudad }}</span>
        </div>
      </header>

      <ul class="items">
        @for (item of grupo().items; track item.varianteId) {
          <li>
            @if (item.imagenUrl) {
              <img [src]="item.imagenUrl" [alt]="item.productoNombre" />
            }
            <div class="info">
              <strong>{{ item.productoNombre }}</strong>
              <span class="detalle">{{ item.talla }} · {{ item.color }}</span>
            </div>
            <div class="cantidad">
              <button
                mat-icon-button
                [disabled]="item.cantidad <= 1"
                (click)="bolsa.cambiarCantidad(item.varianteId, item.sucursalId, item.cantidad - 1)"
                aria-label="Menos"
              >
                <mat-icon>remove</mat-icon>
              </button>
              <span>{{ item.cantidad }}</span>
              <button
                mat-icon-button
                [disabled]="item.cantidad >= item.maxDisponible"
                (click)="bolsa.cambiarCantidad(item.varianteId, item.sucursalId, item.cantidad + 1)"
                aria-label="Más"
              >
                <mat-icon>add</mat-icon>
              </button>
            </div>
            <button
              mat-icon-button
              (click)="bolsa.quitar(item.varianteId, item.sucursalId)"
              aria-label="Quitar"
            >
              <mat-icon>delete_outline</mat-icon>
            </button>
          </li>
        }
      </ul>

      <div class="turno">
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            [min]="hoy"
            [formControl]="fecha"
            (dateChange)="cargarSlots()"
            readonly
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Duración</mat-label>
          <mat-select [formControl]="duracion" (selectionChange)="cargarSlots()">
            <mat-option [value]="30">30 minutos</mat-option>
            <mat-option [value]="60">1 hora</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="slots">
        <span class="etiqueta">Horario</span>
        @if (cargandoSlots()) {
          <p class="muted">Consultando turnos libres…</p>
        } @else if (slots().length > 0) {
          <div class="opciones-slot">
            @for (s of slots(); track s) {
              <button type="button" class="pill" [class.sel]="horaSel() === s" (click)="horaSel.set(s)">
                {{ s.slice(0, 5) }}
              </button>
            }
          </div>
        } @else {
          <p class="muted">
            <mat-icon class="mini">event_busy</mat-icon>
            No hay turnos libres ese día. Probá otra fecha.
          </p>
        }
      </div>

      @if (error()) {
        <p class="err">{{ error() }}</p>
      }

      <button
        mat-flat-button
        class="btn-primary"
        (click)="confirmar()"
        [disabled]="!horaSel() || fecha.invalid || guardando()"
      >
        @if (guardando()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>event_available</mat-icon>
        }
        Confirmar reserva en esta sucursal
      </button>
    </section>
  `,
  styles: `
    .grupo { background: #fff; border: 1px solid #eef2f7; border-radius: 12px; padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: .9rem; }
    header { display: flex; align-items: center; gap: .6rem; color: var(--fs-green-700); }
    header strong { display: block; color: #0f172a; }
    .ciudad { color: #64748b; font-size: .82rem; }
    .items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .5rem; border-top: 1px solid #eef2f7; padding-top: .6rem; }
    .items li { display: flex; align-items: center; gap: .75rem; }
    .items img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
    .info { flex: 1; min-width: 0; }
    .info strong { display: block; font-size: .92rem; color: #0f172a; }
    .detalle { color: #64748b; font-size: .82rem; }
    .cantidad { display: flex; align-items: center; gap: .1rem; }
    .cantidad span { min-width: 1.4rem; text-align: center; }
    .turno { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    mat-form-field { width: 100%; }
    .etiqueta { display: block; font-size: .8rem; font-weight: 600; color: #334155; margin-bottom: .5rem; }
    .opciones-slot { display: flex; gap: .5rem; flex-wrap: wrap; max-height: 150px; overflow-y: auto; }
    .pill { min-width: 64px; height: 38px; padding: 0 .8rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #334155; font-size: .88rem; cursor: pointer; }
    .pill:hover { border-color: var(--fs-green-500); }
    .pill.sel { border-color: var(--fs-green-700); background: var(--fs-green-700); color: #fff; }
    .muted { color: #94a3b8; font-size: .88rem; margin: 0; display: flex; align-items: center; gap: .3rem; }
    .mini { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .err { color: #b3261e; font-size: .85rem; margin: 0; }
    .btn-primary { background: var(--fs-green-700); color: #fff; align-self: flex-start; }
    @media (max-width: 480px) { .turno { grid-template-columns: 1fr; } }
  `,
})
export class GrupoReservaCard implements OnInit {
  readonly grupo = input.required<GrupoBolsa>();
  readonly reservada = output<Reserva>();

  protected readonly bolsa = inject(ReservaBolsaService);
  private readonly reservasSvc = inject(ReservasService);
  private readonly notificacionSvc = inject(NotificacionService);

  protected readonly hoy = new Date();
  protected readonly fecha = new FormControl<Date>(this.hoy, {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly duracion = new FormControl(30, { nonNullable: true });

  protected readonly slots = signal<string[]>([]);
  protected readonly horaSel = signal<string | null>(null);
  protected readonly cargandoSlots = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarSlots();
  }

  cargarSlots(): void {
    this.horaSel.set(null);
    if (!this.fecha.value) return;
    this.cargandoSlots.set(true);
    this.reservasSvc
      .disponibilidad(this.grupo().sucursalId, fechaISO(this.fecha.value), this.duracion.value)
      .subscribe({
        next: (res) => {
          this.slots.set(res.slots);
          this.cargandoSlots.set(false);
        },
        error: () => {
          this.slots.set([]);
          this.cargandoSlots.set(false);
        },
      });
  }

  async confirmar(): Promise<void> {
    const hora = this.horaSel();
    if (!hora || this.fecha.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    const grupo = this.grupo();
    try {
      const res = await firstValueFrom(
        this.reservasSvc.crear({
          sucursal_id: grupo.sucursalId,
          fecha: fechaISO(this.fecha.value),
          hora_inicio: hora.slice(0, 5),
          duracion_minutos: this.duracion.value,
          items: grupo.items.map((i) => ({ variante_id: i.varianteId, cantidad: i.cantidad })),
        }),
      );
      this.bolsa.quitarSucursal(grupo.sucursalId);
      // CU35 — el backend crea la notificación de reserva al crearla;
      // refrescamos la campanita ahora para que aparezca al instante
      // en vez de esperar al polling de 30s.
      this.notificacionSvc
        .cargarNotificaciones(1, 20)
        .subscribe({ error: () => {} });
      this.reservada.emit(res);
    } catch (e: unknown) {
      this.error.set(
        (e as { error?: { detail?: string } }).error?.detail ?? 'No se pudo crear la reserva.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
