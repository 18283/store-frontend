import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/auth/auth.service';
import { TarjetaService } from '../../../core/offline/tarjeta.service';

function passwordsIguales(group: AbstractControl): ValidationErrors | null {
  const a = group.get('password_nueva')?.value;
  const b = group.get('confirmar')?.value;
  return a && b && a !== b ? { noCoincide: true } : null;
}

@Component({
  selector: 'app-mi-cuenta',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss',
})
export class MiCuenta implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tarjetaService = inject(TarjetaService);

  protected readonly usuario = this.auth.user;
  protected readonly guardandoDatos = signal(false);
  protected readonly guardandoPass = signal(false);
  protected readonly errorPass = signal<string | null>(null);

  // CU12/CU14 — tarjeta guardada (necesaria para comprar sin conexión).
  protected readonly esCliente = computed(() => this.usuario()?.rol === 'Cliente');
  protected readonly tieneTarjeta = signal(false);
  protected readonly cargandoTarjeta = signal(true);
  protected readonly procesandoTarjeta = signal(false);

  ngOnInit(): void {
    if (this.esCliente()) {
      void this.resolverRetornoStripe();
    }
  }

  private async resolverRetornoStripe(): Promise<void> {
    const resultado = this.route.snapshot.queryParamMap.get('tarjeta');
    if (resultado === 'exito') {
      try {
        const estado = await this.tarjetaService.confirmar();
        this.tieneTarjeta.set(estado.tiene_tarjeta_guardada);
        this.snack.open('Tarjeta guardada correctamente.', 'OK', { duration: 3000 });
      } catch {
        this.snack.open('No se pudo confirmar la tarjeta.', 'Cerrar', { duration: 4000 });
      } finally {
        void this.router.navigate([], { queryParams: {}, replaceUrl: true });
        this.cargandoTarjeta.set(false);
      }
      return;
    }
    if (resultado === 'cancelado') {
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
    await this.cargarEstadoTarjeta();
  }

  private async cargarEstadoTarjeta(): Promise<void> {
    this.cargandoTarjeta.set(true);
    try {
      const estado = await this.tarjetaService.estado();
      this.tieneTarjeta.set(estado.tiene_tarjeta_guardada);
    } catch {
      // sin conexión: se deja como estaba, no es un error bloqueante acá.
    } finally {
      this.cargandoTarjeta.set(false);
    }
  }

  async guardarTarjeta(): Promise<void> {
    this.procesandoTarjeta.set(true);
    try {
      await this.tarjetaService.iniciarGuardado();
    } catch {
      this.snack.open('No se pudo iniciar el guardado de la tarjeta.', 'Cerrar', {
        duration: 4000,
      });
      this.procesandoTarjeta.set(false);
    }
  }

  async eliminarTarjeta(): Promise<void> {
    this.procesandoTarjeta.set(true);
    try {
      const estado = await this.tarjetaService.eliminar();
      this.tieneTarjeta.set(estado.tiene_tarjeta_guardada);
      this.snack.open('Tarjeta eliminada.', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('No se pudo eliminar la tarjeta.', 'Cerrar', { duration: 4000 });
    } finally {
      this.procesandoTarjeta.set(false);
    }
  }

  protected readonly iniciales = computed(() => {
    const u = this.usuario();
    return u ? (u.nombre[0] ?? '') + (u.apellido[0] ?? '') : '';
  });

  protected readonly datosForm = this.fb.nonNullable.group({
    nombre: [
      this.usuario()?.nombre ?? '',
      [Validators.required, Validators.minLength(2)],
    ],
    apellido: [
      this.usuario()?.apellido ?? '',
      [Validators.required, Validators.minLength(2)],
    ],
    telefono: [this.usuario()?.telefono ?? ''],
  });

  protected readonly passForm = this.fb.nonNullable.group(
    {
      password_actual: ['', [Validators.required]],
      password_nueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordsIguales },
  );

  volver(): void {
    this.location.back();
  }

  async guardarDatos(): Promise<void> {
    if (this.datosForm.invalid || this.guardandoDatos()) {
      this.datosForm.markAllAsTouched();
      return;
    }
    this.guardandoDatos.set(true);
    try {
      const v = this.datosForm.getRawValue();
      await this.auth.updateProfile({
        nombre: v.nombre,
        apellido: v.apellido,
        telefono: v.telefono || null,
      });
      this.snack.open('Datos actualizados.', 'OK', { duration: 2500 });
    } catch {
      this.snack.open('No se pudieron guardar los datos.', 'Cerrar', {
        duration: 4000,
      });
    } finally {
      this.guardandoDatos.set(false);
    }
  }

  async cambiarPassword(): Promise<void> {
    if (this.passForm.invalid || this.guardandoPass()) {
      this.passForm.markAllAsTouched();
      return;
    }
    this.guardandoPass.set(true);
    this.errorPass.set(null);
    try {
      const v = this.passForm.getRawValue();
      await this.auth.changePassword({
        password_actual: v.password_actual,
        password_nueva: v.password_nueva,
      });
      this.passForm.reset();
      this.snack.open('Contraseña actualizada.', 'OK', { duration: 2500 });
    } catch (e: unknown) {
      const err = e as { error?: { detail?: string } };
      this.errorPass.set(
        err.error?.detail ?? 'No se pudo cambiar la contraseña.',
      );
    } finally {
      this.guardandoPass.set(false);
    }
  }
}
