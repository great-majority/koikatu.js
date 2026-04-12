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
  '【EroMakeChara】',
  '【HCChara】',
  '【HCPChara】',
  '【DCChara】',
  '【SVChara】',
  '【ACChara】',
]);

function isEcHeader(header: string): boolean {
  return header === '【EroMakeChara】';
}

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

  const result: HeaderParseResult = {
    header: {
      productNo,
      header: headerStr,
      version: versionStr,
    },
  };

  if (isEcHeader(headerStr)) {
    const language = reader.readInt32LE();
    if (language === undefined) {
      throw new KoikatuError(ERR_NO_CARD_PAYLOAD, 'Failed to read EC language');
    }

    const userid = reader.readLengthPrefixedString('b');
    if (userid === undefined) {
      throw new KoikatuError(ERR_NO_CARD_PAYLOAD, 'Failed to read EC user id');
    }

    const dataid = reader.readLengthPrefixedString('b');
    if (dataid === undefined) {
      throw new KoikatuError(ERR_NO_CARD_PAYLOAD, 'Failed to read EC data id');
    }

    const packageCount = reader.readInt32LE();
    if (packageCount === undefined) {
      throw new KoikatuError(
        ERR_NO_CARD_PAYLOAD,
        'Failed to read EC package count',
      );
    }

    const packages: number[] = [];
    for (let i = 0; i < packageCount; i++) {
      const pkg = reader.readInt32LE();
      if (pkg === undefined) {
        throw new KoikatuError(
          ERR_NO_CARD_PAYLOAD,
          'Failed to read EC package entry',
        );
      }
      packages.push(pkg);
    }

    result.header.language = language;
    result.header.userid = userid;
    result.header.dataid = dataid;
    result.header.packages = packages;
  } else {
    const faceImage = reader.readLengthPrefixed('i');
    result.header.faceImage = faceImage ?? undefined;
  }

  if (unsupportedHeader) {
    result.unsupportedHeader = true;
  }

  return result;
}
