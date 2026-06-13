// ============================================================
// PAWLY — End-to-end encryption primitives (Web Crypto, framework-free)
// ECDH P-256 key agreement + AES-256-GCM message encryption.
//
// These functions run identically in the browser and under Node ≥20 (vitest),
// because both expose the same `crypto.subtle` Web Crypto API. They are kept
// pure (no IndexedDB, no DOM) so they can be unit-tested; device-bound key
// persistence lives in the browser-only `e2ee-store.ts`.
//
// Privacy model: the private key never leaves the device. The server only ever
// receives the public key and ciphertext.
// ============================================================

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_PARAMS = { name: "AES-GCM", length: 256 } as const;
const IV_BYTES = 12;

/** The chiffrement payload stored per message (both fields are base64). */
export interface CipherPayload {
  ciphertext: string;
  iv: string;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Web Crypto indisponible dans cet environnement.");
  return c.subtle;
}

// ── base64 helpers (work in browser and Node) ────────────────────────────────
export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(view).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// ── Key generation & exchange ────────────────────────────────────────────────

/** Generate a fresh ECDH P-256 keypair. The private key is non-extractable. */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return subtle().generateKey(ECDH_PARAMS, false, ["deriveKey"]);
}

/** Export a public key to a base64 SPKI string for storage / transport. */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await subtle().exportKey("spki", publicKey);
  return bytesToBase64(spki);
}

/** Import a peer's base64 SPKI public key back into a CryptoKey. */
export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const bytes = base64ToBytes(base64Spki);
  return subtle().importKey("spki", bytes as unknown as ArrayBuffer, ECDH_PARAMS, true, []);
}

/**
 * Derive the shared AES-256-GCM key for a conversation from my private key and
 * the peer's public key. ECDH is symmetric: (myPriv, peerPub) and
 * (peerPriv, myPub) yield the same key.
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return subtle().deriveKey(
    { name: "ECDH", public: peerPublicKey },
    myPrivateKey,
    AES_PARAMS,
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Message encryption ───────────────────────────────────────────────────────

/** Encrypt UTF-8 plaintext with a per-message random IV. */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<CipherPayload> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, data);
  return { ciphertext: bytesToBase64(ct), iv: bytesToBase64(iv) };
}

// ── Attachment (binary) encryption ───────────────────────────────────────────
// Single-shot AES-GCM over the whole buffer: fine for the chat attachment caps
// (≤50 Mo). Do not raise the caps without moving to chunked encryption.

/** Encrypt raw bytes with a fresh random IV. Returns ciphertext bytes + base64 IV. */
export async function encryptBytes(
  data: ArrayBuffer | Uint8Array,
  key: CryptoKey,
): Promise<{ bytes: Uint8Array; iv: string }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const buf = data instanceof Uint8Array ? (data as unknown as ArrayBuffer) : data;
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, buf);
  return { bytes: new Uint8Array(ct), iv: bytesToBase64(iv) };
}

/** Decrypt attachment bytes. Throws on a wrong key/IV (GCM auth failure). */
export async function decryptBytes(
  ciphertext: ArrayBuffer | Uint8Array,
  ivBase64: string,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const iv = base64ToBytes(ivBase64);
  const buf =
    ciphertext instanceof Uint8Array ? (ciphertext as unknown as ArrayBuffer) : ciphertext;
  return subtle().decrypt({ name: "AES-GCM", iv: iv as unknown as ArrayBuffer }, key, buf);
}

/** Decrypt a stored payload back to UTF-8 plaintext. Throws if the key/IV is wrong. */
export async function decrypt(payload: CipherPayload, key: CryptoKey): Promise<string> {
  const ct = base64ToBytes(payload.ciphertext);
  const iv = base64ToBytes(payload.iv);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    key,
    ct as unknown as ArrayBuffer,
  );
  return new TextDecoder().decode(plain);
}
