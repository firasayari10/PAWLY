import { describe, it, expect } from "vitest";
import {
  mapIdDocumentFields,
  parseReadText,
  parseAddress,
  parseAddressJson,
  capitalize,
} from "./ocr-parse";

describe("capitalize", () => {
  it("title-cases simple, hyphenated and accented names", () => {
    expect(capitalize("MARTIN")).toBe("Martin");
    expect(capitalize("ANNE-SOPHIE")).toBe("Anne-Sophie");
    expect(capitalize("LEFEBVRE-MARTIN")).toBe("Lefebvre-Martin");
    expect(capitalize("PARIS")).toBe("Paris");
  });
});

describe("mapIdDocumentFields (Azure prebuilt-idDocument)", () => {
  it("maps high-confidence name and structured address fields", () => {
    const fields = mapIdDocumentFields({
      FirstName: { valueString: "MARIE", confidence: 0.98 },
      LastName: { valueString: "MARTIN", confidence: 0.97 },
      Address: {
        confidence: 0.9,
        valueAddress: { houseNumber: "12", road: "rue des Lilas", postalCode: "75011", city: "PARIS" },
      },
    });
    expect(fields).toEqual({
      prenom: "Marie",
      nom: "Martin",
      adresse: "12 rue des Lilas",
      code_postal: "75011",
      ville: "Paris",
    });
  });

  it("drops fields below the confidence threshold", () => {
    const fields = mapIdDocumentFields({
      FirstName: { valueString: "MARIE", confidence: 0.2 },
      LastName: { valueString: "MARTIN", confidence: 0.95 },
    });
    expect(fields).toEqual({ nom: "Martin" });
  });

  it("returns empty object when there are no fields", () => {
    expect(mapIdDocumentFields(undefined)).toEqual({});
  });
});

describe("parseReadText (raw OCR heuristics)", () => {
  it("extracts nom/prenom from noisy real CIN OCR output", () => {
    // Verbatim Tesseract/OCR-style output of the MARTIN / MARIE sample card.
    const raw = [
      "MK M RÉPUBLIQUE FRANÇAISE em",
      "| M2 4 CARTE NATIONALE D'IDENTITE EN",
      "| Non MARTIN | a %",
      "| MR rerors MARIE | = ;",
      "19} we PARIS A PARIS | 4",
      "| WW.  781618PFWM 12346789 | IR",
    ].join("\n");
    const fields = parseReadText(raw);
    expect(fields.nom).toBe("Martin");
    expect(fields.prenom).toBe("Marie");
  });

  it("extracts address + names from an insurance attestation", () => {
    const raw = [
      "ATTESTATION D'ASSURANCE HABITATION",
      "Assuré : Monsieur Jean DUPONT",
      "12 rue des Lilas",
      "75011 PARIS",
      "Contrat n° AB123456",
    ].join("\n");
    const fields = parseReadText(raw);
    expect(fields.adresse).toBe("12 rue des Lilas");
    expect(fields.code_postal).toBe("75011");
    expect(fields.ville).toBe("Paris");
    // The detected ville must never be mistaken for a first name.
    expect(fields.prenom).not.toBe("Paris");
  });

  it("handles label-anchored hyphenated names", () => {
    const raw = "Nom : LEFEBVRE-MARTIN\nPrénom : ANNE-SOPHIE\nNée le 03/05/1990";
    const fields = parseReadText(raw);
    expect(fields.nom).toBe("Lefebvre-Martin");
    expect(fields.prenom).toBe("Anne-Sophie");
  });
});

describe("parseAddress", () => {
  it("pulls postal code, city and street from a block", () => {
    expect(parseAddress("8 boulevard Victor Hugo\n69003 LYON")).toEqual({
      adresse: "8 boulevard Victor Hugo",
      code_postal: "69003",
      ville: "Lyon",
    });
  });
});

describe("parseAddressJson (LLM output validation)", () => {
  it("accepts a complete, well-formed object", () => {
    expect(
      parseAddressJson({ adresse: "12 rue des Lilas", code_postal: "75011", ville: "PARIS" }),
    ).toEqual({ adresse: "12 rue des Lilas", code_postal: "75011", ville: "Paris" });
  });

  it("keeps only the fields that are present", () => {
    expect(parseAddressJson({ ville: "lyon", adresse: null, code_postal: null })).toEqual({
      ville: "Lyon",
    });
  });

  it("rejects a code_postal that is not exactly 5 digits", () => {
    expect(parseAddressJson({ code_postal: "750", ville: "Paris" })).toEqual({ ville: "Paris" });
    expect(parseAddressJson({ code_postal: "75011 Paris" })).toEqual({});
  });

  it("returns {} for null, non-object, or empty values", () => {
    expect(parseAddressJson(null)).toEqual({});
    expect(parseAddressJson("not an object")).toEqual({});
    expect(parseAddressJson({ adresse: "", ville: "   " })).toEqual({});
  });
});
