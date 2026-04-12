import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Card } from '../../src/index.js';
import {
  convertCard,
  parseCard,
  serializeCard,
  transformCard,
} from '../../src/index.js';
import { buildCardWithPng, MINIMAL_PNG } from './helpers.js';

/** Create a Card with a raw Custom block structure without binary encoding. */
function makeCardWithCustom(
  header: string,
  custom: Record<string, any>,
  extraBlocks: Record<string, any> = {},
  extraBlockIndex: Array<{ name: string; version: string }> = [],
): Card {
  return {
    header: { productNo: 100, header, version: '0.0.0' },
    blocks: { Custom: custom, Status: {}, ...extraBlocks },
    blockIndex: [
      { name: 'Custom', version: '0.0.2', pos: 0, size: 0 },
      { name: 'Status', version: '0.0.0', pos: 0, size: 0 },
      ...extraBlockIndex.map((b) => ({ ...b, pos: 0, size: 0 })),
    ],
  };
}

const FIXTURES = resolve(import.meta.dirname, '../fixtures');

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name)));
}

// ============================================================
// Koikatsu <-> Koikatsu Sunshine
// ============================================================

describe('transformCard: KK → KKS', () => {
  it('header が KoiKatuCharaSun になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuChara】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.5',
            data: {
              lastname: '白峰',
              firstname: '一乃',
              attribute: {
                hinnyo: true,
                harapeko: false,
                donkan: false,
                choroi: false,
                bitch: false,
                mutturi: false,
                dokusyo: false,
                ongaku: false,
                kappatu: true,
                ukemi: false,
                friendly: false,
                kireizuki: false,
                taida: true,
                sinsyutu: false,
                hitori: false,
                undo: false,
                majime: false,
                likeGirls: false,
              },
            },
          },
          {
            name: 'Custom',
            version: '0.0.2',
            data: {
              face: { version: '0.0.2', hlUpY: 0.5 },
              hair: { version: '0.0.4', parts: [{ color: [1, 0, 0, 1] }] },
            },
          },
          {
            name: 'Status',
            version: '0.0.0',
            data: { eyesBlink: false, mouthPtn: 1 },
          },
        ],
      }),
    );
    const result = transformCard(card, 'KKS');

    expect(result.header.header).toBe('【KoiKatuCharaSun】');
  });

  it('About ブロックが追加される', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuChara】',
        blocks: [
          { name: 'Parameter', version: '0.0.5', data: { attribute: {} } },
          { name: 'Status', version: '0.0.0', data: {} },
        ],
      }),
    );
    const result = transformCard(card, 'KKS');

    expect(result.blockIndex.map((b) => b.name)).toContain('About');
    expect(result.blocks.About).toBeDefined();
    expect(result.blocks.About.userID).toBeTruthy();
  });

  it('Parameter.version が 0.0.6 になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuChara】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.5',
            data: {
              attribute: {
                kappatu: true,
                taida: false,
                hinnyo: false,
                harapeko: false,
                donkan: false,
                choroi: false,
                bitch: false,
                mutturi: false,
                dokusyo: false,
                ongaku: false,
                ukemi: false,
                friendly: false,
                kireizuki: false,
                sinsyutu: false,
                hitori: false,
                undo: false,
                majime: false,
                likeGirls: false,
              },
            },
          },
          { name: 'Status', version: '0.0.0', data: {} },
        ],
      }),
    );
    const result = transformCard(card, 'KKS');

    expect(result.blocks.Parameter.version).toBe('0.0.6');
    expect(result.blocks.Parameter.interest).toEqual({ answer: [-1, -1] });
    // kappatu -> active, taida -> nonbiri
    expect(result.blocks.Parameter.attribute.active).toBe(true);
    expect(result.blocks.Parameter.attribute.nonbiri).toBe(false);
  });

  it('Custom.face に hlUpX/hlDownX が追加される', () => {
    // Build the Card directly because the Custom block uses a special binary format.
    const card = makeCardWithCustom('【KoiKatuChara】', {
      face: { version: '0.0.2', hlUpY: 0.5 },
      hair: { version: '0.0.4', parts: [{ color: [1, 0, 0, 1] }] },
    });
    const result = transformCard(card, 'KKS');

    expect(result.blocks.Custom.face.version).toBe('0.0.3');
    expect(result.blocks.Custom.face.hlUpX).toBe(0.5);
    expect(result.blocks.Custom.face.hlDownX).toBe(0.5);
    expect(result.blocks.Custom.hair.version).toBe('0.0.5');
  });
});

describe('transformCard: KKS → KK', () => {
  it('header が KoiKatuChara になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuCharaSun】',
        blocks: [
          {
            name: 'About',
            version: '0.0.0',
            data: { version: '0.0.0', language: 0, userID: 'u1', dataID: 'd1' },
          },
          {
            name: 'Parameter',
            version: '0.0.6',
            data: {
              attribute: {
                active: true,
                nonbiri: false,
                harapeko: false,
                choroi: false,
                dokusyo: false,
                ongaku: false,
                okute: false,
                friendly: false,
                kireizuki: false,
                sinsyutu: false,
                hitori: false,
                majime: false,
                info: false,
                love: false,
                talk: false,
                nakama: false,
                nonbiri2: false,
                hinnyo: false,
                likeGirls: false,
                bitch: false,
                mutturi: false,
                lonely: false,
                ukemi: false,
                undo: false,
              },
              interest: { answer: [-1, -1] },
            },
          },
          {
            name: 'Custom',
            version: '0.0.0',
            data: {
              face: { version: '0.0.3', hlUpX: 0.5, hlDownX: 0.5 },
              hair: {
                version: '0.0.5',
                parts: [{ glossColor: [0.85, 0.85, 0.85, 1.0] }],
              },
            },
          },
          { name: 'Status', version: '0.0.0', data: {} },
        ],
      }),
    );
    const result = transformCard(card, 'KK');

    expect(result.header.header).toBe('【KoiKatuChara】');
    expect(result.blockIndex.map((b) => b.name)).not.toContain('About');
  });

  it('Parameter.version が 0.0.5、interest が削除される', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuCharaSun】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.6',
            data: {
              attribute: {
                active: false,
                nonbiri: true,
                harapeko: false,
                choroi: false,
                dokusyo: false,
                ongaku: false,
                okute: false,
                friendly: false,
                kireizuki: false,
                sinsyutu: false,
                hitori: false,
                majime: false,
                info: false,
                love: false,
                talk: false,
                nakama: false,
                hinnyo: false,
                likeGirls: false,
                bitch: false,
                mutturi: false,
                lonely: false,
                ukemi: false,
                undo: false,
              },
              interest: { answer: [1, 2] },
            },
          },
          { name: 'Status', version: '0.0.0', data: {} },
        ],
      }),
    );
    const result = transformCard(card, 'KK');

    expect(result.blocks.Parameter.version).toBe('0.0.5');
    expect(result.blocks.Parameter.interest).toBeUndefined();
    // active -> kappatu, nonbiri -> taida
    expect(result.blocks.Parameter.attribute.kappatu).toBe(false);
    expect(result.blocks.Parameter.attribute.taida).toBe(true);
  });

  it('Custom.face から hlUpX/hlDownX が削除される', () => {
    // Build the Card directly because the Custom block uses a special binary format.
    const card = makeCardWithCustom('【KoiKatuCharaSun】', {
      face: { version: '0.0.3', hlUpX: 0.5, hlDownX: 0.5 },
      hair: { version: '0.0.5', parts: [{ glossColor: [1, 1, 1, 1] }] },
    });
    // Match the blockIndex Custom version to the Koikatsu Sunshine format.
    card.blockIndex[0].version = '0.0.0';
    const result = transformCard(card, 'KK');

    expect(result.blocks.Custom.face.version).toBe('0.0.2');
    expect(result.blocks.Custom.face.hlUpX).toBeUndefined();
    expect(result.blocks.Custom.hair.version).toBe('0.0.4');
    expect(result.blocks.Custom.hair.parts[0].glossColor).toBeUndefined();
  });
});

// ============================================================
// Koikatsu <-> Emotion Creators
// ============================================================

describe('transformCard: KK → EC', () => {
  it('header が Emocre になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuChara】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.5',
            data: { lastname: '白峰', firstname: '一乃' },
          },
          { name: 'Coordinate', version: '0.0.0', data: [] },
          { name: 'Status', version: '0.0.0', data: {} },
        ],
      }),
    );
    const result = transformCard(card, 'EC');
    expect(result.header.header).toBe('【EroMakeChara】');
    expect(result.header.productNo).toBe(200);
  });

  it('Parameter fullname が設定される', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuChara】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.5',
            data: { lastname: '白峰', firstname: '一乃' },
          },
          { name: 'Coordinate', version: '0.0.0', data: [] },
          { name: 'Status', version: '0.0.0', data: { coordinateType: 4 } },
        ],
      }),
    );
    const result = transformCard(card, 'EC');
    expect(result.blocks.Parameter.fullname).toBe('白峰 一乃');
    expect(result.blocks.Parameter.lastname).toBeUndefined();
    expect(result.blocks.Parameter.firstname).toBeUndefined();
  });

  it('blockIndex の Coordinate version が 0.0.1 になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【KoiKatuChara】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.5',
            data: { lastname: 'A', firstname: 'B' },
          },
          { name: 'Coordinate', version: '0.0.0', data: [] },
          { name: 'Status', version: '0.0.0', data: {} },
        ],
      }),
    );
    const result = transformCard(card, 'EC');
    const coordInfo = result.blockIndex.find((b) => b.name === 'Coordinate');
    expect(coordInfo?.version).toBe('0.0.1');
  });
});

describe('transformCard: EC → KK', () => {
  it('header が KoiKatuChara になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【EroMakeChara】',
        blocks: [
          {
            name: 'Parameter',
            version: '0.0.0',
            data: { fullname: '白峰一乃' },
          },
          {
            name: 'Coordinate',
            version: '0.0.1',
            data: { clothes: { parts: [] }, accessory: { parts: [] } },
          },
          { name: 'Status', version: '0.0.1', data: { mouthOpenMin: 0 } },
        ],
      }),
    );
    const result = transformCard(card, 'KK');
    expect(result.header.header).toBe('【KoiKatuChara】');
  });

  it('Coordinate が 7 要素の配列になる', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【EroMakeChara】',
        blocks: [
          { name: 'Parameter', version: '0.0.0', data: { fullname: 'test' } },
          {
            name: 'Coordinate',
            version: '0.0.1',
            data: { clothes: { parts: [] }, accessory: { parts: [] } },
          },
          { name: 'Status', version: '0.0.1', data: { mouthOpenMin: 0 } },
        ],
      }),
    );
    const result = transformCard(card, 'KK');
    expect(Array.isArray(result.blocks.Coordinate)).toBe(true);
    expect(result.blocks.Coordinate).toHaveLength(7);
  });

  it('Parameter が KK 形式になる（fullname → firstname）', () => {
    const card = parseCard(
      buildCardWithPng({
        header: '【EroMakeChara】',
        blocks: [
          { name: 'Parameter', version: '0.0.0', data: { fullname: '一乃' } },
          {
            name: 'Coordinate',
            version: '0.0.1',
            data: { clothes: { parts: [] }, accessory: { parts: [] } },
          },
          { name: 'Status', version: '0.0.1', data: { mouthOpenMin: 0 } },
        ],
      }),
    );
    const result = transformCard(card, 'KK');
    expect(result.blocks.Parameter.firstname).toBe('一乃');
    expect(result.blocks.Parameter.fullname).toBeUndefined();
  });
});

// ============================================================
// Round-trip: serializeCard -> parseCard
// ============================================================

describe('serializeCard round-trip', () => {
  it('KK → KKS → serialize → re-parse で header が保持される', () => {
    const original = buildCardWithPng({
      header: '【KoiKatuChara】',
      blocks: [
        {
          name: 'Parameter',
          version: '0.0.5',
          data: { lastname: 'A', firstname: 'B', attribute: {} },
        },
        { name: 'Status', version: '0.0.0', data: {} },
      ],
    });
    const card = parseCard(original);
    const converted = transformCard(card, 'KKS');
    const bytes = serializeCard(converted, MINIMAL_PNG);

    const reparsed = parseCard(bytes);
    expect(reparsed.header.header).toBe('【KoiKatuCharaSun】');
    expect(reparsed.blocks.Parameter?.lastname).toBe('A');
    expect(reparsed.blocks.About).toBeDefined();
  });

  it('KK → EC → serialize → re-parse で fullname が保持される', () => {
    const original = buildCardWithPng({
      header: '【KoiKatuChara】',
      blocks: [
        {
          name: 'Parameter',
          version: '0.0.5',
          data: { lastname: '白峰', firstname: '一乃' },
        },
        { name: 'Coordinate', version: '0.0.0', data: [] },
        { name: 'Status', version: '0.0.0', data: { coordinateType: 0 } },
      ],
    });
    const card = parseCard(original);
    const converted = transformCard(card, 'EC');
    const bytes = serializeCard(converted, MINIMAL_PNG);

    const reparsed = parseCard(bytes);
    expect(reparsed.header.header).toBe('【EroMakeChara】');
    expect(reparsed.blocks.Parameter?.fullname).toBe('白峰 一乃');
  });
});

// ============================================================
// convertCard end-to-end
// ============================================================

describe('convertCard with real card fixtures', () => {
  it('kk_chara.png を KKS に変換して re-parse できる', () => {
    const data = loadFixture('kk_chara.png');
    const result = convertCard(data, 'KKS');
    const reparsed = parseCard(result);

    expect(reparsed.header.header).toBe('【KoiKatuCharaSun】');
    expect(reparsed.blocks.Parameter?.lastname).toBe('白峰');
    expect(reparsed.blocks.About).toBeDefined();
  });

  it('kk_mod_chara.png (KKS) を KK に変換して re-parse できる', () => {
    const data = loadFixture('kk_mod_chara.png');
    const result = convertCard(data, 'KK');
    const reparsed = parseCard(result);

    expect(reparsed.header.header).toBe('【KoiKatuChara】');
    expect(reparsed.blockIndex.map((b) => b.name)).not.toContain('About');
  });
});

// ============================================================
// Error cases
// ============================================================

describe('transformCard エラー', () => {
  it('同じタイトルへの変換はエラー', () => {
    const card = parseCard(
      buildCardWithPng({ header: '【KoiKatuChara】', blocks: [] }),
    );
    expect(() => transformCard(card, 'KK')).toThrow();
  });

  it('KK シリーズ → HC シリーズはエラー', () => {
    const card = parseCard(
      buildCardWithPng({ header: '【KoiKatuChara】', blocks: [] }),
    );
    expect(() => transformCard(card, 'HC')).toThrow();
  });
});
