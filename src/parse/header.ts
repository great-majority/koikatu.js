import {
  ERR_NO_CARD_PAYLOAD,
  ERR_UNSUPPORTED_HEADER,
  KoikatuError,
} from '../errors.js';
import type { CardHeader } from '../types.js';
import type { BinaryReader } from './reader.js';

const SUPPORTED_HEADERS = new Set([
  '【KoiKatuChara】',
  '【KoiKatuCharaSun】',
  '【KoiKatuCharaSP】',
  '【Emocre】',
  '【HCChara】',
  '【HCPChara】',
  '【DCChara】',
  '【SVChara】',
  '【ACChara】',
]);

export interface HeaderParseResult {
  header: CardHeader;
  unsupportedHeader?: boolean;
}

export function parseHeader(
  reader: BinaryReader,
  options?: { strict?: boolean },
): HeaderParseResult {
  const strict = options?.strict ?? false;

  const productNo = reader.readInt32LE();
  if (productNo === undefined) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'Failed to read product number',
    );
  }

  const headerStr = reader.readLengthPrefixedString('b');
  if (headerStr === undefined) {
    throw new KoikatuError(ERR_NO_CARD_PAYLOAD, 'Failed to read header string');
  }

  let unsupportedHeader: boolean | undefined;
  if (!SUPPORTED_HEADERS.has(headerStr)) {
    if (strict) {
      throw new KoikatuError(
        ERR_UNSUPPORTED_HEADER,
        `Unsupported header: "${headerStr}"`,
      );
    }
    unsupportedHeader = true;
  }

  const versionStr = reader.readLengthPrefixedString('b');
  if (versionStr === undefined) {
    throw new KoikatuError(
      ERR_NO_CARD_PAYLOAD,
      'Failed to read version string',
    );
  }

  const faceImage = reader.readLengthPrefixed('i');

  const result: HeaderParseResult = {
    header: {
      productNo,
      header: headerStr,
      version: versionStr,
      faceImage: faceImage ?? undefined,
    },
  };

  if (unsupportedHeader) {
    result.unsupportedHeader = true;
  }

  return result;
}
