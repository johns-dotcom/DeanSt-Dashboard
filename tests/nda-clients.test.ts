import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NDA_CLIENTS, getNdaClient } from "@/lib/nda-clients";
import { parseNdaBody } from "@/lib/nda-template";
import type { NdaTemplateFields } from "@/lib/nda-template";

const fields = (o: Partial<NdaTemplateFields> = {}): NdaTemplateFields => ({
  recipientName: "Jane Q. Sample",
  recipientAddress: "",
  effectiveDate: "2026-08-24",
  ownerName: "",
  ownerAddress: "",
  ownerSignatoryName: "",
  ownerSignatoryPosition: "",
  disclosingToName: "",
  purpose: "",
  termYears: 2,
  survivalYears: 2,
  governingLaw: "New York",
  additionalClauses: "",
  ...o,
});

describe("NDA client registry", () => {
  it("has unique slugs so the subpage routes can't collide", () => {
    const slugs = NDA_CLIENTS.map((c) => c.slug);
    assert.deepEqual(slugs, [...new Set(slugs)]);
  });

  it("falls back to the default client for an unknown slug", () => {
    assert.equal(getNdaClient("nope").slug, "dean-st");
    assert.equal(getNdaClient(null).slug, "dean-st");
  });

  it("builds a non-empty body and signature block for every client", () => {
    for (const c of NDA_CLIENTS) {
      assert.ok(c.buildBody(fields()).length > 200, `${c.slug} body`);
      assert.ok(c.signatureLines({ recipientName: "Jane Q. Sample" }).length > 0, `${c.slug} signature`);
    }
  });
});

describe("Winnie Harlow template", () => {
  const client = getNdaClient("winnie-harlow");
  const body = client.buildBody(fields());

  it("is registered with a fixed owner and no owner/term fields", () => {
    assert.equal(client.name, "Winnie Harlow");
    assert.equal(client.showOwnerFields, false);
    assert.equal(client.showTerms, false);
    assert.match(client.owner?.name ?? "", /Everyoung LLC/);
  });

  it("opens with the agreement title so it renders centered", () => {
    const blocks = parseNdaBody(body);
    assert.equal(blocks[0].kind, "title");
    assert.equal(blocks[0].kind === "title" && blocks[0].text, "CONFIDENTIALITY AGREEMENT");
  });

  it("fills in the effective date and recipient, leaving no blank in the recital", () => {
    assert.match(body, /effective as of August 24, 2026 by and on behalf of Jane Q\. Sample \("you"\)/);
  });

  it("falls back to blanks when the date and recipient are unset", () => {
    const blank = client.buildBody(fields({ recipientName: "", effectiveDate: "" }));
    assert.match(blank, /effective as of ____________ by and on behalf of ____________ \("you"\)/);
  });

  it("names the client's parties and keeps New York as the governing law", () => {
    assert.match(body, /Everyoung LLC \("Company"\)/);
    assert.match(body, /Chantelle Whitney Brown-Young p\/k\/a "Winnie Harlow" \("Artist"\)/);
    assert.match(body, /State of New York/);
    // The term fields are hidden, so a stray governingLaw value must not leak in.
    assert.ok(!body.includes("California"));
  });

  it("carries all four numbered paragraphs and the execution line", () => {
    for (const marker of ["1. You hereby expressly", "2. You acknowledge that, due", "3. You acknowledge and agree that (i)", "4. All covenants, terms,"]) {
      assert.ok(body.includes(marker), marker);
    }
    assert.match(body, /IN WITNESS WHEREOF, the undersigned has executed this Agreement/);
  });

  it("has the recipient sign alone, acknowledging the consideration", () => {
    const sig = client.signatureLines({ recipientName: "Jane Q. Sample" });
    assert.match(sig[0], /^ACCEPTED AND AGREED, including acknowledgement of receipt of all Consideration:/);
    assert.ok(sig.some((l) => l === "Signature"));
    assert.ok(sig.some((l) => l.startsWith("S.S.#")));
    assert.ok(!sig.some((l) => /Artist|By:/.test(l)));
  });
});
