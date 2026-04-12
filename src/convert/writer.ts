const textEncoder = new TextEncoder();

export class BinaryWriter {
  private chunks: Uint8Array[] = [];
  private _length = 0;

  get length(): number {
    return this._length;
  }

  writeUint8(value: number): void {
    const buf = new Uint8Array(1);
    buf[0] = value & 0xff;
    this.chunks.push(buf);
    this._length += 1;
  }

  writeInt8(value: number): void {
    this.writeUint8(value);
  }

  writeInt32LE(value: number): void {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, value, true);
    this.chunks.push(buf);
    this._length += 4;
  }

  writeInt64LE(value: bigint): void {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigInt64(0, value, true);
    this.chunks.push(buf);
    this._length += 8;
  }

  writeBytes(bytes: Uint8Array): void {
    if (bytes.length === 0) return;
    this.chunks.push(bytes);
    this._length += bytes.length;
  }

  writeLengthPrefixed(bytes: Uint8Array, type: 'b' | 'i'): void {
    if (type === 'b') {
      this.writeInt8(bytes.length);
    } else {
      this.writeInt32LE(bytes.length);
    }
    this.writeBytes(bytes);
  }

  writeLengthPrefixedString(str: string, type: 'b' | 'i'): void {
    this.writeLengthPrefixed(textEncoder.encode(str), type);
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this._length);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
