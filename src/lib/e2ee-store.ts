// ============================================================
// PAWLY — Device-bound keypair persistence (browser only)
// Stores the user's ECDH private key in IndexedDB. IndexedDB can hold a
// non-extractable CryptoKey, so the private key is never serialised and never
// leaves the device. Only the public key is exported (for registration).
//
// Limitation: keys are per-device. A new browser/device generates a new keypair
// and cannot read history encrypted to the previous public key. Key backup /
// multi-device sync is intentionally out of scope.
// ============================================================

import { generateKeyPair, exportPublicKey } from "./e2ee";

const DB_NAME = "pawly-e2ee";
const STORE = "keys";
const KEY_ID = "self-ecdh";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Return this device's ECDH keypair, creating and persisting one on first use.
 * Also returns the base64 public key to register with the server.
 */
export async function getOrCreateMyKeyPair(): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyBase64: string;
}> {
  const db = await openDb();
  let keyPair = await idbGet<CryptoKeyPair>(db, KEY_ID);
  if (!keyPair) {
    keyPair = await generateKeyPair();
    await idbPut(db, KEY_ID, keyPair);
  }
  const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
  return { keyPair, publicKeyBase64 };
}
