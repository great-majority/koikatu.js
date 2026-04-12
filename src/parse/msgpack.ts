import { decode, encode } from '@msgpack/msgpack';

export function decodeMsgpack(data: Uint8Array): any {
  return decode(data, { useBigInt64: true });
}

export function encodeMsgpack(data: unknown): Uint8Array {
  return encode(data, { forceFloat32: true }) as Uint8Array;
}

type NumberHint = { kind: 'number'; format: 'int' | 'float' };
type ArrayHint = { kind: 'array'; items: MsgpackHint[] };
type MapEntryHint = {
  keyId: string;
  keyType: 'string' | 'int' | 'float' | 'boolean' | 'nil';
  valueHint: MsgpackHint;
};
type MapHint = { kind: 'map'; entries: MapEntryHint[] };
type ScalarHint = { kind: 'scalar' };

export type MsgpackHint = NumberHint | ArrayHint | MapHint | ScalarHint;

const textEncoder = new TextEncoder();

function scalarHint(): ScalarHint {
  return { kind: 'scalar' };
}

function encodeUint16BE(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, false);
  return out;
}

function encodeUint32BE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function encodeInt16BE(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setInt16(0, value, false);
  return out;
}

function encodeInt32BE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, value, false);
  return out;
}

function encodeUint64BE(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, false);
  return out;
}

function encodeInt64BE(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigInt64(0, value, false);
  return out;
}

function encodeFloat32BE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setFloat32(0, value, false);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function readUint8(data: Uint8Array, offset: number): number {
  return data[offset] ?? 0;
}

function readUint16BE(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset + offset, 2).getUint16(
    0,
    false,
  );
}

function readUint32BE(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(
    0,
    false,
  );
}

function skipExt(_data: Uint8Array, offset: number, size: number): number {
  return offset + size + 1;
}

function parseKeyHint(
  data: Uint8Array,
  offset: number,
): [{ keyId: string; keyType: MapEntryHint['keyType'] }, number] {
  const byte = readUint8(data, offset);

  if (byte <= 0x7f) {
    return [{ keyId: String(byte), keyType: 'int' }, offset + 1];
  }
  if (byte >= 0xe0) {
    return [{ keyId: String(byte - 0x100), keyType: 'int' }, offset + 1];
  }
  if ((byte & 0xe0) === 0xa0) {
    const len = byte & 0x1f;
    const start = offset + 1;
    const end = start + len;
    return [
      {
        keyId: new TextDecoder().decode(data.subarray(start, end)),
        keyType: 'string',
      },
      end,
    ];
  }

  switch (byte) {
    case 0xc0:
      return [{ keyId: 'null', keyType: 'nil' }, offset + 1];
    case 0xc2:
      return [{ keyId: 'false', keyType: 'boolean' }, offset + 1];
    case 0xc3:
      return [{ keyId: 'true', keyType: 'boolean' }, offset + 1];
    case 0xca: {
      const value = new DataView(
        data.buffer,
        data.byteOffset + offset + 1,
        4,
      ).getFloat32(0, false);
      return [{ keyId: String(value), keyType: 'float' }, offset + 5];
    }
    case 0xcb: {
      const value = new DataView(
        data.buffer,
        data.byteOffset + offset + 1,
        8,
      ).getFloat64(0, false);
      return [{ keyId: String(value), keyType: 'float' }, offset + 9];
    }
    case 0xcc:
      return [
        { keyId: String(readUint8(data, offset + 1)), keyType: 'int' },
        offset + 2,
      ];
    case 0xcd:
      return [
        { keyId: String(readUint16BE(data, offset + 1)), keyType: 'int' },
        offset + 3,
      ];
    case 0xce:
      return [
        { keyId: String(readUint32BE(data, offset + 1)), keyType: 'int' },
        offset + 5,
      ];
    case 0xd0: {
      const value = new DataView(
        data.buffer,
        data.byteOffset + offset + 1,
        1,
      ).getInt8(0);
      return [{ keyId: String(value), keyType: 'int' }, offset + 2];
    }
    case 0xd1: {
      const value = new DataView(
        data.buffer,
        data.byteOffset + offset + 1,
        2,
      ).getInt16(0, false);
      return [{ keyId: String(value), keyType: 'int' }, offset + 3];
    }
    case 0xd2: {
      const value = new DataView(
        data.buffer,
        data.byteOffset + offset + 1,
        4,
      ).getInt32(0, false);
      return [{ keyId: String(value), keyType: 'int' }, offset + 5];
    }
    case 0xd9: {
      const len = readUint8(data, offset + 1);
      const start = offset + 2;
      const end = start + len;
      return [
        {
          keyId: new TextDecoder().decode(data.subarray(start, end)),
          keyType: 'string',
        },
        end,
      ];
    }
    case 0xda: {
      const len = readUint16BE(data, offset + 1);
      const start = offset + 3;
      const end = start + len;
      return [
        {
          keyId: new TextDecoder().decode(data.subarray(start, end)),
          keyType: 'string',
        },
        end,
      ];
    }
    case 0xdb: {
      const len = readUint32BE(data, offset + 1);
      const start = offset + 5;
      const end = start + len;
      return [
        {
          keyId: new TextDecoder().decode(data.subarray(start, end)),
          keyType: 'string',
        },
        end,
      ];
    }
    default:
      return [
        { keyId: String(byte), keyType: 'string' },
        skipUnknown(data, offset),
      ];
  }
}

function skipUnknown(data: Uint8Array, offset: number): number {
  return analyzeMsgpack(data.subarray(offset)).byteLength + offset;
}

function readHint(
  data: Uint8Array,
  offset: number,
): [{ hint: MsgpackHint; byteLength: number }, number] {
  const start = offset;
  const byte = readUint8(data, offset);

  if (byte <= 0x7f || byte >= 0xe0) {
    return [
      { hint: { kind: 'number', format: 'int' }, byteLength: 1 },
      offset + 1,
    ];
  }
  if ((byte & 0xe0) === 0xa0) {
    return [
      { hint: scalarHint(), byteLength: 1 + (byte & 0x1f) },
      offset + 1 + (byte & 0x1f),
    ];
  }
  if ((byte & 0xf0) === 0x90) {
    const size = byte & 0x0f;
    const items: MsgpackHint[] = [];
    offset += 1;
    for (let i = 0; i < size; i++) {
      const [value, next] = readHint(data, offset);
      items.push(value.hint);
      offset = next;
    }
    return [
      { hint: { kind: 'array', items }, byteLength: offset - start },
      offset,
    ];
  }
  if ((byte & 0xf0) === 0x80) {
    const size = byte & 0x0f;
    const entries: MapEntryHint[] = [];
    offset += 1;
    for (let i = 0; i < size; i++) {
      const [key, nextKey] = parseKeyHint(data, offset);
      const [value, nextValue] = readHint(data, nextKey);
      entries.push({ ...key, valueHint: value.hint });
      offset = nextValue;
    }
    return [
      { hint: { kind: 'map', entries }, byteLength: offset - start },
      offset,
    ];
  }

  switch (byte) {
    case 0xc0:
    case 0xc2:
    case 0xc3:
      return [{ hint: scalarHint(), byteLength: 1 }, offset + 1];
    case 0xc4: {
      const len = readUint8(data, offset + 1);
      return [{ hint: scalarHint(), byteLength: 2 + len }, offset + 2 + len];
    }
    case 0xc5: {
      const len = readUint16BE(data, offset + 1);
      return [{ hint: scalarHint(), byteLength: 3 + len }, offset + 3 + len];
    }
    case 0xc6: {
      const len = readUint32BE(data, offset + 1);
      return [{ hint: scalarHint(), byteLength: 5 + len }, offset + 5 + len];
    }
    case 0xc7: {
      const len = readUint8(data, offset + 1);
      return [
        {
          hint: scalarHint(),
          byteLength: skipExt(data, offset + 2, len) - start,
        },
        skipExt(data, offset + 2, len),
      ];
    }
    case 0xc8: {
      const len = readUint16BE(data, offset + 1);
      return [
        {
          hint: scalarHint(),
          byteLength: skipExt(data, offset + 3, len) - start,
        },
        skipExt(data, offset + 3, len),
      ];
    }
    case 0xc9: {
      const len = readUint32BE(data, offset + 1);
      return [
        {
          hint: scalarHint(),
          byteLength: skipExt(data, offset + 5, len) - start,
        },
        skipExt(data, offset + 5, len),
      ];
    }
    case 0xca:
      return [
        { hint: { kind: 'number', format: 'float' }, byteLength: 5 },
        offset + 5,
      ];
    case 0xcb:
      return [
        { hint: { kind: 'number', format: 'float' }, byteLength: 9 },
        offset + 9,
      ];
    case 0xcc:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 2 },
        offset + 2,
      ];
    case 0xcd:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 3 },
        offset + 3,
      ];
    case 0xce:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 5 },
        offset + 5,
      ];
    case 0xcf:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 9 },
        offset + 9,
      ];
    case 0xd0:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 2 },
        offset + 2,
      ];
    case 0xd1:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 3 },
        offset + 3,
      ];
    case 0xd2:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 5 },
        offset + 5,
      ];
    case 0xd3:
      return [
        { hint: { kind: 'number', format: 'int' }, byteLength: 9 },
        offset + 9,
      ];
    case 0xd4:
      return [{ hint: scalarHint(), byteLength: 3 }, offset + 3];
    case 0xd5:
      return [{ hint: scalarHint(), byteLength: 4 }, offset + 4];
    case 0xd6:
      return [{ hint: scalarHint(), byteLength: 6 }, offset + 6];
    case 0xd7:
      return [{ hint: scalarHint(), byteLength: 10 }, offset + 10];
    case 0xd8:
      return [{ hint: scalarHint(), byteLength: 18 }, offset + 18];
    case 0xd9: {
      const len = readUint8(data, offset + 1);
      return [{ hint: scalarHint(), byteLength: 2 + len }, offset + 2 + len];
    }
    case 0xda: {
      const len = readUint16BE(data, offset + 1);
      return [{ hint: scalarHint(), byteLength: 3 + len }, offset + 3 + len];
    }
    case 0xdb: {
      const len = readUint32BE(data, offset + 1);
      return [{ hint: scalarHint(), byteLength: 5 + len }, offset + 5 + len];
    }
    case 0xdc: {
      const size = readUint16BE(data, offset + 1);
      const items: MsgpackHint[] = [];
      offset += 3;
      for (let i = 0; i < size; i++) {
        const [value, next] = readHint(data, offset);
        items.push(value.hint);
        offset = next;
      }
      return [
        { hint: { kind: 'array', items }, byteLength: offset - start },
        offset,
      ];
    }
    case 0xdd: {
      const size = readUint32BE(data, offset + 1);
      const items: MsgpackHint[] = [];
      offset += 5;
      for (let i = 0; i < size; i++) {
        const [value, next] = readHint(data, offset);
        items.push(value.hint);
        offset = next;
      }
      return [
        { hint: { kind: 'array', items }, byteLength: offset - start },
        offset,
      ];
    }
    case 0xde: {
      const size = readUint16BE(data, offset + 1);
      const entries: MapEntryHint[] = [];
      offset += 3;
      for (let i = 0; i < size; i++) {
        const [key, nextKey] = parseKeyHint(data, offset);
        const [value, nextValue] = readHint(data, nextKey);
        entries.push({ ...key, valueHint: value.hint });
        offset = nextValue;
      }
      return [
        { hint: { kind: 'map', entries }, byteLength: offset - start },
        offset,
      ];
    }
    case 0xdf: {
      const size = readUint32BE(data, offset + 1);
      const entries: MapEntryHint[] = [];
      offset += 5;
      for (let i = 0; i < size; i++) {
        const [key, nextKey] = parseKeyHint(data, offset);
        const [value, nextValue] = readHint(data, nextKey);
        entries.push({ ...key, valueHint: value.hint });
        offset = nextValue;
      }
      return [
        { hint: { kind: 'map', entries }, byteLength: offset - start },
        offset,
      ];
    }
    default:
      return [{ hint: scalarHint(), byteLength: 1 }, offset + 1];
  }
}

export function analyzeMsgpack(
  data: Uint8Array,
): MsgpackHint & { byteLength: number } {
  const [result] = readHint(data, 0);
  return { ...result.hint, byteLength: result.byteLength };
}

function encodeIntNumber(value: number | bigint): Uint8Array {
  const num = typeof value === 'bigint' ? value : BigInt(value);
  if (num >= 0n) {
    if (num <= 0x7fn) return new Uint8Array([Number(num)]);
    if (num <= 0xffn)
      return concatBytes([
        new Uint8Array([0xcc]),
        new Uint8Array([Number(num)]),
      ]);
    if (num <= 0xffffn)
      return concatBytes([new Uint8Array([0xcd]), encodeUint16BE(Number(num))]);
    if (num <= 0xffffffffn)
      return concatBytes([new Uint8Array([0xce]), encodeUint32BE(Number(num))]);
    return concatBytes([new Uint8Array([0xcf]), encodeUint64BE(num)]);
  }

  if (num >= -32n) return new Uint8Array([Number(0x100n + num)]);
  if (num >= -128n)
    return concatBytes([
      new Uint8Array([0xd0]),
      new Uint8Array([Number(0x100n + num)]),
    ]);
  if (num >= -32768n)
    return concatBytes([new Uint8Array([0xd1]), encodeInt16BE(Number(num))]);
  if (num >= -2147483648n)
    return concatBytes([new Uint8Array([0xd2]), encodeInt32BE(Number(num))]);
  return concatBytes([new Uint8Array([0xd3]), encodeInt64BE(num)]);
}

function encodeString(value: string): Uint8Array {
  const bytes = textEncoder.encode(value);
  if (bytes.length <= 31) {
    return concatBytes([new Uint8Array([0xa0 | bytes.length]), bytes]);
  }
  if (bytes.length <= 0xff) {
    return concatBytes([new Uint8Array([0xd9, bytes.length]), bytes]);
  }
  if (bytes.length <= 0xffff) {
    return concatBytes([
      new Uint8Array([0xda]),
      encodeUint16BE(bytes.length),
      bytes,
    ]);
  }
  return concatBytes([
    new Uint8Array([0xdb]),
    encodeUint32BE(bytes.length),
    bytes,
  ]);
}

function encodeBinary(value: Uint8Array): Uint8Array {
  if (value.length <= 0xff) {
    return concatBytes([new Uint8Array([0xc4, value.length]), value]);
  }
  if (value.length <= 0xffff) {
    return concatBytes([
      new Uint8Array([0xc5]),
      encodeUint16BE(value.length),
      value,
    ]);
  }
  return concatBytes([
    new Uint8Array([0xc6]),
    encodeUint32BE(value.length),
    value,
  ]);
}

function encodeArrayHeader(length: number): Uint8Array {
  if (length <= 15) return new Uint8Array([0x90 | length]);
  if (length <= 0xffff)
    return concatBytes([new Uint8Array([0xdc]), encodeUint16BE(length)]);
  return concatBytes([new Uint8Array([0xdd]), encodeUint32BE(length)]);
}

function encodeMapHeader(length: number): Uint8Array {
  if (length <= 15) return new Uint8Array([0x80 | length]);
  if (length <= 0xffff)
    return concatBytes([new Uint8Array([0xde]), encodeUint16BE(length)]);
  return concatBytes([new Uint8Array([0xdf]), encodeUint32BE(length)]);
}

function getMapEntries(value: any): Array<[string, any]> {
  if (value instanceof Map) {
    return Array.from(value.entries()).map(([k, v]) => [String(k), v]);
  }
  return Object.entries(value ?? {});
}

function findEntryHint(
  hint: MsgpackHint | undefined,
  key: string,
): MapEntryHint | undefined {
  if (hint?.kind !== 'map') return undefined;
  return hint.entries.find((entry) => entry.keyId === key);
}

function encodeMapKey(key: string, entryHint?: MapEntryHint): Uint8Array {
  switch (entryHint?.keyType) {
    case 'int':
      return encodeIntNumber(Number(key));
    case 'float':
      return concatBytes([
        new Uint8Array([0xca]),
        encodeFloat32BE(Number(key)),
      ]);
    case 'boolean':
      return new Uint8Array([key === 'true' ? 0xc3 : 0xc2]);
    case 'nil':
      return new Uint8Array([0xc0]);
    default:
      return encodeString(key);
  }
}

function encodeValueWithHint(value: any, hint?: MsgpackHint): Uint8Array {
  if (value === null) return new Uint8Array([0xc0]);
  if (value === undefined) return new Uint8Array([0xc0]);
  if (typeof value === 'boolean') return new Uint8Array([value ? 0xc3 : 0xc2]);
  if (typeof value === 'bigint') return encodeIntNumber(value);
  if (typeof value === 'number') {
    if (hint?.kind === 'number' && hint.format === 'float') {
      return concatBytes([new Uint8Array([0xca]), encodeFloat32BE(value)]);
    }
    if (!Number.isInteger(value) || Object.is(value, -0)) {
      return concatBytes([new Uint8Array([0xca]), encodeFloat32BE(value)]);
    }
    return encodeIntNumber(value);
  }
  if (typeof value === 'string') return encodeString(value);
  if (value instanceof Uint8Array) return encodeBinary(value);
  if (Array.isArray(value)) {
    const itemHints = hint?.kind === 'array' ? hint.items : [];
    return concatBytes([
      encodeArrayHeader(value.length),
      ...value.map((item, index) =>
        encodeValueWithHint(item, itemHints[index]),
      ),
    ]);
  }
  if (value instanceof Map || typeof value === 'object') {
    const entries = getMapEntries(value);
    const parts: Uint8Array[] = [encodeMapHeader(entries.length)];
    for (const [key, entryValue] of entries) {
      const entryHint = findEntryHint(hint, key);
      parts.push(encodeMapKey(key, entryHint));
      parts.push(encodeValueWithHint(entryValue, entryHint?.valueHint));
    }
    return concatBytes(parts);
  }

  return encodeMsgpack(value);
}

export function encodeMsgpackWithHint(
  value: unknown,
  hint?: MsgpackHint,
): Uint8Array {
  return encodeValueWithHint(value, hint);
}
