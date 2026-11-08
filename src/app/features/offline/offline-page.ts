import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, fromEvent, startWith, timer } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ClienteBuscado } from '../../core/models/venta.model';
import {
  CopiaOffline,
  ItemOfflineDto,
  OperacionPendiente,
  VarianteOfflineVista,
} from '../../core/models/offline.model';
import { SucursalOpcion } from '../../core/models/sucursal.model';
import { filtrarCatalogoOffline } from '../../core/offline/offline-catalog.util';
import { OfflineDataService } from '../../core/offline/offline-data.service';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';
import { PushService } from '../../core/offline/push.service';
import { TarjetaService } from '../../core/offline/tarjeta.service';
import { CajaService } from '../caja/caja.service';
import { SucursalesService } from '../sucursales/sucursales.service';

interface ItemPedidoOffline {
  variante_id: number;
  cantidad: number;
  producto: string;
  talla: string;
  color: string;
}

@Component({
  selector: 'app-offline-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './offline-page.html',
  styleUrl: './offline-page.scss',
})
export class OfflinePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly offline = inject(OfflineDataService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly caja = inject(CajaService);
  private readonly snack = inject(MatSnackBar);
  protected readonly offlineSync = inject(OfflineSyncService);
  protected readonly push = inject(PushService);
  private readonly tarjetaService = inject(TarjetaService);

  protected readonly sucursales = signal<SucursalOpcion[]>([]);
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly copia = signal<CopiaOffline | null>(null);
  protected readonly cargando = signal(true);
  protected readonly sincronizando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  protected readonly online = signal(false);
  protected readonly qCtrl = new FormControl('', { nonNullable: true });
  protected readonly tallaCtrl = new FormControl('', { nonNullable: true });
  protected readonly colorCtrl = new FormControl('', { nonNullable: true });
  private readonly q = signal('');
  private readonly talla = signal('');
  private readonly color = signal('');

  protected readonly variantes = computed(() =>
    filtrarCatalogoOffline(this.copia(), this.q(), this.talla(), this.color()),
  );
  protected readonly tallas = computed(() =>
    [...new Set(this.copia()?.productos.flatMap((p) => p.variantes.map((v) => v.talla)) ?? [])].sort(),
  );
  protected readonly colores = computed(() =>
    [...new Set(this.copia()?.productos.flatMap((p) => p.variantes.map((v) => v.color)) ?? [])].sort(),
  );

  // --------------------------------------------------------------------------- #
  //  CU11/CU12 — Armar un pedido local (reserva o venta) sin conexión
  // --------------------------------------------------------------------------- #
  protected readonly esCliente = computed(() => this.auth.user()?.rol === 'Cliente');
  protected readonly esCajero = computed(() => this.auth.user()?.rol === 'Cajero');
  protected readonly puedeArmarPedido = computed(() => this.esCliente() || this.esCajero());
  protected readonly itemsPedido = signal<ItemPedidoOffline[]>([]);
  protected readonly mostrarFormReserva = signal(false);
  protected readonly mostrarFormVenta = signal(false);
  protected readonly mostrarFormVentaEfectivo = signal(false);
  protected readonly tieneTarjeta = signal(false);
  protected readonly mensajePedido = signal('');

  protected readonly reservaForm = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    hora: ['', Validators.required],
    duracion_minutos: [30, Validators.required],
  });

  protected readonly ventaForm = this.fb.nonNullable.group({
    direccion_entrega: ['', [Validators.required, Validators.minLength(5)]],
    referencia_entrega: [''],
  });

  // --- CU12 (Cajero) — venta de contado en efectivo, cliente presencial --- //
  // La búsqueda se hace contra los clientes ya cacheados en la copia offline
  // (ver `clientes` en DatosOffline): sin esto no funcionaría sin conexión.
  protected readonly clienteQ = new FormControl('', { nonNullable: true });
  private readonly clienteQTexto = toSignal(
    this.clienteQ.valueChanges.pipe(startWith(''), debounceTime(150), distinctUntilChanged()),
    { initialValue: '' },
  );
  protected readonly clienteResultados = computed<ClienteBuscado[]>(() => {
    const clientes = this.copia()?.clientes ?? [];
    const q = this.clienteQTexto().trim().toLowerCase();
    const filtrados = !q
      ? clientes
      : clientes.filter(
          (c) =>
            `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.telefono ?? '').toLowerCase().includes(q),
        );
    return filtrados.slice(0, 15);
  });
  protected readonly clienteSeleccionado = signal<ClienteBuscado | null>(null);
  protected readonly mostrarFormNuevoCliente = signal(false);
  protected readonly formNuevoCliente = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: Validators.required }),
    apellido: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    telefono: new FormControl(''),
  });
  protected readonly montoRecibidoCtrl = new FormControl<number | null>(null);
  protected readonly registrandoCliente = signal(false);

  protected readonly totalPedido = computed(() =>
    this.itemsPedido().reduce((acc, i) => {
      const v = this.variantes().find((vv) => vv.id === i.variante_id);
      return acc + (v?.precio ?? 0) * i.cantidad;
    }, 0),
  );
  protected readonly vueltoEfectivo = computed(() => {
    const recibido = this.montoRecibidoCtrl.value;
    if (recibido == null) return null;
    const v = recibido - this.totalPedido();
    return v >= 0 ? v : null;
  });

  elegirCliente(c: ClienteBuscado): void {
    this.clienteSeleccionado.set(c);
    this.mostrarFormNuevoCliente.set(false);
  }

  quitarCliente(): void {
    this.clienteSeleccionado.set(null);
    this.clienteQ.setValue('');
  }

  registrarClienteNuevo(): void {
    if (this.formNuevoCliente.invalid) {
      this.formNuevoCliente.markAllAsTouched();
      return;
    }
    this.registrandoCliente.set(true);
    this.caja.registrarClienteRapido(this.formNuevoCliente.getRawValue()).subscribe({
      next: (c) => {
        this.registrandoCliente.set(false);
        this.mostrarFormNuevoCliente.set(false);
        this.formNuevoCliente.reset();
        this.elegirCliente(c);
        // Para que quede buscable de inmediato si el cajero vacía el pedido
        // y arma otra venta en efectivo antes de refrescar el catálogo offline.
        const copia = this.copia();
        if (copia) {
          this.copia.set({
            ...copia,
            clientes: [...copia.clientes, { ...c }],
            total_clientes: copia.total_clientes + 1,
          });
        }
        this.snack.open('Cliente registrado.', 'OK', { duration: 2000 });
      },
      error: (e: unknown) => {
        this.registrandoCliente.set(false);
        this.snack.open(
          (e as { error?: { detail?: string } }).error?.detail ?? 'No se pudo registrar el cliente.',
          'Cerrar',
          { duration: 4000 },
        );
      },
    });
  }

  protected async confirmarVentaEfectivoOffline(): Promise<void> {
    const cliente = this.clienteSeleccionado();
    const recibido = this.montoRecibidoCtrl.value;
    if (!cliente || !this.itemsPedido().length || recibido == null) return;
    if (recibido < this.totalPedido()) {
      this.snack.open('El monto recibido es menor al total.', 'Cerrar', { duration: 3000 });
      return;
    }
    await this.offlineSync.registrarVentaEfectivo(
      {
        cliente_id: cliente.id,
        items: this.itemsDto(),
        monto_recibido: recibido,
      },
      `Venta en efectivo a ${cliente.nombre} ${cliente.apellido} — ${this.itemsPedido().length} prenda(s)`,
    );
    this.mensajePedido.set(
      'Venta guardada en este dispositivo. Se confirmará apenas vuelva la conexión.',
    );
    this.vaciarPedido();
    this.quitarCliente();
    this.montoRecibidoCtrl.setValue(null);
  }

  ngOnInit(): void {
    const usuario = this.auth.user();
    this.sucursalId.set(usuario?.sucursal_id ?? null);
    fromEvent(window, 'online').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.comprobarServidor();
      void this.sincronizarPendientes();
    });
    fromEvent(window, 'offline').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.online.set(false));
    timer(0, 10000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.comprobarServidor();
    });
    this.qCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.q.set(v));
    this.tallaCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.talla.set(v));
    this.colorCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.color.set(v));
    this.cargarLocal();
    if (this.esCliente()) {
      void this.offlineSync.cargar();
      this.tarjetaService.estado().then((e) => this.tieneTarjeta.set(e.tiene_tarjeta_guardada)).catch(() => {});
    } else if (this.esCajero()) {
      void this.offlineSync.cargar();
    }
  }

  protected agregarAlPedido(v: VarianteOfflineVista): void {
    const actuales = this.itemsPedido();
    const existente = actuales.find((i) => i.variante_id === v.id);
    if (existente) {
      existente.cantidad++;
      this.itemsPedido.set([...actuales]);
      return;
    }
    this.itemsPedido.set([
      ...actuales,
      { variante_id: v.id, cantidad: 1, producto: v.producto_nombre, talla: v.talla, color: v.color },
    ]);
  }

  protected quitarDelPedido(varianteId: number): void {
    this.itemsPedido.set(this.itemsPedido().filter((i) => i.variante_id !== varianteId));
  }

  protected vaciarPedido(): void {
    this.itemsPedido.set([]);
    this.mostrarFormReserva.set(false);
    this.mostrarFormVenta.set(false);
    this.mostrarFormVentaEfectivo.set(false);
  }

  private itemsDto(): ItemOfflineDto[] {
    return this.itemsPedido().map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad }));
  }

  protected async confirmarReservaOffline(): Promise<void> {
    if (this.reservaForm.invalid || !this.itemsPedido().length || this.sucursalId() == null) {
      this.reservaForm.markAllAsTouched();
      return;
    }
    const v = this.reservaForm.getRawValue();
    await this.offlineSync.registrarReserva(
      {
        sucursal_id: this.sucursalId()!,
        fecha: v.fecha,
        hora_inicio: `${v.hora}:00`,
        duracion_minutos: Number(v.duracion_minutos),
        items: this.itemsDto(),
      },
      `Reserva de ${this.itemsPedido().length} prenda(s) para el ${v.fecha} ${v.hora}`,
    );
    this.mensajePedido.set('Reserva guardada en este dispositivo. Se confirmará apenas vuelva la conexión.');
    this.vaciarPedido();
    this.reservaForm.reset({ duracion_minutos: 30 });
  }

  protected async confirmarVentaOffline(): Promise<void> {
    if (this.ventaForm.invalid || !this.itemsPedido().length) {
      this.ventaForm.markAllAsTouched();
      return;
    }
    const v = this.ventaForm.getRawValue();
    await this.offlineSync.registrarVenta(
      {
        items: this.itemsDto(),
        direccion_entrega: v.direccion_entrega,
        referencia_entrega: v.referencia_entrega || null,
      },
      `Compra de ${this.itemsPedido().length} prenda(s)`,
    );
    this.mensajePedido.set(
      'Compra guardada en este dispositivo. Se cobrará a tu tarjeta guardada apenas vuelva la conexión.',
    );
    this.vaciarPedido();
    this.ventaForm.reset();
  }

  // --------------------------------------------------------------------------- #
  //  CU13/CU14/CU15 — Ver, sincronizar y ver el resultado de lo pendiente
  // --------------------------------------------------------------------------- #
  protected readonly sincronizandoPendientes = signal(false);

  protected async sincronizarPendientes(): Promise<void> {
    if (!this.puedeArmarPedido() || this.sincronizandoPendientes()) return;
    this.sincronizandoPendientes.set(true);
    try {
      const { confirmadas, rechazadas } = await this.offlineSync.sincronizar();
      if (confirmadas || rechazadas) {
        this.mensajePedido.set(
          `Sincronización: ${confirmadas} confirmada(s), ${rechazadas} rechazada(s).`,
        );
      }
    } finally {
      this.sincronizandoPendientes.set(false);
    }
  }

  protected etiquetaOperacion(op: OperacionPendiente): string {
    switch (op.estado) {
      case 'LOCAL':
        return 'Pendiente de enviar';
      case 'ENVIANDO':
        return 'Sincronizando…';
      case 'CONFIRMADO':
        return 'Confirmada';
      case 'RECHAZADO':
        return op.motivo_rechazo ?? 'Rechazada';
    }
  }

  protected async habilitarPush(): Promise<void> {
    const ok = await this.push.habilitar();
    this.mensajePedido.set(
      ok ? 'Notificaciones activadas.' : 'No se pudieron activar las notificaciones.',
    );
  }

  protected cambiarSucursal(id: number): void {
    this.sucursalId.set(id);
    this.error.set('');
    this.cargarLocal(id);
  }

  protected sincronizar(): void {
    const sucursalId = this.sucursalId();
    if (sucursalId == null || this.sincronizando()) return;
    if (!navigator.onLine) {
      this.error.set('No hay conexión. Se conserva la última copia válida.');
      return;
    }
    this.sincronizando.set(true);
    this.error.set('');
    this.exito.set('');
    this.offline.preparar(sucursalId).then((copia) => {
      this.online.set(true);
      this.copia.set(copia);
      this.exito.set(`Datos preparados: ${copia.total_productos} productos y ${copia.total_variantes} variantes.`);
    }).catch((err) => {
      this.online.set(false);
      this.error.set(this.mensajeError(err));
    }).finally(() => this.sincronizando.set(false));
  }

  private cargarSucursales(): void {
    this.sucursalesService.opciones().subscribe({
      next: (items) => {
        this.online.set(true);
        this.sucursales.set(items);
        if (this.sucursalId() == null && items.length === 1) {
          this.cambiarSucursal(items[0].id);
        }
      },
      error: () => {
        this.online.set(false);
        if (!this.copia()) this.error.set('No se pudieron consultar las sucursales. Puede reintentar cuando tenga conexión.');
      },
    });
  }

  private async comprobarServidor(): Promise<void> {
    const estabaDisponible = this.online();
    const disponible = await this.offline.servidorDisponible();
    this.online.set(disponible);
    if (disponible && !estabaDisponible) this.cargarSucursales();
  }

  private async cargarLocal(sucursalId?: number): Promise<void> {
    const empresaId = this.auth.user()?.empresa_id;
    if (empresaId == null) {
      this.cargando.set(false);
      this.error.set('El usuario no está asociado a una empresa.');
      return;
    }
    this.cargando.set(true);
    try {
      if (sucursalId != null) {
        this.copia.set(await this.offline.obtener(empresaId, sucursalId));
      } else {
        const copias = await this.offline.listarEmpresa(empresaId);
        const seleccionada = copias[0] ?? null;
        this.copia.set(seleccionada);
        if (seleccionada) this.sucursalId.set(seleccionada.sucursal_id);
      }
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  private mensajeError(err: any): string {
    if (typeof err?.error?.detail === 'string') return err.error.detail;
    if (typeof err?.message === 'string') return err.message;
    return 'No se pudo preparar el catálogo. La copia anterior no fue modificada.';
  }
}
