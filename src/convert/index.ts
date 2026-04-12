import { ERR_NO_CARD_PAYLOAD, KoikatuError } from '../errors.js';
import { parseBlockIndex, parseBlocks } from '../parse/blocks.js';
import { parseHeader } from '../parse/header.js';
import { BinaryReader } from '../parse/reader.js';
import { scanPngIend } from '../parse/scanPng.js';
import type { Card, Input } from '../types.js';
import { acToHc, acToSv, hcToAc, hcToSv, svToAc, svToHc } from './hc-series.js';
import {
  ecToKk,
  ecToKks,
  kksToEc,
  kksToKk,
  kkToEc,
  kkToKks,
} from './kk-series.js';
import { serializeCard as serializeCardImpl } from './serialize.js';

export type ConvertTarget = 'KK' | 'KKS' | 'EC' | 'HC' | 'SV' | 'AC';

type SourceType = ConvertTarget;

/** Detect the source game from the card header string. */
function detectSourceType(header: string): SourceType {
  switch (header) {
    case '【KoiKatuChara】':
    case '【KoiKatuCharaSP】':
      return 'KK';
    case '【KoiKatuCharaSun】':
      return 'KKS';
    case '【EroMakeChara】':
      return 'EC';
    case '【HCChara】':
    case '【HCPChara】':
    case '【DCChara】':
      return 'HC';
    case '【SVChara】':
      return 'SV';
    case '【ACChara】':
      return 'AC';
    default:
      throw new Error(`変換非対応のヘッダーです: "${header}"`);
  }
}

/**
 * Serialize a converted Card back into binary form (PNG + payload).
 *
 * @param card Converted Card produced by transformCard
 * @param pngBytes PNG bytes from the source card, up to the IEND chunk
 */
export function serializeCard(card: Card, pngBytes: Uint8Array): Uint8Array {
  return serializeCardImpl(card, pngBytes);
}

/**
 * Convert a Card to another game format by rewriting the header and blocks.
 * Use {@link serializeCard} to write the result back to binary.
 *
 * @param card Card returned by parseCard
 * @param target Target game identifier
 * @param options pngBytes: image bytes required by some target formats (Honeycome <-> Summer Vacation Scramble)
 */
export function transformCard(
  card: Card,
  target: ConvertTarget,
  options?: { pngBytes?: Uint8Array },
): Card {
  const src = detectSourceType(card.header.header);
  if (src === target) {
    throw new Error(`ソースと変換先が同じです: ${src}`);
  }

  const png = options?.pngBytes;

  // Koikatsu-series conversions
  if (src === 'KK' && target === 'KKS') return kkToKks(card);
  if (src === 'KK' && target === 'EC') return kkToEc(card);
  if (src === 'KKS' && target === 'KK') return kksToKk(card);
  if (src === 'KKS' && target === 'EC') return kksToEc(card);
  if (src === 'EC' && target === 'KK') return ecToKk(card, png);
  if (src === 'EC' && target === 'KKS') return ecToKks(card, png);

  // Honeycome-series conversions
  if (src === 'HC' && target === 'SV') return hcToSv(card, png);
  if (src === 'HC' && target === 'AC') return hcToAc(card, png);
  if (src === 'SV' && target === 'HC') return svToHc(card, png);
  if (src === 'SV' && target === 'AC') return svToAc(card);
  if (src === 'AC' && target === 'SV') return acToSv(card);
  if (src === 'AC' && target === 'HC') return acToHc(card, png);

  throw new Error(
    `変換経路が定義されていません: ${src} → ${target}（シリーズ間の変換は非対応）`,
  );
}

/**
 * Convert a card file to the target game and return the new byte array.
 * Internally this runs parseCard -> transformCard -> serializeCard.
 *
 * @param input Source card file bytes (PNG + payload)
 * @param target Target game identifier
 */
export function convertCard(input: Input, target: ConvertTarget): Uint8Array {
  const data =
    input instanceof Uint8Array ? input : new Uint8Array(input as ArrayBuffer);

  // Extract the PNG portion.
  const pngEnd = scanPngIend(data);
  const pngBytes = data.subarray(0, pngEnd);

  // Parse directly through lower-level modules to avoid circular imports.
  const payload = data.subarray(pngEnd);
  if (payload.length === 0) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'No card payload found after PNG data',
    );
  }
  const reader = new BinaryReader(payload);
  const headerResult = parseHeader(reader);
  const { blockIndex, rawBytes } = parseBlockIndex(reader);
  const { blocks, rawBlockBytes, blockHints } = parseBlocks(
    blockIndex,
    rawBytes,
    {
      header: headerResult.header.header,
    },
  );
  const card: Card = {
    header: headerResult.header,
    blocks,
    blockIndex,
    rawBlockBytes,
    blockHints,
    ...(headerResult.unsupportedHeader ? { unsupportedHeader: true } : {}),
  };

  // Transform the parsed card.
  const converted = transformCard(card, target, { pngBytes });

  // Serialize the converted card.
  return serializeCard(converted, pngBytes);
}
