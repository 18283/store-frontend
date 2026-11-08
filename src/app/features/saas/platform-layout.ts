import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavItem, PanelShell } from '../shared/panel-shell';

@Component({
  selector: 'app-platform-layout',
  imports: [RouterOutlet, PanelShell],
  template: `
    <app-panel-shell etiqueta="Plataforma SaaS" [nav]="nav">
      <router-outlet />
    </app-panel-shell>
  `,
})
export class PlatformLayout {
  protected readonly nav: NavItem[] = [
    { label: 'Empresas', icon: 'apartment', link: '/plataforma/empresas' },
    { label: 'Planes y límites', icon: 'tune', link: '/plataforma/planes' },
    {
      label: 'Suscripciones',
      icon: 'card_membership',
      link: '/plataforma/suscripciones',
    },
    {
      label: 'Entrenar modelos (IA)',
      icon: 'model_training',
      link: '/plataforma/modelos',
    },
    { label: 'Operación heredada', icon: 'store', link: '/admin/usuarios' },
  ];
}
