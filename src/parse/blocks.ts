import {
  ERR_NO_CARD_PAYLOAD,
  ERR_PARSE_BLOCK,
  KoikatuError,
} from '../errors.js';
import {
  decodeCoordinateBlock,
  decodeCustomBlock,
  decodeKKExBlock,
} from '../schema/blocks.js';
import type { BlockInfo, ParseError } from '../types.js';
import { decodeMsgpack } from './msgpack.js';
import type { BinaryReader } from './reader.js';

export interface BlockIndexResult {
  blockIndex: BlockInfo[];
  rawBytes: Uint8Array;
}

export function parseBlockIndex(reader: BinaryReader): BlockIndexResult {
  const indexData = reader.readLengthPrefixed('i');
  if (!indexData) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'Failed to read block index data',
    );
  }

  const decoded = decodeMsgpack(indexData) as { lstInfo?: any[] };
  if (!decoded?.lstInfo || !Array.isArray(decoded.lstInfo)) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'Block index missing lstInfo array',
    );
  }

  const blockIndex: BlockInfo[] = decoded.lstInfo.map((entry: any) => ({
    name: String(entry.name ?? ''),
    version: String(entry.version ?? ''),
    pos: Number(entry.pos ?? 0),
    size: Number(entry.size ?? 0),
  }));

  const rawBytes = reader.readLengthPrefixed('q');
  if (!rawBytes) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'Failed to read raw block bytes',
    );
  }

  return { blockIndex, rawBytes };
}

export function parseBlocks(
  blockIndex: BlockInfo[],
  rawBytes: Uint8Array,
  options?: { strict?: boolean; decodeBlocks?: boolean },
): {
  blocks: Record<string, any>;
  rawBlockBytes: Record<string, Uint8Array>;
  errors: ParseError[];
} {
  const decodeBlocks = options?.decodeBlocks ?? true;
  const strict = options?.strict ?? false;
  const blocks: Record<string, any> = {};
  const rawBlockBytes: Record<string, Uint8Array> = {};
  const errors: ParseError[] = [];

  for (const info of blockIndex) {
    const end = info.pos + info.size;
    if (end > rawBytes.length) {
      const err: ParseError = {
        code: ERR_PARSE_BLOCK,
        message: `Block "${info.name}" exceeds raw data bounds (pos=${info.pos}, size=${info.size}, total=${rawBytes.length})`,
        at: info.name,
      };
      if (strict) throw new KoikatuError(err.code, err.message, err.at);
      errors.push(err);
      continue;
    }

    const slice = rawBytes.slice(info.pos, end);
    rawBlockBytes[info.name] = slice;

    if (decodeBlocks) {
      try {
        blocks[info.name] = decodeBlock(info.name, info.version, slice);
      } catch (e) {
        const err: ParseError = {
          code: ERR_PARSE_BLOCK,
          message: `Failed to decode block "${info.name}": ${e instanceof Error ? e.message : String(e)}`,
          at: info.name,
        };
        if (strict) throw new KoikatuError(err.code, err.message, err.at);
        errors.push(err);
      }
    }
  }

  return { blocks, rawBlockBytes, errors };
}

function decodeBlock(name: string, version: string, data: Uint8Array): any {
  switch (name) {
    case 'Custom':
      return decodeCustomBlock(data);
    case 'Coordinate':
      return decodeCoordinateBlock(data, version);
    case 'KKEx':
      return decodeKKExBlock(data);
    default:
      return decodeMsgpack(data);
  }
}
