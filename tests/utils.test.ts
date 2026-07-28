import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatFileSize } from "../lib/utils.ts";

describe("formatFileSize", () => {
  it("formats bytes", () => {
    assert.equal(formatFileSize(0), "0 B");
    assert.equal(formatFileSize(512), "512 B");
    assert.equal(formatFileSize(1023), "1023 B");
  });
  it("formats kilobytes with no decimals", () => {
    assert.equal(formatFileSize(1024), "1 KB");
    assert.equal(formatFileSize(34_560), "34 KB");
  });
  it("formats megabytes with one decimal", () => {
    assert.equal(formatFileSize(1024 * 1024), "1.0 MB");
    assert.equal(formatFileSize(1.25 * 1024 * 1024), "1.3 MB");
  });
});
