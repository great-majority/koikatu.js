import { encode } from '@msgpack/msgpack';

// Minimal valid PNG (1x1 transparent pixel)
const MINIMAL_PNG = new Uint8Array([
  // PNG magic
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  // IHDR chunk (13 bytes data)
  0x00,
  0x00,
  0x00,
  0x0d, // length = 13
  0x49,
  0x48,
  0x44,
  0x52, // "IHDR"
  0x00,
  0x00,
  0x00,
  0x01, // width = 1
  0x00,
  0x00,
  0x00,
  0x01, // height = 1
  0x08,
  0x06, // bit depth 8, color type 6 (RGBA)
  0x00,
  0x00,
  0x00, // compression, filter, interlace
  0x1f,
  0x15,
  0xc4,
  0x89, // CRC
  // IDAT chunk (minimal)
  0x00,
  0x00,
  0x00,
  0x0a, // length = 10
  0x49,
  0x44,
  0x41,
  0x54, // "IDAT"
  0x78,
  0x9c,
  0x62,
  0x00,
  0x00,
  0x00,
  0x02,
  0x00,
  0x01,
  0xe5, // compressed data
  0x27,
  0xde,
  0xfc,
  0x07, // CRC
  // IEND chunk
  0x00,
  0x00,
  0x00,
  0x00, // length = 0
  0x49,
  0x45,
  0x4e,
  0x44, // "IEND"
  0xae,
  0x42,
  0x60,
  0x82, // CRC
]);

export { MINIMAL_PNG };

export function writeInt32LE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setInt32(0, value, true);
  return buf;
}

export function writeInt64LE(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigInt64(0, value, true);
  return buf;
}

export function writeInt8(value: number): Uint8Array {
  return new Uint8Array([value & 0xff]);
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function buildCardPayload(opts?: {
  productNo?: number;
  header?: string;
  version?: string;
  faceImage?: Uint8Array;
  language?: number;
  userid?: string;
  dataid?: string;
  packages?: number[];
  blocks?: { name: string; version: string; data: any }[];
}): Uint8Array {
  const header = opts?.header ?? '【KoiKatuChara】';
  const productNo =
    opts?.productNo ?? (header === '【EroMakeChara】' ? 200 : 100);
  const version = opts?.version ?? '0.0.0';
  const faceImage = opts?.faceImage ?? new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // fake face
  const language = opts?.language ?? 0;
  const userid = opts?.userid ?? 'test-user-id';
  const dataid = opts?.dataid ?? 'test-data-id';
  const packages = opts?.packages ?? [0];
  const blocks = opts?.blocks ?? [];

  const headerBytes = new TextEncoder().encode(header);
  const versionBytes = new TextEncoder().encode(version);
  const useridBytes = new TextEncoder().encode(userid);
  const dataidBytes = new TextEncoder().encode(dataid);

  const isEcHeader = header === '【EroMakeChara】';
  const isHoneycomeSeriesHeader =
    header === '【HCChara】' ||
    header === '【HCPChara】' ||
    header === '【DCChara】' ||
    header === '【SVChara】' ||
    header === '【ACChara】';

  function encodeMsgpack(data: unknown): Uint8Array {
    return encode(data, { forceFloat32: true }) as Uint8Array;
  }

  function encodeCustomBlock(data: Record<string, any>): Uint8Array {
    const keys = isHoneycomeSeriesHeader
      ? (['face', 'body'] as const)
      : (['face', 'body', 'hair'] as const);
    const parts: Uint8Array[] = [];
    for (const key of keys) {
      const bytes = encodeMsgpack(data[key] ?? null);
      parts.push(writeInt32LE(bytes.length), bytes);
    }
    return concatBytes(...parts);
  }

  function encodeCoordinateBlock(version: string, data: any): Uint8Array {
    if (version === '0.0.1') {
      const clothes = encodeMsgpack(data.clothes ?? null);
      const accessory = encodeMsgpack(data.accessory ?? null);
      return concatBytes(
        writeInt32LE(clothes.length),
        clothes,
        writeInt32LE(accessory.length),
        accessory,
      );
    }

    const coords = Array.isArray(data) ? data : [data];
    const blobs = coords.map((coord) => {
      if (isHoneycomeSeriesHeader) {
        const fields = [
          'clothes',
          'accessory',
          'makeup',
          'hair',
          'nail',
        ] as const;
        const parts: Uint8Array[] = [];
        for (const field of fields) {
          const bytes = encodeMsgpack(coord[field] ?? null);
          parts.push(writeInt32LE(bytes.length), bytes);
        }
        return concatBytes(...parts);
      }

      const clothes = encodeMsgpack(coord.clothes ?? null);
      const accessory = encodeMsgpack(coord.accessory ?? null);
      const makeup = encodeMsgpack(coord.makeup ?? null);
      return concatBytes(
        writeInt32LE(clothes.length),
        clothes,
        writeInt32LE(accessory.length),
        accessory,
        writeInt8(coord.enableMakeup ? 1 : 0),
        writeInt32LE(makeup.length),
        makeup,
      );
    });

    return encodeMsgpack(blobs);
  }

  // Build block index and raw bytes
  const blockDataParts: Uint8Array[] = [];
  const lstInfoEntries: {
    name: string;
    version: string;
    pos: number;
    size: number;
  }[] = [];
  let pos = 0;
  for (const block of blocks) {
    let blockBytes: Uint8Array;
    switch (block.name) {
      case 'Custom':
        blockBytes = encodeCustomBlock(block.data);
        break;
      case 'Coordinate':
        blockBytes = encodeCoordinateBlock(block.version, block.data);
        break;
      default:
        blockBytes = encodeMsgpack(block.data);
        break;
    }
    lstInfoEntries.push({
      name: block.name,
      version: block.version,
      pos,
      size: blockBytes.length,
    });
    blockDataParts.push(blockBytes);
    pos += blockBytes.length;
  }

  const rawBytes = concatBytes(...blockDataParts);
  const lstInfoIndex = encodeMsgpack({ lstInfo: lstInfoEntries });
  const lstInfoIndexBytes = new Uint8Array(lstInfoIndex);

  const headerParts = [
    writeInt32LE(productNo),
    writeInt8(headerBytes.length),
    headerBytes,
    writeInt8(versionBytes.length),
    versionBytes,
  ];

  if (isEcHeader) {
    headerParts.push(
      writeInt32LE(language),
      writeInt8(useridBytes.length),
      useridBytes,
      writeInt8(dataidBytes.length),
      dataidBytes,
      writeInt32LE(packages.length),
      ...packages.map((pkg) => writeInt32LE(pkg)),
    );
  } else {
    headerParts.push(writeInt32LE(faceImage.length), faceImage);
  }

  return concatBytes(
    ...headerParts,
    writeInt32LE(lstInfoIndexBytes.length),
    lstInfoIndexBytes,
    writeInt64LE(BigInt(rawBytes.length)),
    rawBytes,
  );
}

export function buildCardWithPng(
  opts?: Parameters<typeof buildCardPayload>[0],
): Uint8Array {
  const payload = buildCardPayload(opts);
  return concatBytes(MINIMAL_PNG, payload);
}
