import { serializeCardPayload } from '../convert/serialize.js';
import type { BinaryWriter } from '../convert/writer.js';
import { parseBlockIndex, parseBlocks } from '../parse/blocks.js';
import { parseHeader } from '../parse/header.js';
import type { BinaryReader } from '../parse/reader.js';
import { scanPngIend } from '../parse/scanPng.js';
import type { Card, SceneObject, SceneVector3 } from '../types.js';

const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

export function parseJson<T>(json: string, message: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new Error(
      `${message}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function encodeJson(value: unknown): string {
  return JSON.stringify(value, null, 0);
}

export function hasPngMagic(reader: BinaryReader): boolean {
  const bytes = reader.subarray(reader.offset, PNG_MAGIC.length);
  if (bytes.length < PNG_MAGIC.length) return false;
  return PNG_MAGIC.every((byte, index) => bytes[index] === byte);
}

export function compareVersions(
  version: string | null | undefined,
  target: string,
): number {
  if (!version) return 1;

  const versionParts = version
    .split('.')
    .map((part) => Number.parseInt(part, 10));
  const targetParts = target
    .split('.')
    .map((part) => Number.parseInt(part, 10));

  while (versionParts.length < targetParts.length) versionParts.push(0);
  while (targetParts.length < versionParts.length) targetParts.push(0);

  for (let index = 0; index < versionParts.length; index += 1) {
    const left = versionParts[index] ?? 0;
    const right = targetParts[index] ?? 0;
    if (left < right) return -1;
    if (left > right) return 1;
  }

  return 0;
}

export function readVector3(reader: BinaryReader, label: string): SceneVector3 {
  return {
    x: required(reader.readFloat32LE(), `Failed to read ${label}.x`),
    y: required(reader.readFloat32LE(), `Failed to read ${label}.y`),
    z: required(reader.readFloat32LE(), `Failed to read ${label}.z`),
  };
}

export function writeVector3(writer: BinaryWriter, value: SceneVector3): void {
  writer.writeFloat32LE(value.x);
  writer.writeFloat32LE(value.y);
  writer.writeFloat32LE(value.z);
}

export function readColorRgba(
  reader: BinaryReader,
  label: string,
): { r: number; g: number; b: number; a: number } {
  return {
    r: required(reader.readFloat32LE(), `Failed to read ${label}.r`),
    g: required(reader.readFloat32LE(), `Failed to read ${label}.g`),
    b: required(reader.readFloat32LE(), `Failed to read ${label}.b`),
    a: required(reader.readFloat32LE(), `Failed to read ${label}.a`),
  };
}

export function writeColorRgba(
  writer: BinaryWriter,
  value: { r: number; g: number; b: number; a: number },
): void {
  writer.writeFloat32LE(value.r);
  writer.writeFloat32LE(value.g);
  writer.writeFloat32LE(value.b);
  writer.writeFloat32LE(value.a);
}

export function readJsonLengthPrefixed<T>(
  reader: BinaryReader,
  type: 'b' | 'i',
  label: string,
): T {
  const json = required(
    reader.readLengthPrefixedString(type),
    `Failed to read ${label}`,
  );
  return parseJson<T>(json, `Failed to parse ${label}`);
}

export function writeJsonLengthPrefixed(
  writer: BinaryWriter,
  value: unknown,
  type: 'b' | 'i',
): void {
  writer.writeLengthPrefixedString(encodeJson(value), type);
}

export function readJson7Bit<T>(reader: BinaryReader, label: string): T {
  const json = required(
    reader.read7BitEncodedString(),
    `Failed to read ${label}`,
  );
  return parseJson<T>(json, `Failed to parse ${label}`);
}

export function writeJson7Bit(writer: BinaryWriter, value: unknown): void {
  writer.write7BitEncodedString(encodeJson(value));
}

export function readBoolArray(
  reader: BinaryReader,
  count: number,
  label: string,
): boolean[] {
  const result: boolean[] = [];
  for (let index = 0; index < count; index += 1) {
    result.push(
      required(reader.readUint8(), `Failed to read ${label}[${index}]`) !== 0,
    );
  }
  return result;
}

export function writeBoolArray(writer: BinaryWriter, values: boolean[]): void {
  for (const value of values) {
    writer.writeUint8(value ? 1 : 0);
  }
}

export function readObjectInfoBase(
  reader: BinaryReader,
  label: string,
): Record<string, unknown> {
  return {
    dicKey: required(reader.readInt32LE(), `Failed to read ${label}.dicKey`),
    position: readVector3(reader, `${label}.position`),
    rotation: readVector3(reader, `${label}.rotation`),
    scale: readVector3(reader, `${label}.scale`),
    treeState: required(
      reader.readInt32LE(),
      `Failed to read ${label}.treeState`,
    ),
    visible:
      required(reader.readUint8(), `Failed to read ${label}.visible`) !== 0,
  };
}

export function writeObjectInfoBase(
  writer: BinaryWriter,
  data: Record<string, any>,
): void {
  writer.writeInt32LE(data.dicKey);
  writeVector3(writer, data.position);
  writeVector3(writer, data.rotation);
  writeVector3(writer, data.scale);
  writer.writeInt32LE(data.treeState);
  writer.writeUint8(data.visible ? 1 : 0);
}

export function readBoneInfo(
  reader: BinaryReader,
  label: string,
): Record<string, any> {
  return {
    dicKey: required(reader.readInt32LE(), `Failed to read ${label}.dicKey`),
    changeAmount: {
      position: readVector3(reader, `${label}.changeAmount.position`),
      rotation: readVector3(reader, `${label}.changeAmount.rotation`),
      scale: readVector3(reader, `${label}.changeAmount.scale`),
    },
  };
}

export function writeBoneInfo(
  writer: BinaryWriter,
  value: Record<string, any>,
): void {
  writer.writeInt32LE(value.dicKey);
  writeVector3(writer, value.changeAmount.position);
  writeVector3(writer, value.changeAmount.rotation);
  writeVector3(writer, value.changeAmount.scale);
}

export function parseEmbeddedCard(
  reader: BinaryReader,
  options?: { hasPng?: boolean; strict?: boolean; decodeBlocks?: boolean },
): { card: Card; pngBytes?: Uint8Array } {
  const strict = options?.strict ?? false;
  const decodeBlocks = options?.decodeBlocks ?? true;
  const hasPng = options?.hasPng ?? hasPngMagic(reader);
  let pngBytes: Uint8Array | undefined;

  if (hasPng) {
    const remaining = reader.subarray(reader.offset, reader.remaining);
    const pngLength = scanPngIend(remaining);
    pngBytes = remaining.subarray(0, pngLength);
    reader.offset += pngLength;
  }

  const headerResult = parseHeader(reader, { strict });
  const { blockIndex, rawBytes } = parseBlockIndex(reader);
  const { blocks, rawBlockBytes, blockHints, errors } = parseBlocks(
    blockIndex,
    rawBytes,
    {
      strict,
      decodeBlocks,
      header: headerResult.header.header,
    },
  );

  const card: Card = {
    header: headerResult.header,
    blocks,
    blockIndex,
    rawBlockBytes,
    blockHints,
  };

  if (headerResult.unsupportedHeader) {
    card.unsupportedHeader = true;
  }
  if (errors.length > 0) {
    card.errors = errors;
  }

  return { card, pngBytes };
}

export function serializeEmbeddedCard(
  card: Card,
  pngBytes?: Uint8Array,
): Uint8Array {
  if (pngBytes) {
    const payload = serializeCardPayload(card);
    const result = new Uint8Array(pngBytes.length + payload.length);
    result.set(pngBytes, 0);
    result.set(payload, pngBytes.length);
    return result;
  }

  return serializeCardPayload(card);
}

export function readChildObjects(
  reader: BinaryReader,
  version: string,
  loader: (reader: BinaryReader, type: number, version: string) => SceneObject,
): SceneObject[] {
  const count = required(
    reader.readInt32LE(),
    'Failed to read child object count',
  );
  const children: SceneObject[] = [];
  for (let index = 0; index < count; index += 1) {
    const type = required(
      reader.readInt32LE(),
      `Failed to read child object type at ${index}`,
    );
    children.push(loader(reader, type, version));
  }
  return children;
}

export function writeChildObjects(
  writer: BinaryWriter,
  children: SceneObject[],
  saver: (writer: BinaryWriter, object: SceneObject, version: string) => void,
  version: string,
): void {
  writer.writeInt32LE(children.length);
  for (const child of children) {
    writer.writeInt32LE(child.type);
    saver(writer, child, version);
  }
}
