import { decodeMsgpack } from '../parse/msgpack.js';
import { BinaryReader } from '../parse/reader.js';

export function decodeCustomBlock(data: Uint8Array): Record<string, any> {
  const reader = new BinaryReader(data);
  const result: Record<string, any> = {};

  const faceBytes = reader.readLengthPrefixed('i');
  if (faceBytes) {
    result.face = decodeMsgpack(faceBytes);
  }

  const bodyBytes = reader.readLengthPrefixed('i');
  if (bodyBytes) {
    result.body = decodeMsgpack(bodyBytes);
  }

  const hairBytes = reader.readLengthPrefixed('i');
  if (hairBytes) {
    result.hair = decodeMsgpack(hairBytes);
  }

  return result;
}

export function decodeCoordinateBlock(data: Uint8Array, version?: string): any {
  if (version === '0.0.1') {
    // EmotionCreators: single coordinate, no list wrapping
    const reader = new BinaryReader(data);
    const coord: Record<string, any> = {};
    const clothesBytes = reader.readLengthPrefixed('i');
    if (clothesBytes) coord.clothes = decodeMsgpack(clothesBytes);
    const accessoryBytes = reader.readLengthPrefixed('i');
    if (accessoryBytes) coord.accessory = decodeMsgpack(accessoryBytes);
    return coord;
  }

  // v0.0.0 (Koikatu): outer msgpack unpack produces a list of raw byte arrays
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

    const enableMakeup = reader.readUint8();
    coord.enableMakeup =
      enableMakeup !== undefined ? enableMakeup !== 0 : undefined;

    const makeupBytes = reader.readLengthPrefixed('i');
    if (makeupBytes) coord.makeup = decodeMsgpack(makeupBytes);

    coords.push(coord);
  }

  return coords;
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
