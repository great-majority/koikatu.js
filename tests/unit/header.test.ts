import { describe, expect, it } from 'vitest';
import { parseHeader } from '../../src/parse/header.js';
import { BinaryReader } from '../../src/parse/reader.js';
import { buildCardPayload } from './helpers.js';

describe('parseHeader', () => {
  it('should parse a valid KoiKatu header', () => {
    const payload = buildCardPayload({
      productNo: 100,
      header: '【KoiKatuChara】',
      version: '0.0.5',
    });
    const reader = new BinaryReader(payload);
    const result = parseHeader(reader);

    expect(result.header.productNo).toBe(100);
    expect(result.header.header).toBe('【KoiKatuChara】');
    expect(result.header.version).toBe('0.0.5');
    expect(result.header.faceImage).toBeDefined();
    expect(result.unsupportedHeader).toBeUndefined();
  });

  it('should parse HCChara header', () => {
    const payload = buildCardPayload({ header: '【HCChara】' });
    const reader = new BinaryReader(payload);
    const result = parseHeader(reader);
    expect(result.header.header).toBe('【HCChara】');
    expect(result.unsupportedHeader).toBeUndefined();
  });

  it('should set unsupportedHeader for unknown headers', () => {
    const headerStr = '【Unknown】';
    const payload = buildCardPayload({ header: headerStr });
    const reader = new BinaryReader(payload);
    const result = parseHeader(reader);
    expect(result.unsupportedHeader).toBe(true);
  });

  it('should throw on unknown header in strict mode', () => {
    const payload = buildCardPayload({ header: '【Unknown】' });
    const reader = new BinaryReader(payload);
    expect(() => parseHeader(reader, { strict: true })).toThrow(
      'Unsupported header',
    );
  });

  it('should throw on empty data', () => {
    const reader = new BinaryReader(new Uint8Array(0));
    expect(() => parseHeader(reader)).toThrow('Failed to read product number');
  });
});
