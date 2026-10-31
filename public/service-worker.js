// CU14/CU15 — push de Firebase Cloud Messaging: avisa el resultado de
// sincronizar una reserva/venta offline aunque la pestaña esté cerrada.
// Se agrega acá (en vez de un segundo service worker aparte) porque el
// navegador solo permite un service worker activo por origen.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDowkXSQjjsPNHd3ypIv9Q2IM5cCKxsugY',
  authDomain: 'fashionstore-grupo25.firebaseapp.com',
  projectId: 'fashionstore-grupo25',
  storageBucket: 'fashionstore-grupo25.firebasestorage.app',
  messagingSenderId: '1067257958892',
  appId: '1:1067257958892:web:466b54e1d8f4c5e2fe30c9',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = (payload.notification && payload.notification.title) || 'FashionStore';
  const cuerpo = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/icons/fashionstore-icon.svg',
  });
});

const CACHE = 'fashionstore-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico', '/icons/fashionstore-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copia = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copia));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })),
  );
});
