import { Injectable } from '@angular/core';

import { CopiaOffline, DatosOffline, OperacionPendiente } from '../models/offline.model';

const DB_NAME = 'fashionstore-offline';
const DB_VERSION = 2;
const STORE = 'catalogos';
const STORE_OPERACIONES = 'operaciones_pendientes';

@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  private dbPromise?: Promise<IDBDatabase>;

  inicializar(): Promise<IDBDatabase> {
    if (!('indexedDB' in globalThis)) {
      return Promise.reject(new Error('El navegador no admite almacenamiento offline.'));
    }
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('empresa_id', 'empresa_id', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_OPERACIONES)) {
          const store = db.createObjectStore(STORE_OPERACIONES, {
            keyPath: 'clave_idempotencia',
          });
          store.createIndex('estado', 'estado', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
    });
    return this.dbPromise;
  }

  // ------------------------------------------------------------------------- #
  //  CU11/CU12/CU13/CU14/CU15 — Cola de operaciones pendientes
  // ------------------------------------------------------------------------- #
  async agregarOperacion(op: OperacionPendiente): Promise<void> {
    const db = await this.inicializar();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_OPERACIONES, 'readwrite');
      tx.objectStore(STORE_OPERACIONES).put(op);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar la operación.'));
    });
  }

  async listarOperaciones(): Promise<OperacionPendiente[]> {
    const db = await this.inicializar();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_OPERACIONES, 'readonly').objectStore(STORE_OPERACIONES).getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as OperacionPendiente[]).sort((a, b) =>
            b.creado_en_dispositivo.localeCompare(a.creado_en_dispositivo),
          ),
        );
      request.onerror = () => reject(request.error ?? new Error('No se pudo leer la cola local.'));
    });
  }

  async actualizarOperacion(op: OperacionPendiente): Promise<void> {
    return this.agregarOperacion(op);
  }

  async guardar(datos: DatosOffline): Promise<CopiaOffline> {
    this.validar(datos);
    const db = await this.inicializar();
    const copia: CopiaOffline = {
      ...datos,
      key: `${datos.empresa_id}:${datos.sucursal_id}`,
      guardado_en: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(copia);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudieron guardar los datos.'));
      tx.onabort = () => reject(tx.error ?? new Error('Se canceló el guardado local.'));
    });
    return copia;
  }

  async obtener(empresaId: number, sucursalId: number): Promise<CopiaOffline | null> {
    const db = await this.inicializar();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(`${empresaId}:${sucursalId}`);
      request.onsuccess = () => resolve((request.result as CopiaOffline | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('No se pudo leer el catálogo local.'));
    });
  }

  async listarEmpresa(empresaId: number): Promise<CopiaOffline[]> {
    const db = await this.inicializar();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).index('empresa_id').getAll(empresaId);
      request.onsuccess = () => resolve((request.result as CopiaOffline[]).sort((a, b) => b.guardado_en.localeCompare(a.guardado_en)));
      request.onerror = () => reject(request.error ?? new Error('No se pudo leer el catálogo local.'));
    });
  }

  private validar(datos: DatosOffline): void {
    if (
      datos.schema_version !== 1 ||
      !Number.isInteger(datos.empresa_id) ||
      !Number.isInteger(datos.sucursal_id) ||
      !Array.isArray(datos.productos) ||
      datos.productos.some((p) => !Array.isArray(p.variantes))
    ) {
      throw new Error('El servidor devolvió datos offline incompletos o incompatibles.');
    }
  }
}
