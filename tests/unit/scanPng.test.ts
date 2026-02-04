import { describe, expect, it } from 'vitest';
import { scanPngIend } from '../../src/parse/scanPng.js';
import { MINIMAL_PNG } from './helpers.js';

describe('scanPngIend', () => {
  it('should find IEND offset in a valid PNG', () => {
    const offset = scanPngIend(MINIMAL_PNG);
    expect(offset).toBe(MINIMAL_PNG.length);
  });

  it('should find IEND when extra data follows', () => {
    const extra = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const combined = new Uint8Array(MINIMAL_PNG.length + extra.length);
    combined.set(MINIMAL_PNG);
    combined.set(extra, MINIMAL_PNG.length);
    const offset = scanPngIend(combined);
    expect(offset).toBe(MINIMAL_PNG.length);
  });

  it('should throw on non-PNG data', () => {
    const data = new Uint8Array([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    ]);
    expect(() => scanPngIend(data)).toThrow('Invalid PNG magic bytes');
  });

  it('should throw on data too short', () => {
    const data = new Uint8Array([0x89, 0x50]);
    expect(() => scanPngIend(data)).toThrow('Data too short');
  });

  it('should throw on truncated chunk', () => {
    // Valid PNG magic + full chunk header (length=13 + "IHDR") but data truncated
    // Need offset+12 <= length to enter the loop, then chunkTotal > remaining
    const data = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG magic (8 bytes)
      0x00,
      0x00,
      0x00,
      0x0d, // length = 13
      0x49,
      0x48,
      0x44,
      0x52, // "IHDR"
      0x00,
      0x00,
      0x00,
      0x01, // partial data (only 4 bytes of 13)
    ]);
    expect(() => scanPngIend(data)).toThrow('Truncated PNG chunk');
  });
});
