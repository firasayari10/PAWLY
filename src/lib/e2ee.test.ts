import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encrypt,
  decrypt,
  encryptBytes,
  decryptBytes,
  bytesToBase64,
  base64ToBytes,
} from "./e2ee";

describe("base64 helpers", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("ECDH key agreement", () => {
  it("derives the same shared key on both sides", async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    // Exchange public keys the way the app would (export → store → import).
    const alicePubForBob = await importPublicKey(await exportPublicKey(alice.publicKey));
    const bobPubForAlice = await importPublicKey(await exportPublicKey(bob.publicKey));

    const aliceShared = await deriveSharedKey(alice.privateKey, bobPubForAlice);
    const bobShared = await deriveSharedKey(bob.privateKey, alicePubForBob);

    // Symmetry check: Alice encrypts, Bob decrypts with his independently-derived key.
    const payload = await encrypt("Bonjour Bob 🐾", aliceShared);
    expect(await decrypt(payload, bobShared)).toBe("Bonjour Bob 🐾");
  });
});

describe("encrypt / decrypt", () => {
  it("round-trips a message with a unique IV each time", async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const key = await deriveSharedKey(a.privateKey, b.publicKey);

    const p1 = await encrypt("rendez-vous 18h", key);
    const p2 = await encrypt("rendez-vous 18h", key);
    // Same plaintext, different nonce → different ciphertext.
    expect(p1.iv).not.toBe(p2.iv);
    expect(p1.ciphertext).not.toBe(p2.ciphertext);
    expect(await decrypt(p1, key)).toBe("rendez-vous 18h");
  });

  it("fails to decrypt with the wrong key", async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const eve = await generateKeyPair();

    const good = await deriveSharedKey(a.privateKey, b.publicKey);
    const wrong = await deriveSharedKey(eve.privateKey, b.publicKey);

    const payload = await encrypt("secret", good);
    await expect(decrypt(payload, wrong)).rejects.toBeTruthy();
  });
});

describe("encryptBytes / decryptBytes (attachments)", () => {
  it("round-trips binary data with a unique IV each time", async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const key = await deriveSharedKey(a.privateKey, b.publicKey);

    const file = globalThis.crypto.getRandomValues(new Uint8Array(4096));
    const e1 = await encryptBytes(file, key);
    const e2 = await encryptBytes(file, key);
    expect(e1.iv).not.toBe(e2.iv);

    const plain = new Uint8Array(await decryptBytes(e1.bytes, e1.iv, key));
    expect(Array.from(plain)).toEqual(Array.from(file));
  });

  it("fails on a wrong key or wrong IV (GCM auth)", async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const eve = await generateKeyPair();
    const good = await deriveSharedKey(a.privateKey, b.publicKey);
    const wrong = await deriveSharedKey(eve.privateKey, b.publicKey);

    const file = new TextEncoder().encode("photo bytes");
    const { bytes, iv } = await encryptBytes(file, good);

    await expect(decryptBytes(bytes, iv, wrong)).rejects.toBeTruthy();
    const otherIv = bytesToBase64(globalThis.crypto.getRandomValues(new Uint8Array(12)));
    await expect(decryptBytes(bytes, otherIv, good)).rejects.toBeTruthy();
  });
});
