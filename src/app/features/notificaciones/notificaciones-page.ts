import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';
import { ROL } from '../../core/models/usuario.model';
import { NotificacionService } from '../../core/services/notificacion.service';
import {
  ROLES_DESTINO,
  RolDestino,
} from '../../core/models/notificacion.model';

type FiltroLeidas = 'todas' | 'leidas' | 'no-leidas';
type TipoMasiva = 'info' | 'warning' | 'success';

/**
 * CU35 — Consultar centro de notificaciones.
 *
 * Flujo normal:
 * 1) AbrirCentroNotificaciones() → page loads + GET /notificaciones
 * 2) El backend valida sesión/cuenta/empresa activa (A4 → 403, A8 → error).
 * 3) Lista ordenada fecha DESC con paginación page/size (defecto 1/20).
 * 5) Filtro opcional leidas=True/False → GET con ?leidas=.
 * 6) Muestra mensaje, tipo, modulo, leida, codigo_traspaso y fecha.
 * 7/8) MarcarLeida / MarcarTodasLeidas → PATCH .../leer, .../leer-todas.
 * 9-12) Solo Admin: POST /notificaciones/masiva {mensaje, tipo, roles_destino}
 *        → { enviados: N }. A5 → 403, A6 → 422, A7 → { enviados: 0 }.
 * A1/A2: lista vacía con total 0. A3: 404 al marcar ajena/inexistente.
 */
@Component({
  selector: 'app-notificaciones-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  templateUrl: './notificaciones-page.html',
  styleUrl: './notificaciones-page.scss',
})
export class NotificacionesPage implements OnInit {
  private readonly notifSvc = inject(NotificacionService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly service = this.notifSvc;
  protected readonly cargando = this.notifSvc.cargando;

  /** Solo el Administrador puede difundir (paso 9 / A5). */
  protected readonly esAdmin = computed(() =>
    this.auth.hasRole(ROL.ADMIN)
  );

  // ---- Filtros y paginación (pasos 3-5) ----
  protected readonly filtroLeidas = signal<FiltroLeidas>('todas');

  protected readonly page = this.notifSvc.page;
  protected readonly size = this.notifSvc.size;
  protected readonly total = this.notifSvc.total;

  protected readonly hayMas = computed(
    () => this.page() * this.size() < this.total()
  );

  // ---- Formulario de difusión masiva (pasos 9-10, solo Admin) ----
  protected readonly mensaje = new FormControl('', [
    Validators.required,
    Validators.maxLength(500),
  ]);
  protected readonly tipo = new FormControl<TipoMasiva>('info', {
    nonNullable: true,
  });
  protected readonly roles = ROLES_DESTINO;
  protected readonly rolesSeleccionados = signal<Set<RolDestino>>(new Set());
  protected readonly enviando = signal(false);
  protected readonly ultimoResultado = signal<string | null>(null);

  ngOnInit(): void {
    this.recargar();
  }

  // ---------- Consulta y marcado (pasos 3-8) ----------

  recargar(): void {
    const leidas =
      this.filtroLeidas() === 'todas'
        ? undefined
        : this.filtroLeidas() === 'leidas';
    this.notifSvc
      .cargarNotificaciones(this.page(), this.size(), leidas)
      .subscribe({
        error: (e: unknown) => this.manejarErrorListado(e),
      });
  }

  onFiltroLeidasChange(f: FiltroLeidas): void {
    this.filtroLeidas.set(f);
    this.page.set(1);
    this.notifSvc.page.set(1);
    this.recargar();
  }

  paginaAnterior(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.notifSvc.page.set(this.page());
      this.recargar();
    }
  }

  paginaSiguiente(): void {
    if (this.hayMas()) {
      this.page.set(this.page() + 1);
      this.notifSvc.page.set(this.page());
      this.recargar();
    }
  }

  /** PATCH /notificaciones/{id}/leer (A3 → 404 si es ajena/inexistente). */
  marcarLeida(n: { id: string; leida: boolean }): void {
    if (n.leida) return;
    this.notifSvc.marcarComoLeida(n.id).subscribe({
      error: (e: unknown) => {
        const status = (e as { status?: number })?.status;
        if (status === 404) {
          this.snack.open(
            'La notificación no existe o no te pertenece.',
            'Cerrar',
            { duration: 4000 }
          );
        } else {
          this.manejarErrorListado(e);
        }
      },
    });
  }

  /** PATCH /notificaciones/leer-todas */
  marcarTodasLeidas(): void {
    this.notifSvc.marcarTodasComoLeidas().subscribe({
      error: (e: unknown) => this.manejarErrorListado(e),
    });
  }

  // ---------- Envío masivo (pasos 9-12, solo Admin) ----------

  onRolChange(rol: RolDestino, checked: boolean): void {
    this.rolesSeleccionados.update((set) => {
      const next = new Set(set);
      if (checked) next.add(rol);
      else next.delete(rol);
      return next;
    });
  }

  enviarMasiva(): void {
    const mensaje = (this.mensaje.value ?? '').trim();
    const tipo = this.tipo.value;
    const roles_destino = Array.from(this.rolesSeleccionados());

    // Validación cliente (A6): mismo criterio que el backend.
    if (!mensaje) {
      this.snack.open('El mensaje es obligatorio.', 'Cerrar', {
        duration: 4000,
      });
      this.mensaje.markAsTouched();
      return;
    }
    if (mensaje.length > 500) {
      this.snack.open('El mensaje no puede superar 500 caracteres.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }
    if (roles_destino.length === 0) {
      this.snack.open('Seleccioná al menos un rol destino.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    this.enviando.set(true);
    this.ultimoResultado.set(null);
    this.notifSvc
      .enviarMasiva({ mensaje, tipo, roles_destino })
      .subscribe({
        next: ({ enviados }) => {
          this.enviando.set(false);
          if (enviados === 0) {
            // A7: sin destinatarios activos con los roles en la empresa.
            this.ultimoResultado.set(
              'No había destinatarios activos con los roles elegidos (enviados: 0).'
            );
            this.snack.open('No había destinatarios para esta difusión.', 'Cerrar', {
              duration: 4000,
            });
            return;
          }
          // Paso 12.
          this.ultimoResultado.set(`Notificaciones enviadas: ${enviados}.`);
          this.snack.open(`${enviados} notificaciones enviadas.`, 'Cerrar', {
            duration: 5000,
          });
          this.mensaje.reset('');
          this.rolesSeleccionados.set(new Set());
          this.recargar();
        },
        error: (e: unknown) => {
          this.enviando.set(false);
          const status = (e as { status?: number })?.status;
          const detail = this.extraerDetalle(e);
          if (status === 403) {
            // A5: no-Administrador (o empresa inactiva).
            this.snack.open(
              detail ?? 'No tenés permiso para enviar notificaciones masivas.',
              'Cerrar',
              { duration: 5000 }
            );
          } else if (status === 422) {
            // A6: mensaje vacío / tipo inválido / roles vacíos.
            this.snack.open(
              detail ?? 'Datos inválidos: revisá mensaje, tipo y roles destino.',
              'Cerrar',
              { duration: 5000 }
            );
          } else {
            this.manejarErrorListado(e);
          }
        },
      });
  }

  // ---------- Errores de consulta (A4 / A8) ----------

  private manejarErrorListado(e: unknown): void {
    const status = (e as { status?: number })?.status;
    const detail = this.extraerDetalle(e);
    if (status === 403) {
      this.snack.open(
        detail ?? 'Acceso denegado: verificá tu sesión, cuenta y empresa activas.',
        'Cerrar',
        { duration: 5000 }
      );
    } else if (status === 401) {
      this.snack.open('Sesión vencida. Volvé a iniciar sesión.', 'Cerrar', {
        duration: 4000,
      });
    } else {
      this.snack.open(
        detail ?? 'Error de servicio al consultar las notificaciones.',
        'Cerrar',
        { duration: 5000 }
      );
    }
  }

  private extraerDetalle(e: unknown): string | null {
    const err = e as { error?: { detail?: unknown } | string };
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
