import { describe, expect, it } from 'vitest';
import { BinaryReader } from '../../src/parse/reader.js';

describe('BinaryReader', () => {
  it('should read int8', () => {
    const reader = new BinaryReader(new Uint8Array([0x42]));
    expect(reader.readInt8()).toBe(0x42);
    expect(reader.offset).toBe(1);
  });

  it('should read int32LE', () => {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, 12345, true);
    const reader = new BinaryReader(buf);
    expect(reader.readInt32LE()).toBe(12345);
  });

  it('should read int64LE', () => {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigInt64(0, 9876543210n, true);
    const reader = new BinaryReader(buf);
    expect(reader.readInt64LE()).toBe(9876543210n);
  });

  it('should read uint32BE', () => {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, 0x12345678, false);
    const reader = new BinaryReader(buf);
    expect(reader.readUint32BE()).toBe(0x12345678);
  });

  it('should read bytes', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const reader = new BinaryReader(data);
    const result = reader.readBytes(3);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
    expect(reader.offset).toBe(3);
  });

  it('should return undefined on out of bounds in lenient mode', () => {
    const reader = new BinaryReader(new Uint8Array(1));
    expect(reader.readInt32LE()).toBeUndefined();
  });

  it('should throw on out of bounds in strict mode', () => {
    const reader = new BinaryReader(new Uint8Array(1), true);
    expect(() => reader.readInt32LE()).toThrow('Read out of bounds');
  });

  it('should read length-prefixed data with int8 size', () => {
    // 3 bytes of data, prefixed by length byte
    const data = new Uint8Array([3, 0x41, 0x42, 0x43]);
    const reader = new BinaryReader(data);
    const result = reader.readLengthPrefixed('b');
    expect(result).toEqual(new Uint8Array([0x41, 0x42, 0x43]));
  });

  it('should read length-prefixed data with int32LE size', () => {
    const buf = new Uint8Array(6);
    new DataView(buf.buffer).setInt32(0, 2, true);
    buf[4] = 0xaa;
    buf[5] = 0xbb;
    const reader = new BinaryReader(buf);
    const result = reader.readLengthPrefixed('i');
    expect(result).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it('should read length-prefixed string', () => {
    const str = 'Hello';
    const encoded = new TextEncoder().encode(str);
    const data = new Uint8Array(1 + encoded.length);
    data[0] = encoded.length;
    data.set(encoded, 1);
    const reader = new BinaryReader(data);
    expect(reader.readLengthPrefixedString('b')).toBe('Hello');
  });

  it('should track remaining bytes', () => {
    const reader = new BinaryReader(new Uint8Array(10));
    expect(reader.remaining).toBe(10);
    reader.readInt8();
    expect(reader.remaining).toBe(9);
  });
});
