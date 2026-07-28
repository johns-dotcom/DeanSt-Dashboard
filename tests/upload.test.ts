import { describe, it, expect } from "vitest";
import { validateUpload, dispositionFor, MAX_UPLOAD_BYTES } from "@/lib/upload";

// Minimal Blob-like stand-in: validateUpload only reads size and type.
function fakeFile(size: number, type: string): Blob {
  return { size, type } as Blob;
}

describe("validateUpload", () => {
  it("accepts a normal PDF", () => {
    expect(validateUpload(fakeFile(1000, "application/pdf"), "contract.pdf")).toBeNull();
  });

  it("accepts common images and office docs", () => {
    expect(validateUpload(fakeFile(1000, "image/png"), "scan.png")).toBeNull();
    expect(
      validateUpload(
        fakeFile(1000, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        "budget.xlsx"
      )
    ).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUpload(fakeFile(0, "application/pdf"), "empty.pdf")).toMatch(/empty/i);
  });

  it("rejects files over the size cap", () => {
    expect(validateUpload(fakeFile(MAX_UPLOAD_BYTES + 1, "application/pdf"), "big.pdf")).toMatch(/too large/i);
  });

  it("rejects HTML by content type", () => {
    expect(validateUpload(fakeFile(100, "text/html"), "page.pdf")).toMatch(/allowed/i);
  });

  it("rejects SVG/HTML by extension even if the type is spoofed", () => {
    expect(validateUpload(fakeFile(100, "application/pdf"), "evil.svg")).toMatch(/allowed/i);
    expect(validateUpload(fakeFile(100, "image/png"), "evil.html")).toMatch(/allowed/i);
  });

  it("accepts octet-stream (never rendered inline) but not with a dangerous extension", () => {
    expect(validateUpload(fakeFile(100, "application/octet-stream"), "data.bin")).toBeNull();
    expect(validateUpload(fakeFile(100, "application/octet-stream"), "data.html")).toMatch(/allowed/i);
  });

  it("ignores charset parameters on the content type", () => {
    expect(validateUpload(fakeFile(100, "text/plain; charset=utf-8"), "notes.txt")).toBeNull();
  });
});

describe("dispositionFor", () => {
  it("forces attachment when inline is not requested", () => {
    expect(dispositionFor(false, "application/pdf")).toBe("attachment");
  });

  it("allows inline for render-safe types when requested", () => {
    expect(dispositionFor(true, "application/pdf")).toBe("inline");
    expect(dispositionFor(true, "image/png")).toBe("inline");
  });

  it("forces attachment for non-render-safe types even when inline is requested", () => {
    expect(dispositionFor(true, "text/html")).toBe("attachment");
    expect(dispositionFor(true, "image/svg+xml")).toBe("attachment");
    expect(dispositionFor(true, "application/octet-stream")).toBe("attachment");
  });
});
