import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionService } from '../../core/services/notificacion.service';

@Component({
  selector: 'app-notificacion-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (service.notificacionActual(); as notif) {
      <div class="toast-container" [ngClass]="notif.tipo">
        <div class="toast-content">
          <span class="toast-icon">
            @if (notif.tipo === 'success') { ✓ }
            @else if (notif.tipo === 'error') { ✕ }
            @else { ℹ }
          </span>
          <span class="toast-message">{{ notif.mensaje }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toast-container.success { background-color: #22c55e; }
    .toast-container.info { background-color: #3b82f6; }
    .toast-container.warning { background-color: #f59e0b; }
    .toast-container.error { background-color: #ef4444; }
    .toast-icon { font-size: 1.2rem; font-weight: bold; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class NotificacionToastComponent {
  public readonly service = inject(NotificacionService);
}