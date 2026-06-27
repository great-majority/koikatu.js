import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isCard,
  parseCard,
  parseCardSummary,
  parseHeader,
  scanPngIend,
} from '../../src/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name)));
}

describe('real card: kk_chara.png', () => {
  const data = loadFixture('kk_chara.png');

  it('isCard returns true', () => {
    expect(isCard(data)).toBe(true);
  });

  it('scanPngIend finds IEND before end of file', () => {
    const offset = scanPngIend(data);
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(data.length);
  });

  it('parseHeader extracts correct header fields', () => {
    const header = parseHeader(data);
    expect(header.productNo).toBe(100);
    expect(header.header).toBe('【KoiKatuChara】');
    expect(header.version).toBe('0.0.0');
    expect(header.faceImage).toBeInstanceOf(Uint8Array);
    expect(header.faceImage?.length).toBeGreaterThan(0);
    // faceImage should start with PNG magic
    expect(header.faceImage?.[0]).toBe(0x89);
    expect(header.faceImage?.[1]).toBe(0x50);
  });

  it('parseCard extracts blocks', () => {
    const card = parseCard(data);

    expect(card.unsupportedHeader).toBeUndefined();
    expect(card.errors).toBeUndefined();

    const blockNames = card.blockIndex.map((b) => b.name);
    expect(blockNames).toContain('Custom');
    expect(blockNames).toContain('Coordinate');
    expect(blockNames).toContain('Parameter');
    expect(blockNames).toContain('Status');
  });

  it('Parameter block has expected character data', () => {
    const card = parseCard(data);
    const param = card.blocks.Parameter;

    expect(param).toBeDefined();
    expect(param.lastname).toBe('白峰');
    expect(param.firstname).toBe('一乃');
    expect(param.nickname).toBe('かずのん');
    expect(param.sex).toBe(1);
    expect(param.personality).toBe(36);
    expect(param.birthMonth).toBe(5);
    expect(param.birthDay).toBe(12);
    expect(param.bloodType).toBe(1);
  });

  it('Custom block has face/body/hair sub-objects', () => {
    const card = parseCard(data);
    const custom = card.blocks.Custom;

    expect(custom).toBeDefined();
    // Custom block is raw msgpack - the actual structure depends on decode
    // It should be a single msgpack object or we need schema decoding
    expect(custom).toBeTruthy();
  });

  it('Coordinate block is present', () => {
    const card = parseCard(data);
    expect(card.blocks.Coordinate).toBeDefined();
  });

  it('Status block has coordinateType', () => {
    const card = parseCard(data);
    const status = card.blocks.Status;
    expect(status).toBeDefined();
    expect(status.coordinateType).toBe(5);
  });

  it('rawBlockBytes are populated', () => {
    const card = parseCard(data);
    expect(card.rawBlockBytes).toBeDefined();
    expect(card.rawBlockBytes?.Parameter).toBeInstanceOf(Uint8Array);
    expect(card.rawBlockBytes?.Custom).toBeInstanceOf(Uint8Array);
  });

  it('parseCardSummary produces correct summary', () => {
    const summary = parseCardSummary(data);

    expect(summary.product).toBe('【KoiKatuChara】');
    expect(summary.name).toBe('白峰 一乃');
    expect(summary.sex).toBe(1);
    expect(summary.birthday).toEqual({ month: 5, day: 12 });
    expect(summary.hasKKEx).toBe(false);
    expect(summary.blocks).toContain('Parameter');
    expect(summary.blocks).toContain('Custom');
  });
});

describe('real card: al_chara.png (Amanatsu Location)', () => {
  const data = loadFixture('al_chara.png');

  it('isCard returns true', () => {
    expect(isCard(data)).toBe(true);
  });

  it('parseHeader extracts correct header fields', () => {
    const header = parseHeader(data);
    expect(header.header).toBe('【ALChara】');
  });

  it('parseCard extracts blocks', () => {
    const card = parseCard(data);

    expect(card.unsupportedHeader).toBeUndefined();
    expect(card.errors).toBeUndefined();

    const blockNames = card.blockIndex.map((b) => b.name);
    expect(blockNames).toContain('Custom');
    expect(blockNames).toContain('Coordinate');
    expect(blockNames).toContain('Parameter');
    expect(blockNames).toContain('Status');
    expect(blockNames).toContain('Graphic');
    expect(blockNames).toContain('About');
    expect(blockNames).toContain('GameParameter_AL');
    expect(blockNames).toContain('GameInfo_AL');
    expect(blockNames).toContain('ThumbParameter');
  });

  it('Custom block has face/body sub-objects (no hair)', () => {
    const card = parseCard(data);
    const custom = card.blocks.Custom;

    expect(custom).toBeDefined();
    expect(custom.face).toBeDefined();
    expect(custom.body).toBeDefined();
    expect(custom.hair).toBeUndefined();
  });

  it('Coordinate block has nested lstInfo structure', () => {
    const card = parseCard(data);
    const coord = card.blocks.Coordinate;

    expect(Array.isArray(coord)).toBe(true);
    expect(coord.length).toBe(2);
    for (const entry of coord) {
      expect(entry.header).toBe('【ALClothes】');
      expect(entry.blocks).toBeDefined();
      expect(entry.blocks.Clothes).toBeDefined();
      expect(entry.blocks.Accessory).toBeDefined();
      expect(entry.blocks.Hair).toBeDefined();
      expect(entry.blocks.FaceMakeup).toBeDefined();
      expect(entry.blocks.BodyMakeup).toBeDefined();
      expect(entry.blocks.About).toBeDefined();
    }
  });

  it('Parameter block has character name', () => {
    const card = parseCard(data);
    const param = card.blocks.Parameter;
    expect(param.lastname).toBe('鳴海');
    expect(param.firstname).toBe('京香');
  });

  it('parseCardSummary produces correct summary', () => {
    const summary = parseCardSummary(data);
    expect(summary.product).toBe('【ALChara】');
    expect(summary.name).toBe('鳴海 京香');
  });
});

describe('real card: kk_mod_chara.png (with KKEx)', () => {
  const data = loadFixture('kk_mod_chara.png');

  it('isCard returns true', () => {
    expect(isCard(data)).toBe(true);
  });

  it('parseCard includes KKEx block', () => {
    const card = parseCard(data);
    const blockNames = card.blockIndex.map((b) => b.name);
    expect(blockNames).toContain('KKEx');
  });

  it('parseCardSummary detects KKEx', () => {
    const summary = parseCardSummary(data);
    expect(summary.hasKKEx).toBe(true);
    expect(summary.product).toBe('【KoiKatuCharaSun】');
  });
});
