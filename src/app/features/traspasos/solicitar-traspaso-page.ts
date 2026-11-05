import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../core/auth/auth.service';
import { ROL } from '../../core/models/usuario.model';
import {
  OpcionesTraspaso,
  SolicitudTraspasoOut,
  VarianteConStock,
} from '../../core/models/traspaso.model';
import { ConfirmarStockDestinoData, ConfirmarStockDialog } from './confirmar-stock-dialog';
import { TraspasosService } from './traspasos.service';

/** Variante con todos sus orígenes con stock (agrupación de la respuesta). */
interface VarianteAgrupada {
  variante_id: number;
  producto: string;
  sku: string | null;
  talla: string | null;
  color: string | null;
  origenes: VarianteConStock[];
}

function extraerMensaje(e: unknown): string {
  const err = e as {
    error?: {
      detail?: unknown;
      mensaje?: unknown;
    };
  };
  const detalle = err.error?.detail;
  if (typeof detalle === 'string' && detalle.trim()) return detalle;
  if (Array.isArray(detalle)) {
    const partes = detalle
      .map((d) =>
        typeof d === 'object' && d !== null && 'msg' in d
          ? String((d as { msg: unknown }).msg)
          : null,
      )
      .filter((x): x is string => x != null);
    if (partes.length) return partes.join(' ');
  }
  if (typeof err.error?.mensaje === 'string' && err.error.mensaje.trim()) {
    return err.error.mensaje;
  }
  return 'No se pudo completar la operación. Intentá de nuevo.';
}

function pideConfirmacionStock(e: unknown): boolean {
  const err = e as {
    error?: { requiere_confirmacion?: unknown; codigo?: unknown };
  };
  return (
    err.error?.requiere_confirmacion === true || err.error?.codigo === 'STOCK_DESTINO_SUFICIENTE'
  );
}

/**
 * CU24 — Solicitar traspaso de prenda.
 * Actores: Cliente (elige destino) y Encargado de sucursal (destino fijo = su
 * sucursal). Mensajes según el diagrama de robustez: opciones → búsqueda de
 * variantes con stock → origen/destino/cantidad → solicitud PENDIENTE.
 */
@Component({
  selector: 'app-solicitar-traspaso-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './solicitar-traspaso-page.html',
  styleUrl: './solicitar-traspaso-page.scss',
})
export class SolicitarTraspasoPage implements OnInit {
  private readonly service = inject(TraspasosService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esEncargado = computed(() => this.auth.hasRole(ROL.ENCARGADO));

  // Mensajes 2-9: opciones del formulario.
  protected readonly cargandoOpciones = signal(true);
  protected readonly errorOpciones = signal<string | null>(null);
  protected readonly opciones = signal<OpcionesTraspaso | null>(null);

  // Mensajes 12-20: búsqueda de variantes con stock.
  protected readonly qCtrl = new FormControl('', { nonNullable: true });
  protected readonly buscando = signal(false);
  protected readonly busco = signal(false);
  protected readonly resultados = signal<VarianteConStock[]>([]);
  protected readonly errorBusqueda = signal<string | null>(null);

  // Mensajes 21-33: origen, destino y cantidad.
  protected readonly varianteId = signal<number | null>(null);
  protected readonly origenId = signal<number | null>(null);
  protected readonly destinoId = signal<number | null>(null);
  protected readonly cantidad = signal(1);
  protected readonly motivo = signal('');

  // Mensajes 34-40: registro y resumen.
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<SolicitudTraspasoOut | null>(null);

  private peticion = 0;

  protected readonly variantes = computed<VarianteAgrupada[]>(() => {
    const mapa = new Map<number, VarianteAgrupada>();
    for (const fila of this.resultados()) {
      let v = mapa.get(fila.variante_id);
      if (!v) {
        v = {
          variante_id: fila.variante_id,
          producto: fila.producto,
          sku: fila.sku,
          talla: fila.talla,
          color: fila.color,
          origenes: [],
        };
        mapa.set(fila.variante_id, v);
      }
      v.origenes.push(fila);
    }
    return [...mapa.values()].sort((a, b) => a.producto.localeCompare(b.producto));
  });

  protected readonly variante = computed(
    () => this.variantes().find((v) => v.variante_id === this.varianteId()) ?? null,
  );

  protected readonly origen = computed(
    () => this.variante()?.origenes.find((o) => o.origen_id === this.origenId()) ?? null,
  );

  protected readonly maxCantidad = computed(() => this.origen()?.cantidad_disponible ?? 0);

  /** Mensaje 25: el Encargado solo puede fijar su propia sucursal. */
  protected readonly destinoPermitidoId = computed(
    () => this.opciones()?.destino_permitido_id ?? null,
  );

  protected readonly destinos = computed(() => {
    const op = this.opciones();
    if (!op) return [];
    const fijo = op.destino_permitido_id;
    return op.sucursales.filter((s) => s.id !== this.origenId() && (fijo == null || s.id === fijo));
  });

  protected readonly destino = computed(
    () => this.opciones()?.sucursales.find((s) => s.id === this.destinoId()) ?? null,
  );

  protected readonly origenesDisponibles = computed(() => {
    const v = this.variante();
    if (!v) return [];
    const fijo = this.destinoPermitidoId();
    if (fijo != null) {
      return v.origenes.filter((o) => o.origen_id !== fijo);
    }
    return v.origenes;
  });

  /** Mensaje 32-33: stock que ya existe en la sucursal destino. */
  protected readonly stockDestino = computed(() => {
    const destino = this.destinoId();
    if (destino == null) return 0;
    return this.variante()?.origenes.find((o) => o.origen_id === destino)?.cantidad_disponible ?? 0;
  });

  protected readonly puedeEnviar = computed(() => {
    const origen = this.origenId();
    const destino = this.destinoId();
    const cantidad = this.cantidad();
    const fijo = this.destinoPermitidoId();
    return (
      this.varianteId() != null &&
      origen != null &&
      destino != null &&
      origen !== destino &&
      (fijo == null || destino === fijo) &&
      Number.isInteger(cantidad) &&
      cantidad >= 1 &&
      cantidad <= this.maxCantidad() &&
      !this.enviando()
    );
  });

  constructor() {
    this.qCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        const texto = valor.trim();
        if (texto.length < 2) {
          this.peticion++;
          this.resultados.set([]);
          this.busco.set(false);
          this.buscando.set(false);
          this.errorBusqueda.set(null);
          this.sincronizarSeleccion();
          return;
        }
        this.buscar(texto);
      });
  }

  ngOnInit(): void {
    this.cargarOpciones();
  }

  protected cargarOpciones(): void {
    this.cargandoOpciones.set(true);
    this.errorOpciones.set(null);
    this.service.opciones().subscribe({
      next: (op) => {
        this.opciones.set(op);
        this.cargandoOpciones.set(false);
        if (op.destino_permitido_id != null) {
          this.destinoId.set(op.destino_permitido_id);
        }
      },
      error: (e: unknown) => {
        this.cargandoOpciones.set(false);
        this.errorOpciones.set(extraerMensaje(e));
      },
    });
  }

  protected elegirVariante(v: VarianteAgrupada): void {
    if (this.varianteId() === v.variante_id) return;
    const fijo = this.destinoPermitidoId();
    const origenesValidos = fijo != null ? v.origenes.filter((o) => o.origen_id !== fijo) : v.origenes;
    const origen = [...origenesValidos].sort((a, b) => b.cantidad_disponible - a.cantidad_disponible)[0] ?? v.origenes[0];
    this.varianteId.set(v.variante_id);
    this.origenId.set(origen?.origen_id ?? null);
    this.cantidad.set(1);
    this.destinoId.set(fijo != null ? fijo : null);
    this.error.set(null);
  }

  protected cambiarOrigen(id: number): void {
    this.origenId.set(id);
    this.cantidad.set(1);
    const fijo = this.destinoPermitidoId();
    if (fijo != null) this.destinoId.set(fijo);
  }

  protected cambiarDestino(id: number): void {
    this.destinoId.set(id);
    this.error.set(null);
  }

  protected cambiarCantidad(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.trim() === '') {
      this.cantidad.set(0);
      return;
    }
    const valor = Number(input.value);
    this.cantidad.set(Number.isFinite(valor) ? Math.trunc(valor) : 0);
  }

  protected normalizarCantidad(event: Event): void {
    const input = event.target as HTMLInputElement;
    const max = Math.max(1, this.maxCantidad());
    const valor = Number(input.value);
    const cantidad = Number.isFinite(valor) ? Math.min(Math.max(1, Math.trunc(valor)), max) : 1;
    this.cantidad.set(cantidad);
    input.value = String(cantidad);
  }

  protected cambiarMotivo(event: Event): void {
    this.motivo.set((event.target as HTMLTextAreaElement).value);
  }

  protected cambiarPrenda(): void {
    this.varianteId.set(null);
    this.origenId.set(null);
    this.cantidad.set(1);
    this.destinoId.set(this.destinoPermitidoId());
    this.error.set(null);
  }

  protected async solicitar(): Promise<void> {
    if (!this.puedeEnviar()) return;
    await this.enviar(false);
  }

  protected nuevaSolicitud(): void {
    this.resultado.set(null);
    this.qCtrl.setValue('');
    this.resultados.set([]);
    this.busco.set(false);
    this.errorBusqueda.set(null);
    this.cambiarPrenda();
    this.motivo.set('');
  }

  private buscar(texto: string): void {
    const id = ++this.peticion;
    this.buscando.set(true);
    this.busco.set(true);
    this.errorBusqueda.set(null);
    this.service.buscarVariantes(texto).subscribe({
      next: (res) => {
        if (id !== this.peticion) return;
        this.resultados.set(res);
        this.buscando.set(false);
        this.sincronizarSeleccion();
      },
      error: (e: unknown) => {
        if (id !== this.peticion) return;
        this.resultados.set([]);
        this.buscando.set(false);
        this.errorBusqueda.set(extraerMensaje(e));
        this.sincronizarSeleccion();
      },
    });
  }

  private sincronizarSeleccion(): void {
    const id = this.varianteId();
    if (id == null) return;

    const variante = this.variantes().find((v) => v.variante_id === id);
    if (!variante) {
      this.varianteId.set(null);
      this.origenId.set(null);
      this.cantidad.set(1);
      this.destinoId.set(this.destinoPermitidoId());
      return;
    }

    const fijo = this.destinoPermitidoId();
    const origenesValidos = fijo != null ? variante.origenes.filter((o) => o.origen_id !== fijo) : variante.origenes;

    // Si el origen elegido ya no es válido o no tiene stock, se pasa al que más tiene.
    if (!origenesValidos.some((o) => o.origen_id === this.origenId())) {
      const origen = [...origenesValidos].sort(
        (a, b) => b.cantidad_disponible - a.cantidad_disponible,
      )[0];
      this.origenId.set(origen?.origen_id ?? null);
      this.cantidad.set(1);
      this.destinoId.set(fijo != null ? fijo : null);
      return;
    }

    const max = this.maxCantidad();
    if (this.cantidad() > max) this.cantidad.set(Math.max(1, max));
  }

  private async enviar(confirmarStockDestino: boolean): Promise<void> {
    const variante = this.varianteId();
    const origen = this.origenId();
    const destino = this.destinoId();
    if (variante == null || origen == null || destino == null) return;

    this.enviando.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.service.solicitar({
          variante_id: variante,
          origen_id: origen,
          destino_id: destino,
          cantidad: this.cantidad(),
          motivo: this.motivo().trim() || null,
          confirmar_stock_destino: confirmarStockDestino,
        }),
      );

      if (res.requiere_confirmacion && !confirmarStockDestino) {
        if (await this.confirmarStockDestino()) {
          await this.enviar(true);
        }
        return;
      }
      this.resultado.set(res);
    } catch (e: unknown) {
      if (!confirmarStockDestino && pideConfirmacionStock(e)) {
        if (await this.confirmarStockDestino()) {
          await this.enviar(true);
        }
        return;
      }
      this.error.set(extraerMensaje(e));
    } finally {
      this.enviando.set(false);
    }
  }

  private async confirmarStockDestino(): Promise<boolean> {
    const data: ConfirmarStockDestinoData = {
      destino: this.destino()?.nombre ?? 'la sucursal destino',
      cantidad: Math.max(1, this.stockDestino()),
    };
    const ref = this.dialog.open<ConfirmarStockDialog, ConfirmarStockDestinoData, boolean>(
      ConfirmarStockDialog,
      { data },
    );
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
