import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exportFormatFor, importedFileName } from "@/lib/google/drive";
import { DRIVE_SCOPE, hasScope } from "@/lib/google/scope";

describe("exportFormatFor", () => {
  it("exports Google Docs and Slides as PDF", () => {
    assert.deepEqual(exportFormatFor("application/vnd.google-apps.document"), {
      mimeType: "application/pdf", extension: ".pdf",
    });
    assert.equal(exportFormatFor("application/vnd.google-apps.presentation")?.extension, ".pdf");
  });

  it("exports Sheets as xlsx", () => {
    assert.equal(exportFormatFor("application/vnd.google-apps.spreadsheet")?.extension, ".xlsx");
  });

  it("leaves real files alone", () => {
    assert.equal(exportFormatFor("application/pdf"), null);
    assert.equal(exportFormatFor("image/png"), null);
  });
});

describe("importedFileName", () => {
  it("gives an exported Google Doc its new extension", () => {
    assert.equal(importedFileName("Tour Budget", "application/vnd.google-apps.document"), "Tour Budget.pdf");
    assert.equal(importedFileName("Q3 Numbers", "application/vnd.google-apps.spreadsheet"), "Q3 Numbers.xlsx");
  });

  it("does not double up an extension the name already has", () => {
    assert.equal(importedFileName("Deck.pdf", "application/vnd.google-apps.presentation"), "Deck.pdf");
    assert.equal(importedFileName("Deck.PDF", "application/vnd.google-apps.presentation"), "Deck.PDF");
  });

  it("keeps a normal file's name exactly", () => {
    assert.equal(importedFileName("contract.pdf", "application/pdf"), "contract.pdf");
    assert.equal(importedFileName("photo.jpg", "image/jpeg"), "photo.jpg");
  });
});

describe("hasScope", () => {
  it("finds a granted scope in the space-separated list", () => {
    assert.equal(hasScope(`openid email ${DRIVE_SCOPE}`, DRIVE_SCOPE), true);
  });

  it("is false when Drive was never granted or was disconnected", () => {
    assert.equal(hasScope("openid email profile", DRIVE_SCOPE), false);
    assert.equal(hasScope(null, DRIVE_SCOPE), false);
    assert.equal(hasScope("", DRIVE_SCOPE), false);
  });

  it("does not match a scope that merely shares a prefix", () => {
    assert.equal(hasScope("https://www.googleapis.com/auth/drive.file.readonly", DRIVE_SCOPE), false);
  });
});
