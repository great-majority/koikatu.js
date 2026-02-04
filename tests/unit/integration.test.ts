import { describe, expect, it } from 'vitest';
import {
  isCard,
  parseCard,
  parseCardSummary,
  parseHeader,
  scanPngIend,
} from '../../src/index.js';
import { buildCardPayload, buildCardWithPng, MINIMAL_PNG } from './helpers.js';

describe('parseCard', () => {
  it('should parse a card with PNG and blocks', () => {
    const cardData = buildCardWithPng({
      blocks: [
        {
          name: 'Parameter',
          version: '0.0.5',
          data: { lastname: 'Tanaka', firstname: 'Yuki', sex: 1 },
        },
        { name: 'Custom', version: '0.0.2', data: { face: 'data' } },
      ],
    });

    const card = parseCard(cardData);
    expect(card.header.header).toBe('【KoiKatuChara】');
    expect(card.header.productNo).toBe(100);
    expect(card.blockIndex).toHaveLength(2);
    expect(card.blocks.Parameter).toBeDefined();
    expect(card.blocks.Parameter.lastname).toBe('Tanaka');
    expect(card.blocks.Custom).toBeDefined();
  });

  it('should parse a card without PNG', () => {
    const payload = buildCardPayload({
      blocks: [{ name: 'Parameter', version: '0.0.5', data: { test: 1 } }],
    });

    const card = parseCard(payload, { containsPng: false });
    expect(card.header.header).toBe('【KoiKatuChara】');
    expect(card.blocks.Parameter.test).toBe(1);
  });

  it('should handle unsupported header in lenient mode', () => {
    const cardData = buildCardWithPng({
      header: '【NewGame】',
      blocks: [{ name: 'Test', version: '1.0.0', data: {} }],
    });

    const card = parseCard(cardData);
    expect(card.unsupportedHeader).toBe(true);
    expect(card.header.header).toBe('【NewGame】');
  });

  it('should return raw block bytes', () => {
    const cardData = buildCardWithPng({
      blocks: [{ name: 'Parameter', version: '0.0.5', data: { val: 42 } }],
    });

    const card = parseCard(cardData);
    expect(card.rawBlockBytes).toBeDefined();
    expect(card.rawBlockBytes?.Parameter).toBeInstanceOf(Uint8Array);
  });
});

describe('parseCardSummary', () => {
  it('should produce a card summary', () => {
    const cardData = buildCardWithPng({
      header: '【KoiKatuChara】',
      blocks: [
        {
          name: 'Parameter',
          version: '0.0.5',
          data: {
            lastname: 'Suzuki',
            firstname: 'Mai',
            sex: 0,
            birthday: { month: 3, day: 15 },
          },
        },
        { name: 'KKEx', version: '0.0.0', data: {} },
      ],
    });

    const summary = parseCardSummary(cardData);
    expect(summary.product).toBe('【KoiKatuChara】');
    expect(summary.name).toBe('Suzuki Mai');
    expect(summary.sex).toBe(0);
    expect(summary.birthday).toEqual({ month: 3, day: 15 });
    expect(summary.hasKKEx).toBe(true);
    expect(summary.blocks).toContain('Parameter');
    expect(summary.blocks).toContain('KKEx');
  });

  it('should detect honeycome product', () => {
    const cardData = buildCardWithPng({
      header: '【HCChara】',
      blocks: [{ name: 'Parameter', version: '0.0.1', data: {} }],
    });

    const summary = parseCardSummary(cardData);
    expect(summary.product).toBe('【HCChara】');
    expect(summary.hasKKEx).toBe(false);
  });
});

describe('parseHeader (public)', () => {
  it('should extract header from card with PNG', () => {
    const cardData = buildCardWithPng();
    const header = parseHeader(cardData);
    expect(header.header).toBe('【KoiKatuChara】');
    expect(header.version).toBe('0.0.0');
  });
});

describe('isCard', () => {
  it('should return true for valid card data', () => {
    const cardData = buildCardWithPng();
    expect(isCard(cardData)).toBe(true);
  });

  it('should return false for non-card data', () => {
    expect(isCard(new Uint8Array([0x00, 0x01, 0x02]))).toBe(false);
  });

  it('should return false for plain PNG without payload', () => {
    expect(isCard(MINIMAL_PNG)).toBe(false);
  });
});

describe('scanPngIend (public)', () => {
  it('should return IEND offset', () => {
    const cardData = buildCardWithPng();
    const offset = scanPngIend(cardData);
    expect(offset).toBe(MINIMAL_PNG.length);
  });
});
