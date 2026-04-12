import type { BlockInfo, Card } from '../types.js';

// ============================================================
// 属性キー定義
// ============================================================

const KK_ATTRIBUTE_KEYS = [
  'hinnyo',
  'harapeko',
  'donkan',
  'choroi',
  'bitch',
  'mutturi',
  'dokusyo',
  'ongaku',
  'kappatu',
  'ukemi',
  'friendly',
  'kireizuki',
  'taida',
  'sinsyutu',
  'hitori',
  'undo',
  'majime',
  'likeGirls',
] as const;

const KKS_ATTRIBUTE_KEYS = [
  'harapeko',
  'choroi',
  'dokusyo',
  'ongaku',
  'okute',
  'friendly',
  'kireizuki',
  'sinsyutu',
  'hitori',
  'active',
  'majime',
  'info',
  'love',
  'talk',
  'nakama',
  'nonbiri',
  'hinnyo',
  'likeGirls',
  'bitch',
  'mutturi',
  'lonely',
  'ukemi',
  'undo',
] as const;

// EC Parameter にある KK 固有フィールド（KK→EC 変換時に削除）
const KK_ONLY_PARAMETER_FIELDS = [
  'lastname',
  'firstname',
  'nickname',
  'callType',
  'clubActivities',
  'weakPoint',
  'awnser',
  'denial',
  'attribute',
  'aggressive',
  'diligence',
  'kindness',
];

// KKS デフォルト hairGlossColor
const KKS_HAIR_GLOSS_COLOR = [
  0.8509804010391235, 0.8509804010391235, 0.8509804010391235, 1.0,
];

// ============================================================
// ヘルパー
// ============================================================

function cloneCard(card: Card): Card {
  return structuredClone(card);
}

function randomUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

function addBlock(
  card: Card,
  name: string,
  version: string,
  data: unknown,
): void {
  // KKEx の直前 or 末尾に挿入
  const kkexIdx = card.blockIndex.findIndex((b) => b.name === 'KKEx');
  const entry: BlockInfo = { name, version, pos: 0, size: 0 };
  if (kkexIdx >= 0) {
    card.blockIndex.splice(kkexIdx, 0, entry);
  } else {
    card.blockIndex.push(entry);
  }
  card.blocks[name] = data;
  if (card.rawBlockBytes) delete card.rawBlockBytes[name];
}

function removeBlock(card: Card, name: string): void {
  card.blockIndex = card.blockIndex.filter((b) => b.name !== name);
  delete card.blocks[name];
  if (card.rawBlockBytes) delete card.rawBlockBytes[name];
}

function updateBlockVersion(card: Card, name: string, version: string): void {
  const info = card.blockIndex.find((b) => b.name === name);
  if (info) info.version = version;
  if (card.rawBlockBytes) delete card.rawBlockBytes[name];
}

function markModified(card: Card, ...names: string[]): void {
  if (!card.rawBlockBytes) return;
  for (const name of names) {
    delete card.rawBlockBytes[name];
  }
}

function getMapHint(card: Card, name: string): any {
  const hint = card.blockHints?.[name];
  return hint?.kind === 'map' ? hint : undefined;
}

function getMapEntryHint(mapHint: any, key: string): any {
  return mapHint?.entries?.find((entry: any) => entry.keyId === key);
}

function ensureMapEntryHint(mapHint: any, key: string, valueHint: any): void {
  if (!mapHint) return;
  const entry = getMapEntryHint(mapHint, key);
  if (entry) {
    entry.valueHint = valueHint;
    return;
  }
  mapHint.entries.push({
    keyId: key,
    keyType: 'string',
    valueHint,
  });
}

function makeIntHint(): any {
  return {
    kind: 'number',
    format: 'int',
  };
}

function makeIntArrayHint(length: number): any {
  return {
    kind: 'array',
    items: Array.from({ length }, () => makeIntHint()),
  };
}

function makeFloatArrayHint(length: number): any {
  return {
    kind: 'array',
    items: Array.from({ length }, () => ({
      kind: 'number',
      format: 'float',
    })),
  };
}

function kkAttrsToKks(attrs: Record<string, boolean>): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of KKS_ATTRIBUTE_KEYS) {
    result[key] = false;
  }
  const shared = new Set(KK_ATTRIBUTE_KEYS as readonly string[]);
  for (const key of KKS_ATTRIBUTE_KEYS) {
    if (shared.has(key)) result[key] = Boolean(attrs[key]);
  }
  result.active = Boolean(attrs.kappatu);
  result.nonbiri = Boolean(attrs.taida);
  return result;
}

function kksAttrsToKk(attrs: Record<string, boolean>): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of KK_ATTRIBUTE_KEYS) {
    result[key] = false;
  }
  const shared = new Set(KKS_ATTRIBUTE_KEYS as readonly string[]);
  for (const key of KK_ATTRIBUTE_KEYS) {
    if (shared.has(key)) result[key] = Boolean(attrs[key]);
  }
  result.kappatu = Boolean(attrs.active);
  result.taida = Boolean(attrs.nonbiri);
  return result;
}

// ============================================================
// KK ↔ KKS
// ============================================================

/** コイカツ → コイカツサンシャイン */
export function kkToKks(card: Card): Card {
  const out = cloneCard(card);

  out.header = {
    ...out.header,
    header: '【KoiKatuCharaSun】',
    version: '0.0.0',
  };
  out.errors = undefined;

  // About ブロック追加
  if (!out.blocks.About) {
    addBlock(out, 'About', '0.0.0', {
      version: '0.0.0',
      language: 0,
      userID: randomUuid(),
      dataID: randomUuid(),
    });
  }

  // Parameter
  const param = out.blocks.Parameter;
  if (param) {
    param.version = '0.0.6';
    param.interest = { answer: [-1, -1] };
    if (param.attribute) {
      param.attribute = kkAttrsToKks(param.attribute);
    }
  }
  updateBlockVersion(out, 'Parameter', '0.0.6');
  markModified(out, 'Parameter');

  // Custom
  const custom = out.blocks.Custom;
  if (custom?.face) {
    custom.face.version = '0.0.3';
    custom.face.hlUpX = 0.5;
    custom.face.hlDownX = 0.5;
  }
  if (custom?.hair) {
    custom.hair.version = '0.0.5';
    for (const part of custom.hair.parts ?? []) {
      part.glossColor = [...KKS_HAIR_GLOSS_COLOR];
    }

    const customHint = getMapHint(out, 'Custom');
    const hairHint = getMapEntryHint(customHint, 'hair')?.valueHint;
    const partsHint = getMapEntryHint(hairHint, 'parts')?.valueHint;
    if (partsHint?.kind === 'array') {
      for (const partHint of partsHint.items) {
        ensureMapEntryHint(partHint, 'glossColor', makeFloatArrayHint(4));
      }
    }
  }
  updateBlockVersion(out, 'Custom', '0.0.0');
  markModified(out, 'Custom');

  // Status
  const status = out.blocks.Status;
  if (status) {
    status.eyesBlink = true;
    status.eyesLookPtn = 0;
    status.mouthFixed = false;
    status.mouthOpenMax = 1.0;
    status.mouthPtn = 0;
    status.neckLookPtn = 0;
    status.visibleSonAlways = true;
  }
  ensureMapEntryHint(getMapHint(out, 'Status'), 'mouthOpenMax', {
    kind: 'number',
    format: 'float',
  });
  markModified(out, 'Status');

  return out;
}

/** コイカツサンシャイン → コイカツ */
export function kksToKk(card: Card): Card {
  const out = cloneCard(card);

  out.header = {
    ...out.header,
    header: '【KoiKatuChara】',
    version: '0.0.0',
  };
  out.errors = undefined;

  // About ブロック削除
  removeBlock(out, 'About');

  // Parameter
  const param = out.blocks.Parameter;
  if (param) {
    param.version = '0.0.5';
    delete param.interest;
    if (param.attribute) {
      param.attribute = kksAttrsToKk(param.attribute);
    }
  }
  updateBlockVersion(out, 'Parameter', '0.0.5');
  markModified(out, 'Parameter');

  // Custom
  const custom = out.blocks.Custom;
  if (custom?.face) {
    custom.face.version = '0.0.2';
    delete custom.face.hlUpX;
    delete custom.face.hlDownX;
  }
  if (custom?.hair) {
    custom.hair.version = '0.0.4';
    for (const part of custom.hair.parts ?? []) {
      delete part.glossColor;
    }
  }
  updateBlockVersion(out, 'Custom', '0.0.0');
  markModified(out, 'Custom');

  // Status
  const status = out.blocks.Status;
  if (status) {
    status.eyesBlink = false;
    status.eyesLookPtn = 1;
    status.mouthFixed = true;
    status.mouthOpenMax = 0.0;
    status.mouthPtn = 1;
    status.neckLookPtn = 3;
    status.visibleSonAlways = false;
  }
  markModified(out, 'Status');

  return out;
}

// ============================================================
// EC ↔ KK
// ============================================================

/** エモーションクリエイターズ → コイカツ */
export function ecToKk(card: Card, pngBytes?: Uint8Array): Card {
  const out = cloneCard(card);

  out.header = {
    productNo: 100,
    header: '【KoiKatuChara】',
    version: '0.0.0',
    faceImage: pngBytes ?? out.header.faceImage ?? new Uint8Array(0),
  };
  out.errors = undefined;

  // Custom
  const custom = out.blocks.Custom;
  if (custom?.face) {
    custom.face.version = '0.0.2';
    if (typeof custom.face.pupilHeight === 'number') {
      custom.face.pupilHeight *= 1.08;
    }
    if (typeof custom.face.hlUpY === 'number') {
      custom.face.hlUpY = (custom.face.hlUpY - 0.25) * 2;
    }
    delete custom.face.hlUpX;
    delete custom.face.hlDownX;
    delete custom.face.hlUpScale;
    delete custom.face.hlDownScale;
  }
  if (custom?.body) {
    custom.body.version = '0.0.2';
  }
  if (custom?.hair) {
    custom.hair.version = '0.0.4';
  }
  updateBlockVersion(out, 'Custom', '0.0.0');
  markModified(out, 'Custom');

  // Coordinate: 単一オブジェクト (EC v0.0.1) → 配列 (KK v0.0.0)
  const ecCoord = out.blocks.Coordinate;
  const coordData = Array.isArray(ecCoord) ? ecCoord[0] : ecCoord;
  if (coordData) {
    const clothes = structuredClone(coordData.clothes ?? {});
    const accessory = structuredClone(coordData.accessory ?? {});

    // KK固有フィールド追加
    clothes.hideBraOpt = [false, false];
    clothes.hideShortsOpt = [false, false];

    // emblemeId配列 → emblemeId/emblemeId2 個別フィールドに分解
    for (const part of clothes.parts ?? []) {
      if (Array.isArray(part.emblemeId)) {
        const arr = part.emblemeId;
        part.emblemeId = arr[0] ?? 0;
        part.emblemeId2 = arr[1] ?? 0;
      }
    }
    // 最後のパーツを複製（KKはコーデの衣装パーツ数が多い）
    const parts: any[] = clothes.parts ?? [];
    if (parts.length > 0) {
      parts.push(structuredClone(parts[parts.length - 1]));
    }

    // EC固有フィールド削除
    for (const part of accessory.parts ?? []) {
      delete part.hideTiming;
    }

    // baseMakeup を makeup として使用
    const makeup = structuredClone(custom?.face?.baseMakeup ?? {});

    const kkCoord = {
      clothes,
      accessory,
      enableMakeup: false,
      makeup,
    };
    // 7コーデ分複製
    out.blocks.Coordinate = Array.from({ length: 7 }, () =>
      structuredClone(kkCoord),
    );

    if (out.blockHints) {
      const coordHint = structuredClone(out.blockHints.Coordinate);
      const customHint = getMapHint(out, 'Custom');
      const faceHint = getMapEntryHint(customHint, 'face')?.valueHint;
      const makeupHint = structuredClone(
        getMapEntryHint(faceHint, 'baseMakeup')?.valueHint ?? {
          kind: 'map',
          entries: [],
        },
      );
      const mapHint =
        coordHint?.kind === 'map'
          ? {
              kind: 'map',
              entries: [
                {
                  keyId: 'clothes',
                  keyType: 'string',
                  valueHint: structuredClone(
                    getMapEntryHint(coordHint, 'clothes')?.valueHint,
                  ),
                },
                {
                  keyId: 'accessory',
                  keyType: 'string',
                  valueHint: structuredClone(
                    getMapEntryHint(coordHint, 'accessory')?.valueHint,
                  ),
                },
                {
                  keyId: 'enableMakeup',
                  keyType: 'string',
                  valueHint: { kind: 'scalar' },
                },
                { keyId: 'makeup', keyType: 'string', valueHint: makeupHint },
              ],
            }
          : coordHint;
      const clothesHint =
        mapHint?.kind === 'map'
          ? getMapEntryHint(mapHint, 'clothes')?.valueHint
          : undefined;
      const clothesEntries =
        clothesHint?.kind === 'map' ? clothesHint.entries : [];
      const partsHint = getMapEntryHint(clothesHint, 'parts')?.valueHint;
      if (partsHint?.kind === 'array' && partsHint.items.length > 0) {
        partsHint.items.push(
          structuredClone(partsHint.items[partsHint.items.length - 1]),
        );
      }
      if (clothesEntries) {
        ensureMapEntryHint(clothesHint, 'hideBraOpt', {
          kind: 'array',
          items: [{ kind: 'scalar' }, { kind: 'scalar' }],
        });
        ensureMapEntryHint(clothesHint, 'hideShortsOpt', {
          kind: 'array',
          items: [{ kind: 'scalar' }, { kind: 'scalar' }],
        });
      }
      out.blockHints.Coordinate = {
        kind: 'array',
        items: Array.from({ length: 7 }, () => structuredClone(mapHint)),
      };
    }
  }
  updateBlockVersion(out, 'Coordinate', '0.0.0');
  markModified(out, 'Coordinate');

  // Parameter
  const param = out.blocks.Parameter;
  if (param) {
    param.version = '0.0.5';
    const fullname = String(param.fullname ?? '');
    param.lastname = ' ';
    param.firstname = fullname;
    param.nickname = ' ';
    param.callType = -1;
    param.clubActivities = 0;
    param.weakPoint = 0;
    param.awnser = Object.fromEntries(
      [
        'animal',
        'eat',
        'cook',
        'exercise',
        'study',
        'fashionable',
        'blackCoffee',
        'spicy',
        'sweet',
      ].map((k) => [k, true]),
    );
    param.denial = Object.fromEntries(
      ['kiss', 'aibu', 'anal', 'massage', 'notCondom'].map((k) => [k, false]),
    );
    param.attribute = Object.fromEntries(
      KK_ATTRIBUTE_KEYS.map((k) => [k, true]),
    );
    param.aggressive = 0;
    param.diligence = 0;
    param.kindness = 0;
    param.personality = 0;
    delete param.fullname;
  }
  markModified(out, 'Parameter');

  // Status
  const status = out.blocks.Status;
  if (status) {
    status.version = '0.0.0';
    status.clothesState = new Uint8Array(9);
    status.eyesBlink = false;
    status.mouthPtn = 1;
    status.mouthOpenMax = 0;
    status.mouthFixed = true;
    status.eyesLookPtn = 1;
    status.neckLookPtn = 3;
    status.visibleSonAlways = false;
    delete status.mouthOpenMin;
    delete status.enableSonDirection;
    delete status.sonDirectionX;
    delete status.sonDirectionY;
    status.coordinateType = 4;
    status.backCoordinateType = 0;
    status.shoesType = 1;
  }
  ensureMapEntryHint(getMapHint(out, 'Status'), 'mouthOpenMax', makeIntHint());
  markModified(out, 'Status');

  return out;
}

/** コイカツ → エモーションクリエイターズ */
export function kkToEc(card: Card): Card {
  const out = cloneCard(card);

  out.header = {
    productNo: 200,
    header: '【EroMakeChara】',
    version: '0.0.1',
    language: 0,
    userid: randomUuid(),
    dataid: randomUuid(),
    packages: [0],
  };
  out.errors = undefined;

  // About ブロック削除
  removeBlock(out, 'About');

  // Custom
  const custom = out.blocks.Custom;
  if (custom?.face) {
    custom.face.version = '0.0.1';
    if (typeof custom.face.pupilHeight === 'number') {
      custom.face.pupilHeight *= 0.92;
    }
    if (typeof custom.face.hlUpY === 'number') {
      custom.face.hlUpY = custom.face.hlUpY / 2 + 0.25;
    }
    custom.face.hlUpX = 0.5;
    custom.face.hlDownX = 0.5;
    custom.face.hlDownY = 0.75;
    custom.face.hlUpScale = 0.5;
    custom.face.hlDownScale = 0.5;
  }
  if (custom?.body) {
    custom.body.version = '0.0.0';
    custom.body.typeBone = 0;
  }
  if (custom?.hair) {
    custom.hair.version = '0.0.1';
    for (const part of custom.hair.parts ?? []) {
      part.noShake = false;
    }
  }
  updateBlockVersion(out, 'Custom', '0.0.0');
  markModified(out, 'Custom');

  // Coordinate: 配列[0] → 単一オブジェクト (EC v0.0.1)
  const kkCoords = out.blocks.Coordinate;
  const coordSrc = Array.isArray(kkCoords) ? kkCoords[0] : kkCoords;
  if (coordSrc) {
    const clothes = structuredClone(coordSrc.clothes ?? {});
    const accessory = structuredClone(coordSrc.accessory ?? {});

    delete clothes.hideBraOpt;
    delete clothes.hideShortsOpt;
    // second-to-last のパーツを削除（KKはパーツが1多い）
    const parts: any[] = clothes.parts ?? [];
    if (parts.length >= 2) {
      parts.splice(parts.length - 2, 1);
    }
    for (const part of parts) {
      const id = part.emblemeId ?? 0;
      const id2 = part.emblemeId2 ?? 0;
      delete part.emblemeId;
      delete part.emblemeId2;
      part.emblemeId = [id, id2];
      part.hideOpt = [false, false];
      part.sleevesType = 0;
    }

    for (const part of accessory.parts ?? []) {
      part.hideTiming = 1;
      part.noShake = false;
    }

    out.blocks.Coordinate = { clothes, accessory };

    if (out.blockHints?.Coordinate?.kind === 'array') {
      out.blockHints.Coordinate = structuredClone(
        out.blockHints.Coordinate.items[0] ?? { kind: 'map', entries: [] },
      );
    }
  }
  updateBlockVersion(out, 'Coordinate', '0.0.1');
  markModified(out, 'Coordinate');

  // Parameter
  const param = out.blocks.Parameter;
  if (param) {
    param.version = '0.0.0';
    param.fullname = `${String(param.lastname ?? '')} ${String(
      param.firstname ?? '',
    )}`;
    for (const field of KK_ONLY_PARAMETER_FIELDS) {
      delete param[field];
    }
    param.personality = 0;
    param.exType = 0;
  }
  updateBlockVersion(out, 'Parameter', '0.0.0');
  markModified(out, 'Parameter');

  // Status
  const status = out.blocks.Status;
  if (status) {
    status.version = '0.0.1';
    status.clothesState = new Uint8Array(8);
    status.eyesBlink = true;
    status.mouthPtn = 0;
    status.mouthOpenMin = 0;
    status.mouthOpenMax = 1;
    status.mouthFixed = false;
    status.eyesLookPtn = 0;
    status.neckLookPtn = 0;
    status.visibleSonAlways = true;
    status.enableSonDirection = false;
    status.sonDirectionX = 0;
    status.sonDirectionY = 0;
    status.enableShapeHand = [false, false];
    status.shapeHandPtn = [2, 2, [0, 0, 0, 0]];
    status.shapeHandBlendValue = [0, 0];
    delete status.coordinateType;
    delete status.backCoordinateType;
    delete status.shoesType;
  }
  const statusHint = getMapHint(out, 'Status');
  ensureMapEntryHint(statusHint, 'mouthOpenMax', makeIntHint());
  ensureMapEntryHint(statusHint, 'shapeHandBlendValue', makeIntArrayHint(2));
  updateBlockVersion(out, 'Status', '0.0.1');
  markModified(out, 'Status');

  return out;
}

// ============================================================
// 複合変換
// ============================================================

/** エモーションクリエイターズ → コイカツサンシャイン */
export function ecToKks(card: Card, pngBytes?: Uint8Array): Card {
  return kkToKks(ecToKk(card, pngBytes));
}

/** コイカツサンシャイン → エモーションクリエイターズ */
export function kksToEc(card: Card): Card {
  return kkToEc(kksToKk(card));
}
