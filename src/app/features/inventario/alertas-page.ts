import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';
import { ROL } from '../../core/models/usuario.model';
import {
  AlertaReposicion,
  AlertasReposicionPage,
} from '../../core/models/inventario.model';
import { SucursalOpcion } from '../../core/models/sucursal.model';
import { SucursalesService } from '../sucursales/sucursales.service';
import { InventarioService } from './inventario.service';

function fechaISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * CU36 — Consultar alertas y sugerencias de reposición (inventario inteligente).
 *
 * Flujo normal:
 * 1) IngresarAlertasReposicion() → la página entra ya cargando.
 * 2) El backend valida sesión/cuenta/rol/empresa activa (A5 → 403).
 * 3) Encargado: el backend fuerza sucursal_permitida (A4 → 409 si no tiene).
 *    Admin: puede elegir una sucursal o todas (null).
 * 4) Filtros opcionales: sucursal_id, umbral (defecto 3), período (defecto
 *    últimos 30 días), horizonte de reposición (defecto 30 días) y q.
 * 5) GET /inventario/alertas → existencias con disponible <= umbral
 *    (AGOTADO si es 0, STOCK_BAJO en caso contrario).
 * 7/8) Rotación del período y demanda diaria = unidades / días (A2: sin
 *    historial → "Sin datos de demanda", sin predicción).
 * 9) Días de stock restantes y sugerencia "Reponer N unidades".
 * 10) El backend ya ordena por prioridad (agotados → menos días → menos stock).
 * 11) Se muestra producto, talla, color, SKU, sucursal, disponible,
 *     reservada, estado, rotación, demanda, días y sugerencia.
 * 12) Solo lectura: no modifica inventario ni crea traspasos/ingresos.
 *
 * A1/A7: lista vacía (total 0). A6: umbral negativo o fechas invertidas → 422.
 * A8: error de servicio (sin tocar inventario).
 */
@Component({
  selector: 'app-alertas-page',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  templateUrl: './alertas-page.html',
  styleUrl: './alertas-page.scss',
})
export class AlertasPage implements OnInit {
  private readonly inventarioSvc = inject(InventarioService);
  private readonly sucursalesSvc = inject(SucursalesService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly sucursales = toSignal(this.sucursalesSvc.opciones(), {
    initialValue: [] as SucursalOpcion[],
  });

  /** Encargado solo ve su sucursal (el backend la impone igual). */
  protected readonly esEncargado = computed(() =>
    this.auth.hasRole(ROL.ENCARGADO)
  );

  // --- Filtros (paso 4) ---
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly umbral = new FormControl(3, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(1000)],
  });
  private readonly hoy = new Date();
  protected readonly desde = new FormControl<Date>(
    new Date(this.hoy.getFullYear(), this.hoy.getMonth(), this.hoy.getDate() - 29),
    { nonNullable: true, validators: [Validators.required] },
  );
  protected readonly hasta = new FormControl<Date>(this.hoy, {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly horizonte = new FormControl(30, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(1), Validators.max(365)],
  });
  protected readonly busqueda = new FormControl('', { nonNullable: true });

  // --- Resultado (pasos 5-11) ---
  protected readonly cargando = signal(false);
  protected readonly resultado = signal<AlertasReposicionPage | null>(null);
  protected readonly items = computed<AlertaReposicion[]>(
    () => this.resultado()?.items ?? []
  );
  protected readonly page = signal(1);
  protected readonly size = signal(20);
  protected readonly hayMas = computed(
    () => this.page() * this.size() < (this.resultado()?.total ?? 0)
  );

  /** Corre la primera consulta al entrar (paso 1). */
  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    // A6 (cliente): validaciones espejo del backend.
    if (this.umbral.invalid) {
      this.snack.open(
        'El umbral de stock bajo es obligatorio (0–1000).',
        'Cerrar',
        { duration: 4000 }
      );
      return;
    }
    if (this.horizonte.invalid) {
      this.snack.open('El horizonte debe estar entre 1 y 365 días.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }
    if (this.desde.invalid || this.hasta.invalid) {
      this.snack.open('Definí el período de análisis.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }
    if (this.hasta.value < this.desde.value) {
      this.snack.open(
        'La fecha final no puede ser anterior a la inicial.',
        'Cerrar',
        { duration: 4000 }
      );
      return;
    }

    this.cargando.set(true);
    const q = this.busqueda.value.trim();

    this.inventarioSvc
      .alertas({
        sucursal_id: this.esEncargado() ? null : this.sucursalId(),
        umbral: this.umbral.value,
        fecha_desde: fechaISO(this.desde.value),
        fecha_hasta: fechaISO(this.hasta.value),
        horizonte_dias: this.horizonte.value,
        q: q === '' ? undefined : q,
        page: this.page(),
        size: this.size(),
      })
      .subscribe({
        next: (r) => {
          this.resultado.set(r);
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.cargando.set(false);
          this.manejarError(e);
        },
      });
  }

  paginaAnterior(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.consultar();
    }
  }

  paginaSiguiente(): void {
    if (this.hayMas()) {
      this.page.set(this.page() + 1);
      this.consultar();
    }
  }

  /** Mapea errores a los flujos alternativos del CU36. */
  private manejarError(e: unknown): void {
    const err = e as { status?: number; error?: { detail?: unknown } | string };
    const detail = this.extraerDetalle(err);

    if (err.status === 404) {
      // A3: sucursal inválida o de otra empresa.
      this.snack.open(
        detail ?? 'Sucursal no encontrada (o no pertenece a tu empresa).',
        'Cerrar',
        { duration: 5000 }
      );
    } else if (err.status === 409) {
      // A4: encargado sin sucursal asignada.
      this.snack.open(
        detail ??
          'Tu cuenta no está vinculada a ninguna sucursal. Contactá al administrador.',
        'Cerrar',
        { duration: 5000 }
      );
    } else if (err.status === 403) {
      // A5: otro rol (Cliente, Cajero, Proveedor).
      this.snack.open(
        detail ?? 'No tenés permiso para consultar alertas de reposición.',
        'Cerrar',
        { duration: 5000 }
      );
    } else if (err.status === 422) {
      // A6: umbral negativo / fechas invertidas.
      this.snack.open(
        detail ?? 'Parámetros inválidos (umbral o rango de fechas).',
        'Cerrar',
        { duration: 5000 }
      );
    } else if (err.status === 401) {
      this.snack.open('Sesión vencida. Volvé a iniciar sesión.', 'Cerrar', {
        duration: 4000,
      });
    } else {
      // A8: error de servicio.
      this.snack.open(
        detail ?? 'Error de servicio al consultar las alertas. Intentá nuevamente.',
        'Cerrar',
        { duration: 5000 }
      );
    }
  }

  private extraerDetalle(err: { error?: { detail?: unknown } | string }): string | null {
    if (!err?.error) return null;
    if (typeof err.error === 'string') return err.error.slice(0, 200);
    const detail = err.error.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d as { msg?: string })?.msg ?? '')
        .filter(Boolean)
        .join(', ');
    }
    return null;
  }
}
