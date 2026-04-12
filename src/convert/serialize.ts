import type { MsgpackHint } from '../parse/msgpack.js';
import { encodeMsgpack, encodeMsgpackWithHint } from '../parse/msgpack.js';
import type { BlockInfo, Card } from '../types.js';
import { BinaryWriter } from './writer.js';

function isEcHeader(header: string): boolean {
  return header === '【EroMakeChara】';
}

function isHoneycomeSeriesHeader(header: string): boolean {
  return (
    header === '【HCChara】' ||
    header === '【HCPChara】' ||
    header === '【DCChara】' ||
    header === '【SVChara】' ||
    header === '【ACChara】'
  );
}

// ============================================================
// Block-specific encoders
// ============================================================

/** Custom block: int32LE length + msgpack for each face/body/hair section. */
function encodeCustomBlock(
  custom: Record<string, any>,
  header: string,
  hint?: MsgpackHint,
): Uint8Array {
  const w = new BinaryWriter();
  const entries = hint?.kind === 'map' ? hint.entries : [];
  for (const key of isHoneycomeSeriesHeader(header)
    ? (['face', 'body'] as const)
    : (['face', 'body', 'hair'] as const)) {
    const valueHint = entries.find((entry) => entry.keyId === key)?.valueHint;
    const bytes = encodeMsgpackWithHint(custom[key] ?? null, valueHint);
    w.writeInt32LE(bytes.length);
    w.writeBytes(bytes);
  }
  return w.toUint8Array();
}

/** Coordinate v0.0.0 (KK/KKS): encode each outfit as a binary blob, then wrap it in msgpack. */
function encodeCoordinateV000(coords: any[], hint?: MsgpackHint): Uint8Array {
  const blobs: Uint8Array[] = [];
  const items = hint?.kind === 'array' ? hint.items : [];
  for (const [index, coord] of coords.entries()) {
    const bw = new BinaryWriter();
    const coordHint = items[index];
    const entries = coordHint?.kind === 'map' ? coordHint.entries : [];
    const clothesBytes = encodeMsgpackWithHint(
      coord.clothes ?? null,
      entries.find((entry) => entry.keyId === 'clothes')?.valueHint,
    );
    bw.writeInt32LE(clothesBytes.length);
    bw.writeBytes(clothesBytes);
    const accBytes = encodeMsgpackWithHint(
      coord.accessory ?? null,
      entries.find((entry) => entry.keyId === 'accessory')?.valueHint,
    );
    bw.writeInt32LE(accBytes.length);
    bw.writeBytes(accBytes);
    bw.writeUint8(coord.enableMakeup ? 1 : 0);
    const makeupBytes = encodeMsgpackWithHint(
      coord.makeup ?? null,
      entries.find((entry) => entry.keyId === 'makeup')?.valueHint,
    );
    bw.writeInt32LE(makeupBytes.length);
    bw.writeBytes(makeupBytes);
    blobs.push(bw.toUint8Array());
  }
  return encodeMsgpackWithHint(blobs);
}

/** Coordinate v0.0.0 (HC/SV/AC): encode each outfit as a binary blob, then wrap it in msgpack. */
function encodeCoordinateV000Honeycome(
  coords: any[],
  hint?: MsgpackHint,
): Uint8Array {
  const blobs: Uint8Array[] = [];
  const items = hint?.kind === 'array' ? hint.items : [];
  for (const [index, coord] of coords.entries()) {
    const bw = new BinaryWriter();
    const coordHint = items[index];
    const entries = coordHint?.kind === 'map' ? coordHint.entries : [];
    for (const key of [
      'clothes',
      'accessory',
      'makeup',
      'hair',
      'nail',
    ] as const) {
      const valueHint = entries.find((entry) => entry.keyId === key)?.valueHint;
      const bytes = encodeMsgpackWithHint(coord[key] ?? null, valueHint);
      bw.writeInt32LE(bytes.length);
      bw.writeBytes(bytes);
    }
    blobs.push(bw.toUint8Array());
  }
  return encodeMsgpackWithHint(blobs);
}

/** Coordinate v0.0.1 (EC): int32LE length + msgpack for clothes and accessory. */
function encodeCoordinateV001(
  coord: Record<string, any>,
  hint?: MsgpackHint,
): Uint8Array {
  const w = new BinaryWriter();
  const entries = hint?.kind === 'map' ? hint.entries : [];
  const clothesBytes = encodeMsgpackWithHint(
    coord.clothes ?? null,
    entries.find((entry) => entry.keyId === 'clothes')?.valueHint,
  );
  w.writeInt32LE(clothesBytes.length);
  w.writeBytes(clothesBytes);
  const accBytes = encodeMsgpackWithHint(
    coord.accessory ?? null,
    entries.find((entry) => entry.keyId === 'accessory')?.valueHint,
  );
  w.writeInt32LE(accBytes.length);
  w.writeBytes(accBytes);
  return w.toUint8Array();
}

/** Encode a block based on its name and blockIndex version. */
function encodeBlock(
  name: string,
  version: string,
  data: any,
  header: string,
  hint?: MsgpackHint,
  rawBytes?: Uint8Array,
): Uint8Array {
  if (rawBytes) {
    return rawBytes;
  }

  switch (name) {
    case 'Custom':
      return encodeCustomBlock(data, header, hint);
    case 'Coordinate':
      if (version === '0.0.1') {
        return encodeCoordinateV001(data, hint);
      }
      if (isHoneycomeSeriesHeader(header)) {
        return encodeCoordinateV000Honeycome(
          Array.isArray(data) ? data : [data],
          hint,
        );
      }
      return encodeCoordinateV000(Array.isArray(data) ? data : [data], hint);
    default:
      return encodeMsgpackWithHint(data, hint);
  }
}

// ============================================================
// serializeCard
// ============================================================

/**
 * Serialize a Card into binary form (PNG + payload).
 *
 * @param card Converted Card produced by transformCard
 * @param pngBytes PNG bytes from the source card, up to the IEND chunk
 */
export function serializeCard(card: Card, pngBytes: Uint8Array): Uint8Array {
  // 1. Encode each block.
  const encodedBlocks: { info: BlockInfo; bytes: Uint8Array }[] = [];
  let pos = 0;

  for (const info of card.blockIndex) {
    const data = card.blocks[info.name];
    const rawBytes = card.rawBlockBytes?.[info.name];
    const hint = card.blockHints?.[info.name];
    const bytes = encodeBlock(
      info.name,
      info.version,
      data,
      card.header.header,
      hint,
      rawBytes,
    );
    encodedBlocks.push({
      info: { name: info.name, version: info.version, pos, size: bytes.length },
      bytes,
    });
    pos += bytes.length;
  }

  // 2. Build lstInfo_index as msgpack.
  const lstInfo = encodedBlocks.map((b) => b.info);
  const lstInfoIndexBytes = encodeMsgpack({ lstInfo });

  // 3. Build lstInfo_raw by concatenating all block bytes.
  const rawParts = encodedBlocks.map((b) => b.bytes);
  const rawTotalLen = rawParts.reduce((acc, b) => acc + b.length, 0);
  const rawBytes = new Uint8Array(rawTotalLen);
  let rawOffset = 0;
  for (const part of rawParts) {
    rawBytes.set(part, rawOffset);
    rawOffset += part.length;
  }

  // 4. Build the header section.
  const w = new BinaryWriter();
  w.writeInt32LE(card.header.productNo);
  w.writeLengthPrefixedString(card.header.header, 'b');
  w.writeLengthPrefixedString(card.header.version, 'b');
  if (isEcHeader(card.header.header)) {
    w.writeInt32LE(card.header.language ?? 0);
    w.writeLengthPrefixedString(card.header.userid ?? '', 'b');
    w.writeLengthPrefixedString(card.header.dataid ?? '', 'b');
    const packages = card.header.packages ?? [];
    w.writeInt32LE(packages.length);
    for (const pkg of packages) {
      w.writeInt32LE(pkg);
    }
  } else {
    const faceImage = card.header.faceImage ?? new Uint8Array(0);
    w.writeInt32LE(faceImage.length);
    w.writeBytes(faceImage);
  }
  w.writeInt32LE(lstInfoIndexBytes.length);
  w.writeBytes(lstInfoIndexBytes);
  w.writeInt64LE(BigInt(rawTotalLen));
  w.writeBytes(rawBytes);

  const payload = w.toUint8Array();

  // 5. Concatenate the PNG bytes and payload.
  const result = new Uint8Array(pngBytes.length + payload.length);
  result.set(pngBytes, 0);
  result.set(payload, pngBytes.length);
  return result;
}
