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

/** カードヘッダー文字列からソースタイトルを判定 */
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
 * 変換済み Card をバイナリ（PNG + ペイロード）にシリアライズする。
 *
 * @param card      transformCard で変換済みの Card
 * @param pngBytes  元カードの PNG バイト列（IEND チャンクまで）
 */
export function serializeCard(card: Card, pngBytes: Uint8Array): Uint8Array {
  return serializeCardImpl(card, pngBytes);
}

/**
 * Card を別タイトル形式に変換する（blocks・header を書き換え）。
 * バイナリへの書き出しは {@link serializeCard} で行う。
 *
 * @param card     parseCard で得た Card
 * @param target   変換先タイトル識別子
 * @param options  pngBytes: 変換先で必要な画像データ（HC↔SV 変換時）
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

  // KK シリーズ
  if (src === 'KK' && target === 'KKS') return kkToKks(card);
  if (src === 'KK' && target === 'EC') return kkToEc(card);
  if (src === 'KKS' && target === 'KK') return kksToKk(card);
  if (src === 'KKS' && target === 'EC') return kksToEc(card);
  if (src === 'EC' && target === 'KK') return ecToKk(card, png);
  if (src === 'EC' && target === 'KKS') return ecToKks(card, png);

  // HC シリーズ
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
 * ファイルバイト列を受け取り、指定タイトルに変換して新バイト列を返す。
 * 内部で parseCard → transformCard → serializeCard を一括実行する。
 *
 * @param input   元のカードファイルバイト列（PNG + ペイロード）
 * @param target  変換先タイトル識別子
 */
export function convertCard(input: Input, target: ConvertTarget): Uint8Array {
  const data =
    input instanceof Uint8Array ? input : new Uint8Array(input as ArrayBuffer);

  // PNG 部分を切り出す
  const pngEnd = scanPngIend(data);
  const pngBytes = data.subarray(0, pngEnd);

  // パース（循環参照を避けるため下位モジュールを直接使用）
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

  // 変換
  const converted = transformCard(card, target, { pngBytes });

  // シリアライズ
  return serializeCard(converted, pngBytes);
}
