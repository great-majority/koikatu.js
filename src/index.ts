import { ERR_NO_CARD_PAYLOAD, KoikatuError } from './errors.js';
import { parseBlockIndex, parseBlocks } from './parse/blocks.js';
import { parseHeader as parseHeaderImpl } from './parse/header.js';
import { BinaryReader } from './parse/reader.js';
import { scanPngIend as scanPngIendImpl } from './parse/scanPng.js';
import { normalizeCard } from './schema/normalize.js';
import type {
  Card,
  CardHeader,
  CardSummary,
  Input,
  ParseOptions,
} from './types.js';

export {
  ERR_NO_CARD_PAYLOAD,
  ERR_NO_PNG,
  ERR_PARSE_BLOCK,
  ERR_UNSUPPORTED_HEADER,
  KoikatuError,
} from './errors.js';
export { decodeMsgpack } from './parse/msgpack.js';
export { BinaryReader } from './parse/reader.js';
export { scanPngIend as scanPngIendRaw } from './parse/scanPng.js';
export {
  decodeCoordinateBlock,
  decodeCustomBlock,
  decodeKKExBlock,
  decodeParameterBlock,
} from './schema/blocks.js';
export type {
  BlockInfo,
  Card,
  CardHeader,
  CardSummary,
  Input,
  ParseError,
  ParseOptions,
} from './types.js';

function toUint8Array(input: Input): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

export function scanPngIend(input: Input): number {
  return scanPngIendImpl(toUint8Array(input));
}

export function parseHeader(
  input: Input,
  options?: { containsPng?: boolean; strict?: boolean },
): CardHeader {
  const data = toUint8Array(input);
  let offset = 0;

  if (options?.containsPng !== false) {
    offset = scanPngIendImpl(data);
  }

  const reader = new BinaryReader(data.subarray(offset), options?.strict);
  const result = parseHeaderImpl(reader, { strict: options?.strict });
  return result.header;
}

export function parseCard(input: Input, options?: ParseOptions): Card {
  const data = toUint8Array(input);
  const strict = options?.strict ?? false;
  const decodeBlocks = options?.decodeBlocks ?? true;
  let offset = 0;

  if (options?.containsPng !== false) {
    offset = scanPngIendImpl(data);
  }

  const payload = data.subarray(offset);
  if (payload.length === 0) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'No card payload found after PNG data',
    );
  }

  const reader = new BinaryReader(payload, strict);

  const headerResult = parseHeaderImpl(reader, { strict });
  const { blockIndex, rawBytes } = parseBlockIndex(reader);
  const { blocks, rawBlockBytes, errors } = parseBlocks(blockIndex, rawBytes, {
    strict,
    decodeBlocks,
  });

  const card: Card = {
    header: headerResult.header,
    blocks,
    blockIndex,
    rawBlockBytes,
  };

  if (headerResult.unsupportedHeader) {
    card.unsupportedHeader = true;
  }

  if (errors.length > 0) {
    card.errors = errors;
  }

  return card;
}

export function parseCardSummary(
  input: Input,
  options?: ParseOptions,
): CardSummary {
  const card = parseCard(input, { ...options, decodeBlocks: true });
  return normalizeCard(card.header, card.blockIndex, card.blocks);
}

export function isCard(input: Input): boolean {
  try {
    parseHeader(input);
    return true;
  } catch {
    return false;
  }
}
