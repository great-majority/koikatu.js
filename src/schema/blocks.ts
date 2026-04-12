import type { MsgpackHint } from '../parse/msgpack.js';
import { analyzeMsgpack, decodeMsgpack } from '../parse/msgpack.js';
import { BinaryReader } from '../parse/reader.js';

function isHoneycomeSeriesHeader(header?: string): boolean {
  return (
    header === '【HCChara】' ||
    header === '【HCPChara】' ||
    header === '【DCChara】' ||
    header === '【SVChara】' ||
    header === '【ACChara】'
  );
}

export function decodeCustomBlock(
  data: Uint8Array,
  header?: string,
): Record<string, any> {
  const reader = new BinaryReader(data);
  const result: Record<string, any> = {};

  for (const key of isHoneycomeSeriesHeader(header)
    ? (['face', 'body'] as const)
    : (['face', 'body', 'hair'] as const)) {
    const bytes = reader.readLengthPrefixed('i');
    if (bytes) {
      result[key] = decodeMsgpack(bytes);
    }
  }

  return result;
}

export function analyzeCustomBlockHint(
  data: Uint8Array,
  header?: string,
): MsgpackHint {
  const reader = new BinaryReader(data);
  const entries: Array<{
    keyId: string;
    keyType: 'string';
    valueHint: MsgpackHint;
  }> = [];

  for (const key of isHoneycomeSeriesHeader(header)
    ? (['face', 'body'] as const)
    : (['face', 'body', 'hair'] as const)) {
    const bytes = reader.readLengthPrefixed('i');
    if (bytes) {
      const { byteLength, ...hint } = analyzeMsgpack(bytes);
      entries.push({ keyId: key, keyType: 'string', valueHint: hint });
    }
  }

  return { kind: 'map', entries };
}

export function decodeCoordinateBlock(
  data: Uint8Array,
  header?: string,
  version?: string,
): any {
  if (version === '0.0.1') {
    // Emotion Creators: single coordinate, no list wrapping
    const reader = new BinaryReader(data);
    const coord: Record<string, any> = {};
    const clothesBytes = reader.readLengthPrefixed('i');
    if (clothesBytes) coord.clothes = decodeMsgpack(clothesBytes);
    const accessoryBytes = reader.readLengthPrefixed('i');
    if (accessoryBytes) coord.accessory = decodeMsgpack(accessoryBytes);
    return coord;
  }

  // v0.0.0 (Koikatsu): outer msgpack unpack produces a list of raw byte arrays
  const outerList = decodeMsgpack(data) as Uint8Array[];
  if (!Array.isArray(outerList)) return [];

  const coords: any[] = [];
  for (const entry of outerList) {
    const entryBytes =
      entry instanceof Uint8Array ? entry : new Uint8Array(entry);
    const reader = new BinaryReader(entryBytes);
    const coord: Record<string, any> = {};

    const clothesBytes = reader.readLengthPrefixed('i');
    if (clothesBytes) coord.clothes = decodeMsgpack(clothesBytes);

    const accessoryBytes = reader.readLengthPrefixed('i');
    if (accessoryBytes) coord.accessory = decodeMsgpack(accessoryBytes);

    if (isHoneycomeSeriesHeader(header)) {
      const makeupBytes = reader.readLengthPrefixed('i');
      if (makeupBytes) coord.makeup = decodeMsgpack(makeupBytes);

      const hairBytes = reader.readLengthPrefixed('i');
      if (hairBytes) coord.hair = decodeMsgpack(hairBytes);

      const nailBytes = reader.readLengthPrefixed('i');
      if (nailBytes) coord.nail = decodeMsgpack(nailBytes);
    } else {
      const enableMakeup = reader.readUint8();
      coord.enableMakeup =
        enableMakeup !== undefined ? enableMakeup !== 0 : undefined;

      const makeupBytes = reader.readLengthPrefixed('i');
      if (makeupBytes) coord.makeup = decodeMsgpack(makeupBytes);
    }

    coords.push(coord);
  }

  return coords;
}

export function analyzeCoordinateBlockHint(
  data: Uint8Array,
  header?: string,
  version?: string,
): MsgpackHint {
  if (version === '0.0.1') {
    const reader = new BinaryReader(data);
    const entries: Array<{
      keyId: string;
      keyType: 'string';
      valueHint: MsgpackHint;
    }> = [];

    const clothesBytes = reader.readLengthPrefixed('i');
    if (clothesBytes) {
      const { byteLength, ...hint } = analyzeMsgpack(clothesBytes);
      entries.push({ keyId: 'clothes', keyType: 'string', valueHint: hint });
    }
    const accessoryBytes = reader.readLengthPrefixed('i');
    if (accessoryBytes) {
      const { byteLength, ...hint } = analyzeMsgpack(accessoryBytes);
      entries.push({ keyId: 'accessory', keyType: 'string', valueHint: hint });
    }

    return { kind: 'map', entries };
  }

  const outerList = decodeMsgpack(data) as Uint8Array[];
  if (!Array.isArray(outerList)) {
    return { kind: 'array', items: [] };
  }

  const items = outerList.map((entry) => {
    const reader = new BinaryReader(
      entry instanceof Uint8Array ? entry : new Uint8Array(entry),
    );
    const entries: Array<{
      keyId: string;
      keyType: 'string';
      valueHint: MsgpackHint;
    }> = [];

    for (const key of isHoneycomeSeriesHeader(header)
      ? (['clothes', 'accessory', 'makeup', 'hair', 'nail'] as const)
      : (['clothes', 'accessory'] as const)) {
      const bytes = reader.readLengthPrefixed('i');
      if (bytes) {
        const { byteLength, ...hint } = analyzeMsgpack(bytes);
        entries.push({ keyId: key, keyType: 'string', valueHint: hint });
      }
    }

    if (!isHoneycomeSeriesHeader(header)) {
      entries.push({
        keyId: 'enableMakeup',
        keyType: 'string',
        valueHint: { kind: 'scalar' },
      });
      const makeupBytes = reader.readLengthPrefixed('i');
      if (makeupBytes) {
        const { byteLength, ...hint } = analyzeMsgpack(makeupBytes);
        entries.push({ keyId: 'makeup', keyType: 'string', valueHint: hint });
      }
    }

    return { kind: 'map', entries } as MsgpackHint;
  });

  return { kind: 'array', items };
}

export function decodeParameterBlock(data: Uint8Array): Record<string, any> {
  return decodeMsgpack(data) as Record<string, any>;
}

export function decodeKKExBlock(data: Uint8Array): Record<string, any> {
  const decoded = decodeMsgpack(data) as Record<string, any>;
  return expandNestedMsgpack(decoded);
}

function expandNestedMsgpack(obj: any): any {
  if (obj instanceof Uint8Array) {
    try {
      const inner = decodeMsgpack(obj);
      return expandNestedMsgpack(inner);
    } catch {
      return obj;
    }
  }

  if (obj instanceof Map) {
    const result: Record<string, any> = {};
    for (const [key, value] of obj) {
      result[String(key)] = expandNestedMsgpack(value);
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(expandNestedMsgpack);
  }

  if (obj !== null && typeof obj === 'object' && !(obj instanceof Uint8Array)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandNestedMsgpack(value);
    }
    return result;
  }

  return obj;
}
