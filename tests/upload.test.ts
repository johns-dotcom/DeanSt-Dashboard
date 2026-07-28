import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateUpload, dispositionFor, MAX_UPLOAD_BYTES } from "../lib/upload.ts";

// Minimal Blob-like stand-in: validateUpload only reads size and type.
function fakeFile(size: number, type: string): Blob {
  return { size, type } as Blob;
}

describe("validateUpload", () => {
  it("accepts a normal PDF", () => {
    assert.equal(validateUpload(fakeFile(1000, "application/pdf"), "contract.pdf"), null);
  });

  it("accepts common images and office docs", () => {
    assert.equal(validateUpload(fakeFile(1000, "image/png"), "scan.png"), null);
    assert.equal(
      validateUpload(
        fakeFile(1000, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        "budget.xlsx"
      ),
      null
    );
  });

  it("rejects an empty file", () => {
    assert.match(validateUpload(fakeFile(0, "application/pdf"), "empty.pdf") ?? "", /empty/i);
  });

  it("rejects files over the size cap", () => {
    assert.match(validateUpload(fakeFile(MAX_UPLOAD_BYTES + 1, "application/pdf"), "big.pdf") ?? "", /too large/i);
  });

  it("rejects HTML by content type", () => {
    assert.match(validateUpload(fakeFile(100, "text/html"), "page.pdf") ?? "", /allowed/i);
  });

  it("rejects SVG/HTML by extension even if the type is spoofed", () => {
    assert.match(validateUpload(fakeFile(100, "application/pdf"), "evil.svg") ?? "", /allowed/i);
    assert.match(validateUpload(fakeFile(100, "image/png"), "evil.html") ?? "", /allowed/i);
  });

  it("accepts octet-stream but not with a dangerous extension", () => {
    assert.equal(validateUpload(fakeFile(100, "application/octet-stream"), "data.bin"), null);
    assert.match(validateUpload(fakeFile(100, "application/octet-stream"), "data.html") ?? "", /allowed/i);
  });

  it("ignores charset parameters on the content type", () => {
    assert.equal(validateUpload(fakeFile(100, "text/plain; charset=utf-8"), "notes.txt"), null);
  });
});

describe("dispositionFor", () => {
  it("forces attachment when inline is not requested", () => {
    assert.equal(dispositionFor(false, "application/pdf"), "attachment");
  });

  it("allows inline for render-safe types when requested", () => {
    assert.equal(dispositionFor(true, "application/pdf"), "inline");
    assert.equal(dispositionFor(true, "image/png"), "inline");
  });

  it("forces attachment for non-render-safe types even when inline is requested", () => {
    assert.equal(dispositionFor(true, "text/html"), "attachment");
    assert.equal(dispositionFor(true, "image/svg+xml"), "attachment");
    assert.equal(dispositionFor(true, "application/octet-stream"), "attachment");
  });
});
