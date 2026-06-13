import { describe, it, expect } from "vitest";
import {
  canChat,
  isParticipant,
  peerId,
  validateMessageInput,
  validatePublicKey,
} from "./conversations";

const CONV = { proprietaire_id: "owner1", prestataire_id: "sitter1" };

describe("canChat", () => {
  it("is true only for an accepted booking", () => {
    expect(canChat("accepte")).toBe(true);
    expect(canChat("en_attente")).toBe(false);
    expect(canChat("refuse")).toBe(false);
    expect(canChat("annule")).toBe(false);
    expect(canChat(null)).toBe(false);
  });
});

describe("isParticipant / peerId", () => {
  it("recognises both participants and rejects outsiders", () => {
    expect(isParticipant("owner1", CONV)).toBe(true);
    expect(isParticipant("sitter1", CONV)).toBe(true);
    expect(isParticipant("intruder", CONV)).toBe(false);
    expect(isParticipant(null, CONV)).toBe(false);
  });

  it("returns the other participant", () => {
    expect(peerId("owner1", CONV)).toBe("sitter1");
    expect(peerId("sitter1", CONV)).toBe("owner1");
    expect(peerId("intruder", CONV)).toBeNull();
  });
});

describe("validateMessageInput", () => {
  it("accepts a well-formed base64 payload", () => {
    expect(validateMessageInput({ ciphertext: "QUJD", iv: "EjRW" })).toBeNull();
  });

  it("rejects missing, non-string, malformed or oversized payloads", () => {
    expect(validateMessageInput({ ciphertext: "QUJD" })).toMatch(/invalide/);
    expect(validateMessageInput({ ciphertext: "", iv: "EjRW" })).toMatch(/vide/);
    expect(validateMessageInput({ ciphertext: "not base64!!", iv: "EjRW" })).toMatch(/mal formé/);
    expect(validateMessageInput({ ciphertext: "Q".repeat(9000), iv: "EjRW" })).toMatch(/trop long/);
  });
});

describe("validatePublicKey", () => {
  it("accepts base64 and rejects junk", () => {
    expect(validatePublicKey("QUJDRA==")).toBeNull();
    expect(validatePublicKey("")).toMatch(/manquante/);
    expect(validatePublicKey("bad key !!")).toMatch(/invalide/);
  });
});
