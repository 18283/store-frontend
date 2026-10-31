import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Messaging, getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FIREBASE_VAPID_KEY, firebaseConfig } from './firebase-config';

/**
 * CU14/CU15 — notificación push real (no solo un aviso dentro de la app):
 * avisa cuando termina de sincronizarse una reserva/venta registrada sin
 * conexión, aunque la pestaña esté cerrada. Si el navegador no soporta push,
 * o el usuario no da permiso, el resto de la app sigue funcionando igual.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;

  readonly soportado = signal(
    'serviceWorker' in navigator && 'Notification' in window,
  );
  readonly habilitado = signal(Notification?.permission === 'granted');

  async habilitar(): Promise<boolean> {
    if (!this.soportado()) return false;
    try {
      const permiso = await Notification.requestPermission();
      this.habilitado.set(permiso === 'granted');
      if (permiso !== 'granted') return false;

      this.app ??= initializeApp(firebaseConfig);
      this.messaging ??= getMessaging(this.app);

      const registro = await navigator.serviceWorker.ready;
      const token = await getToken(this.messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registro,
      });
      if (!token) return false;

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/offline/dispositivos`, {
          token,
          plataforma: 'WEB',
        }),
      );

      onMessage(this.messaging, (payload) => {
        const titulo = payload.notification?.title ?? 'FashionStore';
        const cuerpo = payload.notification?.body ?? '';
        // La pestaña está abierta: FCM no muestra la notificación del
        // sistema sola, así que la mostramos acá mismo.
        new Notification(titulo, { body: cuerpo, icon: '/icons/fashionstore-icon.svg' });
      });

      return true;
    } catch (err) {
      console.error('No se pudo habilitar el push.', err);
      return false;
    }
  }
}
