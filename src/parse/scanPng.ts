import { ERR_NO_PNG, KoikatuError } from '../errors.js';

const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function scanPngIend(data: Uint8Array): number {
  if (data.length < 8) {
    throw new KoikatuError(ERR_NO_PNG, 'Data too short to contain PNG header');
  }

  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_MAGIC[i]) {
      throw new KoikatuError(ERR_NO_PNG, 'Invalid PNG magic bytes');
    }
  }

  let offset = 8;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  while (offset + 12 <= data.length) {
    const chunkLen = view.getUint32(offset, false);
    const chunkType =
      String.fromCharCode(data[offset + 4]) +
      String.fromCharCode(data[offset + 5]) +
      String.fromCharCode(data[offset + 6]) +
      String.fromCharCode(data[offset + 7]);

    // chunk = 4 (length) + 4 (type) + chunkLen (data) + 4 (CRC)
    const chunkTotal = 4 + 4 + chunkLen + 4;

    if (offset + chunkTotal > data.length) {
      throw new KoikatuError(
        ERR_NO_PNG,
        `Truncated PNG chunk "${chunkType}" at offset ${offset}`,
      );
    }

    if (chunkType === 'IEND') {
      return offset + chunkTotal;
    }

    offset += chunkTotal;
  }

  throw new KoikatuError(ERR_NO_PNG, 'PNG IEND chunk not found');
}
