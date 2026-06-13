import { describe, it, expect } from "vitest";
import {
  kindForMime,
  validateAttachmentDeclaration,
  buildAttachmentPath,
  isPathInConversation,
  serializeEnvelope,
  parseEnvelope,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_NAME_LENGTH,
  type MediaEnvelope,
} from "./chat-attachments";

describe("kindForMime", () => {
  it("classifies supported mimes", () => {
    expect(kindForMime("image/jpeg")).toBe("image");
    expect(kindForMime("image/png")).toBe("image");
    expect(kindForMime("image/webp")).toBe("image");
    expect(kindForMime("image/gif")).toBe("image");
    expect(kindForMime("video/mp4")).toBe("video");
    expect(kindForMime("video/webm")).toBe("video");
    expect(kindForMime("video/quicktime")).toBe("video");
  });

  it("rejects unsupported mimes", () => {
    expect(kindForMime("image/svg+xml")).toBeNull();
    expect(kindForMime("application/pdf")).toBeNull();
    expect(kindForMime("")).toBeNull();
  });
});

describe("validateAttachmentDeclaration", () => {
  it("accepts a normal image and exact limits", () => {
    expect(validateAttachmentDeclaration({ mime: "image/jpeg", size: 1024 * 1024 })).toBeNull();
    expect(validateAttachmentDeclaration({ mime: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(validateAttachmentDeclaration({ mime: "video/mp4", size: MAX_VIDEO_BYTES })).toBeNull();
  });

  it("rejects oversize files per kind", () => {
    expect(validateAttachmentDeclaration({ mime: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/10 Mo/);
    expect(validateAttachmentDeclaration({ mime: "image/gif", size: MAX_IMAGE_BYTES + 1 })).toMatch(/10 Mo/);
    expect(validateAttachmentDeclaration({ mime: "video/mp4", size: MAX_VIDEO_BYTES + 1 })).toMatch(/50 Mo/);
  });

  it("rejects unsupported or missing mime", () => {
    expect(validateAttachmentDeclaration({ mime: "image/svg+xml", size: 10 })).toMatch(/non supporté/);
    expect(validateAttachmentDeclaration({ size: 10 })).toMatch(/manquant/);
    expect(validateAttachmentDeclaration({ mime: "", size: 10 })).toMatch(/manquant/);
  });

  it("rejects invalid sizes", () => {
    expect(validateAttachmentDeclaration({ mime: "image/jpeg", size: 0 })).toMatch(/invalide/);
    expect(validateAttachmentDeclaration({ mime: "image/jpeg", size: -5 })).toMatch(/invalide/);
    expect(validateAttachmentDeclaration({ mime: "image/jpeg", size: 1.5 })).toMatch(/invalide/);
    expect(validateAttachmentDeclaration({ mime: "image/jpeg", size: "big" })).toMatch(/invalide/);
    expect(validateAttachmentDeclaration({ mime: "image/jpeg" })).toMatch(/invalide/);
  });
});

describe("attachment paths", () => {
  it("builds conversation-scoped paths", () => {
    expect(buildAttachmentPath("c1", "abc-123")).toBe("c1/abc-123");
  });

  it("accepts paths inside the conversation", () => {
    expect(isPathInConversation("c1/abc-123", "c1")).toBe(true);
  });

  it("rejects foreign, traversal and malformed paths", () => {
    expect(isPathInConversation("c2/abc", "c1")).toBe(false);
    expect(isPathInConversation("c1/../x", "c1")).toBe(false);
    expect(isPathInConversation("c1/a/b", "c1")).toBe(false);
    expect(isPathInConversation("c1/", "c1")).toBe(false);
    expect(isPathInConversation("c1", "c1")).toBe(false);
    expect(isPathInConversation("", "c1")).toBe(false);
    expect(isPathInConversation("../c1/x", "c1")).toBe(false);
    expect(isPathInConversation("c10/abc", "c1")).toBe(false);
  });
});

describe("message envelopes", () => {
  const media: MediaEnvelope = {
    t: "media",
    kind: "image",
    path: "c1/abc",
    mime: "image/jpeg",
    size: 1234,
    name: "photo.jpg",
    fileIv: "EjRWeJCrze8=",
  };

  it("round-trips a text envelope", () => {
    expect(parseEnvelope(serializeEnvelope({ t: "text", body: "salut" }))).toEqual({ t: "text", body: "salut" });
  });

  it("round-trips a media envelope", () => {
    expect(parseEnvelope(serializeEnvelope(media))).toEqual(media);
  });

  it("treats legacy plain text as a text envelope", () => {
    expect(parseEnvelope("salut, rendez-vous 18h")).toEqual({ t: "text", body: "salut, rendez-vous 18h" });
  });

  it("treats broken JSON and unknown shapes as text", () => {
    expect(parseEnvelope("{broken").t).toBe("text");
    expect(parseEnvelope('{"t":"weird"}').t).toBe("text");
    expect(parseEnvelope('["t","text"]').t).toBe("text");
    expect(parseEnvelope("123").t).toBe("text");
  });

  it("falls back to text when media fields are missing or inconsistent", () => {
    const noIv: Record<string, unknown> = { ...media };
    delete noIv.fileIv;
    expect(parseEnvelope(JSON.stringify(noIv)).t).toBe("text");
    expect(parseEnvelope(JSON.stringify({ ...media, size: -1 })).t).toBe("text");
    expect(parseEnvelope(JSON.stringify({ ...media, path: "" })).t).toBe("text");
    // mime kind must match the declared kind
    expect(parseEnvelope(JSON.stringify({ ...media, mime: "video/mp4" })).t).toBe("text");
    expect(parseEnvelope(JSON.stringify({ ...media, mime: "application/pdf" })).t).toBe("text");
  });

  it("truncates long file names on both ends", () => {
    const long = { ...media, name: "x".repeat(500) };
    const parsed = parseEnvelope(serializeEnvelope(long));
    expect(parsed.t).toBe("media");
    if (parsed.t === "media") expect(parsed.name).toHaveLength(MAX_NAME_LENGTH);
    const parsedRaw = parseEnvelope(JSON.stringify(long));
    if (parsedRaw.t === "media") expect(parsedRaw.name).toHaveLength(MAX_NAME_LENGTH);
  });
});
