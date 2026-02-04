import { encode } from '@msgpack/msgpack';
import { describe, expect, it } from 'vitest';
import { parseBlockIndex, parseBlocks } from '../../src/parse/blocks.js';
import { BinaryReader } from '../../src/parse/reader.js';
import { concatBytes, writeInt32LE, writeInt64LE } from './helpers.js';

function buildBlockIndexData(
  blocks: { name: string; version: string; data: any }[],
) {
  const blockDataParts: Uint8Array[] = [];
  const lstInfoEntries: {
    name: string;
    version: string;
    pos: number;
    size: number;
  }[] = [];
  let pos = 0;
  for (const block of blocks) {
    const encoded = new Uint8Array(encode(block.data));
    lstInfoEntries.push({
      name: block.name,
      version: block.version,
      pos,
      size: encoded.length,
    });
    blockDataParts.push(encoded);
    pos += encoded.length;
  }

  const rawBytes = concatBytes(...blockDataParts);
  const lstInfoIndex = new Uint8Array(encode({ lstInfo: lstInfoEntries }));

  return concatBytes(
    writeInt32LE(lstInfoIndex.length),
    lstInfoIndex,
    writeInt64LE(BigInt(rawBytes.length)),
    rawBytes,
  );
}

describe('parseBlockIndex', () => {
  it('should parse block index and raw bytes', () => {
    const data = buildBlockIndexData([
      { name: 'Parameter', version: '0.0.5', data: { lastname: 'Test' } },
      { name: 'Custom', version: '0.0.2', data: { face: 1 } },
    ]);

    const reader = new BinaryReader(data);
    const result = parseBlockIndex(reader);

    expect(result.blockIndex).toHaveLength(2);
    expect(result.blockIndex[0].name).toBe('Parameter');
    expect(result.blockIndex[0].version).toBe('0.0.5');
    expect(result.blockIndex[1].name).toBe('Custom');
    expect(result.rawBytes.length).toBeGreaterThan(0);
  });
});

describe('parseBlocks', () => {
  it('should decode blocks from raw bytes', () => {
    const paramData = { lastname: 'Tanaka', firstname: 'Hana' };
    const aboutData = { info: 'test' };
    const data = buildBlockIndexData([
      { name: 'Parameter', version: '0.0.5', data: paramData },
      { name: 'About', version: '0.0.1', data: aboutData },
    ]);

    const reader = new BinaryReader(data);
    const { blockIndex, rawBytes } = parseBlockIndex(reader);
    const { blocks, errors } = parseBlocks(blockIndex, rawBytes);

    expect(errors).toHaveLength(0);
    expect(blocks.Parameter).toEqual(paramData);
    expect(blocks.About).toEqual(aboutData);
  });

  it('should skip decoding when decodeBlocks is false', () => {
    const data = buildBlockIndexData([
      { name: 'Parameter', version: '0.0.5', data: { test: 1 } },
    ]);

    const reader = new BinaryReader(data);
    const { blockIndex, rawBytes } = parseBlockIndex(reader);
    const { blocks, rawBlockBytes } = parseBlocks(blockIndex, rawBytes, {
      decodeBlocks: false,
    });

    expect(Object.keys(blocks)).toHaveLength(0);
    expect(rawBlockBytes.Parameter).toBeDefined();
  });

  it('should collect errors for corrupted blocks in lenient mode', () => {
    const lstInfoIndex = new Uint8Array(
      encode({
        lstInfo: [{ name: 'Bad', version: '0.0.0', pos: 0, size: 100 }],
      }),
    );
    const rawBytes = new Uint8Array(10); // too small

    const data = concatBytes(
      writeInt32LE(lstInfoIndex.length),
      lstInfoIndex,
      writeInt64LE(BigInt(rawBytes.length)),
      rawBytes,
    );

    const reader = new BinaryReader(data);
    const result = parseBlockIndex(reader);
    const { errors } = parseBlocks(result.blockIndex, result.rawBytes);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('ERR_PARSE_BLOCK');
  });
});
