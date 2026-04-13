import type { BlockInfo, Card } from '../types.js';

// ============================================================
// Game-specific constants
// ============================================================

const _HC_COMMON_BLOCKS = [
  'Custom',
  'Coordinate',
  'Parameter',
  'Status',
  'Graphic',
  'About',
];

// ============================================================
// Default data
// ============================================================

const DEFAULT_GAMEPARAMETER_HC = { trait: 0, mind: 0, hAttribute: 10 };

const DEFAULT_GAMEINFO_HC: Record<string, any> = {
  Favor: 0,
  Enjoyment: 0,
  Aversion: 0,
  Slavery: 0,
  Broken: 0,
  Dependence: 0,
  Dirty: 0,
  Tiredness: 0,
  Toilet: 0,
  Libido: 0,
  nowState: 0,
  nowDrawState: 0,
  lockNowState: false,
  lockBroken: false,
  lockDependence: false,
  alertness: 0,
  calcState: 0,
  escapeFlag: 0,
  escapeExperienced: false,
  firstHFlag: false,
  genericVoice: [Array(13).fill(false), Array(13).fill(false)],
  genericBrokenVoice: false,
  genericDependencepVoice: false,
  genericAnalVoice: false,
  genericPainVoice: false,
  genericFlag: false,
  genericBefore: false,
  inviteVoice: [false, false, false, false, false],
  hCount: 0,
  map: [],
  arriveRoom50: false,
  arriveRoom80: false,
  arriveRoomHAfter: false,
  resistH: 0,
  resistPain: 0,
  resistAnal: 0,
  usedItem: 0,
  isChangeParameter: false,
  isConcierge: false,
  TalkFlag: false,
  ResistedH: false,
  ResistedPain: false,
  ResistedAnal: false,
};

const DEFAULT_GAMEPARAMETER_SV: Record<string, any> = {
  imageData: null,
  job: 0,
  sexualTarget: 0,
  lvChastity: 0,
  lvSociability: 0,
  lvTalk: 0,
  lvStudy: 0,
  lvLiving: 0,
  lvPhysical: 0,
  lvDefeat: 0,
  belongings: [0, 0],
  isVirgin: true,
  isAnalVirgin: true,
  isMaleVirgin: true,
  isMaleAnalVirgin: true,
  individuality: { answer: [-1, -1] },
  preferenceH: { answer: [-1, -1] },
};

const DEFAULT_GAMEPARAMETER_AC: Record<string, any> = {
  version: '0.0.0',
  imageData: null,
  clubActivities: 3,
  individuality: Array(18).fill(false),
  characteristics: { answer: [-1, -1] },
  hobby: { answer: [-1, -1, -1] },
  erogenousZone: 0,
};

const DEFAULT_ACCESSORY_AC: Record<string, any> = {
  type: 120,
  id: 0,
  parentKeyType: 0,
  addMove: [
    2,
    3,
    [
      [0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0],
      [1.0, 1.0, 1.0],
      [0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0],
      [1.0, 1.0, 1.0],
    ],
  ],
  color: [
    [1.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0, 1.0],
  ],
  colorInfo: Array(3)
    .fill(null)
    .map(() => ({
      pattern: 0,
      tiling: [0.0, 0.0],
      patternColor: [1.0, 1.0, 1.0, 1.0],
      offset: [0.5, 0.5],
      rotate: 0.5,
    })),
  hideCategory: 0,
  noShake: false,
  fkInfo: { use: false, bones: [] },
};

const FLOAT_HINT = { kind: 'number', format: 'float' } as const;

const DEFAULT_ACCESSORY_AC_HINT = {
  kind: 'map',
  entries: [
    {
      keyId: 'type',
      keyType: 'string',
      valueHint: { kind: 'number', format: 'int' },
    },
    {
      keyId: 'id',
      keyType: 'string',
      valueHint: { kind: 'number', format: 'int' },
    },
    {
      keyId: 'parentKeyType',
      keyType: 'string',
      valueHint: { kind: 'number', format: 'int' },
    },
    {
      keyId: 'addMove',
      keyType: 'string',
      valueHint: {
        kind: 'array',
        items: [
          { kind: 'number', format: 'int' },
          { kind: 'number', format: 'int' },
          {
            kind: 'array',
            items: Array.from({ length: 6 }, () => ({
              kind: 'array',
              items: [FLOAT_HINT, FLOAT_HINT, FLOAT_HINT],
            })),
          },
        ],
      },
    },
    {
      keyId: 'color',
      keyType: 'string',
      valueHint: {
        kind: 'array',
        items: Array.from({ length: 4 }, () => ({
          kind: 'array',
          items: [FLOAT_HINT, FLOAT_HINT, FLOAT_HINT, FLOAT_HINT],
        })),
      },
    },
    {
      keyId: 'colorInfo',
      keyType: 'string',
      valueHint: {
        kind: 'array',
        items: Array.from({ length: 3 }, () => ({
          kind: 'map',
          entries: [
            {
              keyId: 'pattern',
              keyType: 'string',
              valueHint: { kind: 'number', format: 'int' },
            },
            {
              keyId: 'tiling',
              keyType: 'string',
              valueHint: { kind: 'array', items: [FLOAT_HINT, FLOAT_HINT] },
            },
            {
              keyId: 'patternColor',
              keyType: 'string',
              valueHint: {
                kind: 'array',
                items: [FLOAT_HINT, FLOAT_HINT, FLOAT_HINT, FLOAT_HINT],
              },
            },
            {
              keyId: 'offset',
              keyType: 'string',
              valueHint: { kind: 'array', items: [FLOAT_HINT, FLOAT_HINT] },
            },
            { keyId: 'rotate', keyType: 'string', valueHint: FLOAT_HINT },
          ],
        })),
      },
    },
    {
      keyId: 'hideCategory',
      keyType: 'string',
      valueHint: { kind: 'number', format: 'int' },
    },
    { keyId: 'noShake', keyType: 'string', valueHint: { kind: 'scalar' } },
    {
      keyId: 'fkInfo',
      keyType: 'string',
      valueHint: {
        kind: 'map',
        entries: [
          { keyId: 'use', keyType: 'string', valueHint: { kind: 'scalar' } },
          {
            keyId: 'bones',
            keyType: 'string',
            valueHint: { kind: 'array', items: [] },
          },
        ],
      },
    },
  ],
};

// ============================================================
// Helpers
// ============================================================

function cloneCard(card: Card): Card {
  return structuredClone(card);
}

function addBlock(
  card: Card,
  name: string,
  version: string,
  data: unknown,
): void {
  const entry: BlockInfo = { name, version, pos: 0, size: 0 };
  card.blockIndex.push(entry);
  card.blocks[name] = data;
  if (card.rawBlockBytes) delete card.rawBlockBytes[name];
}

function removeBlocks(card: Card, ...names: string[]): void {
  const nameSet = new Set(names);
  card.blockIndex = card.blockIndex.filter((b) => !nameSet.has(b.name));
  for (const name of names) {
    delete card.blocks[name];
    if (card.rawBlockBytes) delete card.rawBlockBytes[name];
  }
}

function markModified(card: Card, ...names: string[]): void {
  if (!card.rawBlockBytes) return;
  for (const name of names) {
    delete card.rawBlockBytes[name];
  }
}

function getCoord(card: Card, i: number): Record<string, any> {
  const coords = card.blocks.Coordinate;
  return Array.isArray(coords) ? coords[i] : coords;
}

function numCoords(card: Card): number {
  const coords = card.blocks.Coordinate;
  return Array.isArray(coords) ? coords.length : 1;
}

/** Paint scale transform for Honeycome -> Summer Vacation Scramble: scale -> 0.5 * scale + 0.25. */
function transformPaintScaleHcToSv(card: Card, n: number): void {
  for (let i = 0; i < n; i++) {
    const coord = getCoord(card, i);
    for (let k = 0; k < 3; k++) {
      const layout = coord?.makeup?.paintInfos?.[k]?.layout;
      if (Array.isArray(layout) && layout.length > 3) {
        layout[3] = 0.5 * layout[3] + 0.25;
      }
    }
  }
}

/** Paint scale transform for Summer Vacation Scramble -> Honeycome: scale -> 2 * scale - 0.5. */
function transformPaintScaleSvToHc(card: Card, n: number): void {
  for (let i = 0; i < n; i++) {
    const coord = getCoord(card, i);
    for (let k = 0; k < 3; k++) {
      const layout = coord?.makeup?.paintInfos?.[k]?.layout;
      if (Array.isArray(layout) && layout.length > 3) {
        layout[3] = 2 * layout[3] - 0.5;
      }
    }
  }
}

/** Add Summer Vacation Scramble-specific Coordinate fields. */
function addSvSpecificFields(card: Card, n: number): void {
  for (let i = 0; i < n; i++) {
    const coord = getCoord(card, i);
    coord.isSteamLimited = false;
    coord.coverInfos = Array.from({ length: 8 }, () => ({
      use: false,
      infoTable: {},
    }));
  }
}

/** Remove Summer Vacation Scramble-specific Coordinate fields. */
function removeSvSpecificFields(card: Card, n: number): void {
  for (let i = 0; i < n; i++) {
    const coord = getCoord(card, i);
    delete coord.isSteamLimited;
    delete coord.coverInfos;
  }
}

/** Expand accessory slots from fromCount to toCount. */
function expandAccessories(
  card: Card,
  fromCount: number,
  toCount: number,
  numCostumes: number,
): void {
  const status = card.blocks.Status;
  if (status && Array.isArray(status.showAccessory)) {
    for (let i = 0; i < toCount - fromCount; i++) {
      status.showAccessory.push(true);
    }
  }
  for (let i = 0; i < numCostumes; i++) {
    const coord = getCoord(card, i);
    const parts = coord?.accessory?.parts;
    if (Array.isArray(parts)) {
      for (let j = 0; j < toCount - fromCount; j++) {
        parts.push(structuredClone(DEFAULT_ACCESSORY_AC));
      }
    }

    const hint = card.blockHints?.Coordinate;
    const coordHint = hint?.kind === 'array' ? hint.items[i] : undefined;
    const accessoryHint =
      coordHint?.kind === 'map'
        ? coordHint.entries.find((entry) => entry.keyId === 'accessory')
            ?.valueHint
        : undefined;
    const partsHint =
      accessoryHint?.kind === 'map'
        ? accessoryHint.entries.find((entry) => entry.keyId === 'parts')
            ?.valueHint
        : undefined;
    if (partsHint?.kind === 'array') {
      for (let j = 0; j < toCount - fromCount; j++) {
        partsHint.items.push(structuredClone(DEFAULT_ACCESSORY_AC_HINT));
      }
    }
  }
}

/** Shrink accessory slots from fromCount to toCount. */
function shrinkAccessories(
  card: Card,
  _fromCount: number,
  toCount: number,
  numCostumes: number,
): void {
  const status = card.blocks.Status;
  if (status && Array.isArray(status.showAccessory)) {
    if (status.showAccessory.length > toCount) {
      status.showAccessory = status.showAccessory.slice(0, toCount);
    }
  }
  for (let i = 0; i < numCostumes; i++) {
    const coord = getCoord(card, i);
    const parts = coord?.accessory?.parts;
    if (Array.isArray(parts) && parts.length > toCount) {
      coord.accessory.parts = parts.slice(0, toCount);
    }
  }
}

/** Add Aicomi-specific accessory fields. */
function addAcAccessoryFields(card: Card, numCostumes: number): void {
  for (let i = 0; i < numCostumes; i++) {
    const coord = getCoord(card, i);
    const parts = coord?.accessory?.parts ?? [];
    for (const part of parts) {
      part.hideCategoryClothes = -1;
      part.visibleTimings = [true, true, true];
    }
  }
}

/** Remove Aicomi-specific accessory fields. */
function removeAcAccessoryFields(card: Card, numCostumes: number): void {
  for (let i = 0; i < numCostumes; i++) {
    const coord = getCoord(card, i);
    const parts = coord?.accessory?.parts ?? [];
    for (const part of parts) {
      delete part.hideCategoryClothes;
      delete part.visibleTimings;
    }
  }
}

/** Swap the order of two costume slots. */
function swapCoordinates(card: Card, idx1: number, idx2: number): void {
  const coords = card.blocks.Coordinate;
  if (!Array.isArray(coords)) return;
  const tmp = structuredClone(coords[idx1]);
  coords[idx1] = structuredClone(coords[idx2]);
  coords[idx2] = tmp;

  const hint = card.blockHints?.Coordinate;
  if (hint?.kind === 'array') {
    const tmpHint = structuredClone(hint.items[idx1]);
    hint.items[idx1] = structuredClone(hint.items[idx2]);
    hint.items[idx2] = tmpHint;
  }
}

// ============================================================
// Honeycome <-> Summer Vacation Scramble
// ============================================================

/**
 * Honeycome -> Summer Vacation Scramble
 * @param card Honeycome card
 * @param pngBytes PNG image bytes used for GameParameter_SV.imageData
 */
export function hcToSv(card: Card, pngBytes?: Uint8Array): Card {
  const out = cloneCard(card);

  out.header = {
    productNo: 100,
    header: '【SVChara】',
    version: '0.0.0',
    faceImage: new Uint8Array(0),
  };
  out.errors = undefined;

  // Remove Honeycome-specific blocks.
  removeBlocks(out, 'GameParameter_HC', 'GameInfo_HC');

  // Add Summer Vacation Scramble-specific blocks.
  const svParam = structuredClone(DEFAULT_GAMEPARAMETER_SV);
  svParam.imageData = pngBytes ?? null;
  addBlock(out, 'GameParameter_SV', '0.0.0', svParam);
  addBlock(out, 'GameInfo_SV', '0.0.0', {});

  // Add Summer Vacation Scramble-specific Coordinate fields.
  const n = numCoords(out);
  addSvSpecificFields(out, n);

  // Convert paint scales.
  transformPaintScaleHcToSv(out, n);
  markModified(out, 'Coordinate');

  // Reset personality.
  if (out.blocks.Parameter) {
    out.blocks.Parameter.personality = 0;
    markModified(out, 'Parameter');
  }

  return out;
}

/**
 * Summer Vacation Scramble -> Honeycome
 * @param card Summer Vacation Scramble card
 * @param pngBytes PNG image bytes used as a face image substitute because SVS has no faceImage
 */
export function svToHc(card: Card, pngBytes?: Uint8Array): Card {
  const out = cloneCard(card);

  out.header = {
    ...out.header,
    header: '【HCChara】',
    productNo: 200,
    version: '0.0.0',
    // SVS does not have faceImage, so reuse the main PNG.
    faceImage: pngBytes ?? out.header.faceImage,
  };
  out.errors = undefined;

  // Remove Summer Vacation Scramble-specific blocks.
  removeBlocks(out, 'GameParameter_SV', 'GameInfo_SV');

  // Add Honeycome-specific blocks.
  addBlock(
    out,
    'GameParameter_HC',
    '0.0.0',
    structuredClone(DEFAULT_GAMEPARAMETER_HC),
  );
  addBlock(out, 'GameInfo_HC', '0.0.0', structuredClone(DEFAULT_GAMEINFO_HC));

  // Remove Summer Vacation Scramble-specific Coordinate fields.
  const n = numCoords(out);
  removeSvSpecificFields(out, n);

  // Convert paint scales back.
  transformPaintScaleSvToHc(out, n);
  markModified(out, 'Coordinate');

  // Reset personality.
  if (out.blocks.Parameter) {
    out.blocks.Parameter.personality = 0;
    markModified(out, 'Parameter');
  }

  return out;
}

// ============================================================
// Summer Vacation Scramble <-> Aicomi
// ============================================================

/**
 * Summer Vacation Scramble -> Aicomi
 */
export function svToAc(card: Card, options?: { swapCoordinates?: boolean }): Card {
  const out = cloneCard(card);

  out.header = {
    productNo: 100,
    header: '【ACChara】',
    version: '0.0.0',
    faceImage: new Uint8Array(0),
  };
  out.errors = undefined;

  // Remove Summer Vacation Scramble-specific blocks.
  const svImageData = out.blocks.GameParameter_SV?.imageData ?? null;
  removeBlocks(out, 'GameParameter_SV', 'GameInfo_SV');

  // Add Aicomi-specific blocks.
  const acParam = structuredClone(DEFAULT_GAMEPARAMETER_AC);
  acParam.imageData = svImageData;
  addBlock(out, 'GameParameter_AC', '0.0.0', acParam);
  addBlock(out, 'GameInfo_AC', '0.0.0', { version: '0.0.0' });

  // Add nickname.
  if (out.blocks.Parameter) {
    out.blocks.Parameter.nickname = '';
    markModified(out, 'Parameter');
  }

  // Add a fourth costume by duplicating the last one.
  const coords = out.blocks.Coordinate;
  if (Array.isArray(coords) && coords.length > 0) {
    coords.push(structuredClone(coords[coords.length - 1]));
    if (out.blockHints?.Coordinate?.kind === 'array') {
      const items = out.blockHints.Coordinate.items;
      items.push(structuredClone(items[items.length - 1]));
    }
  }

  // Swap coordinate 0 and 1: SVS casual/work -> Aicomi work/casual.
  if (options?.swapCoordinates) swapCoordinates(out, 0, 1);

  // Expand accessories from 20 to 40 slots.
  expandAccessories(out, 20, 40, 4);

  // Add Aicomi-specific accessory fields.
  addAcAccessoryFields(out, 4);

  markModified(out, 'Coordinate', 'Status');

  return out;
}

/**
 * Aicomi -> Summer Vacation Scramble
 */
export function acToSv(card: Card, options?: { swapCoordinates?: boolean }): Card {
  const out = cloneCard(card);

  out.header = {
    productNo: 100,
    header: '【SVChara】',
    version: '0.0.0',
    faceImage: new Uint8Array(0),
  };
  out.errors = undefined;

  // Remove Aicomi-specific blocks.
  const acImageData = out.blocks.GameParameter_AC?.imageData ?? null;
  removeBlocks(out, 'GameParameter_AC', 'GameInfo_AC');

  // Add Summer Vacation Scramble-specific blocks.
  const svParam = structuredClone(DEFAULT_GAMEPARAMETER_SV);
  svParam.imageData = acImageData;
  addBlock(out, 'GameParameter_SV', '0.0.0', svParam);
  addBlock(out, 'GameInfo_SV', '0.0.0', { version: '0.0.0' });

  // Swap coordinate 0 and 1: Aicomi casual/work -> SVS work/casual.
  if (options?.swapCoordinates) swapCoordinates(out, 0, 1);

  // Remove the fourth costume slot.
  const coords = out.blocks.Coordinate;
  if (Array.isArray(coords) && coords.length > 3) {
    out.blocks.Coordinate = coords.slice(0, 3);
    if (out.blockHints?.Coordinate?.kind === 'array') {
      out.blockHints.Coordinate.items = out.blockHints.Coordinate.items.slice(
        0,
        3,
      );
    }
  }

  // Shrink accessories from 40 to 20 slots.
  shrinkAccessories(out, 40, 20, 3);

  // Remove Aicomi-specific accessory fields.
  removeAcAccessoryFields(out, 3);

  // Remove nickname.
  if (out.blocks.Parameter) {
    delete out.blocks.Parameter.nickname;
    markModified(out, 'Parameter');
  }

  markModified(out, 'Coordinate', 'Status');

  return out;
}

// ============================================================
// Composed conversions
// ============================================================

/** Honeycome -> Aicomi */
export function hcToAc(card: Card, pngBytes?: Uint8Array): Card {
  return svToAc(hcToSv(card, pngBytes));
}

/** Aicomi -> Honeycome */
export function acToHc(card: Card, pngBytes?: Uint8Array): Card {
  return svToHc(acToSv(card), pngBytes);
}
