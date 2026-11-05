import { Component, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../../core/auth/auth.service';

export interface NavItem {
  label: string;
  icon: string;
  link?: string;
  children?: NavItem[];
}

/** Layout de panel (toolbar + sidenav + menú de usuario). Reutilizable
 *  por el panel de administración y por el portal del proveedor. */
@Component({
  selector: 'app-panel-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './panel-shell.html',
  styleUrl: './panel-shell.scss',
})
export class PanelShell {
  private readonly auth = inject(AuthService);
  private readonly bp = inject(BreakpointObserver);

  readonly etiqueta = input<string>('');
  readonly nav = input<NavItem[]>([]);

  private readonly consultaMovil = [Breakpoints.XSmall, Breakpoints.Small];

  protected readonly usuario = this.auth.user;
  protected readonly esMovil = toSignal(
    this.bp.observe(this.consultaMovil).pipe(map((r) => r.matches)),
    { initialValue: this.bp.isMatched(this.consultaMovil) },
  );
  protected readonly abierto = signal(!this.bp.isMatched(this.consultaMovil));

  // Mapa o estado para controlar los grupos colapsables abiertos
  private readonly gruposAbiertos = signal<Record<string, boolean>>({ Traspasos: true });

  estaAbierto(label: string): boolean {
    return !!this.gruposAbiertos()[label];
  }

  alternarGrupo(label: string): void {
    const estado = this.gruposAbiertos();
    this.gruposAbiertos.set({ ...estado, [label]: !estado[label] });
  }

  alternar(): void {
    this.abierto.set(!this.abierto());
  }
  cerrarSiMovil(): void {
    if (this.esMovil()) this.abierto.set(false);
  }
  salir(): void {
    this.auth.logout();
  }
}