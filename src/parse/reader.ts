const textDecoder = new TextDecoder('utf-8');

export class BinaryReader {
  private view: DataView;
  private data: Uint8Array;
  private _offset: number;
  private strict: boolean;

  constructor(input: ArrayBuffer | Uint8Array, strict = false) {
    if (input instanceof Uint8Array) {
      this.data = input;
      this.view = new DataView(
        input.buffer,
        input.byteOffset,
        input.byteLength,
      );
    } else {
      this.data = new Uint8Array(input);
      this.view = new DataView(input);
    }
    this._offset = 0;
    this.strict = strict;
  }

  get offset(): number {
    return this._offset;
  }

  set offset(value: number) {
    this._offset = value;
  }

  get remaining(): number {
    return this.data.byteLength - this._offset;
  }

  private check(bytes: number): boolean {
    if (this._offset + bytes > this.data.byteLength) {
      if (this.strict) {
        throw new RangeError(
          `Read out of bounds: offset ${this._offset} + ${bytes} > ${this.data.byteLength}`,
        );
      }
      return false;
    }
    return true;
  }

  readInt8(): number | undefined {
    if (!this.check(1)) return undefined;
    const val = this.view.getInt8(this._offset);
    this._offset += 1;
    return val;
  }

  readUint8(): number | undefined {
    if (!this.check(1)) return undefined;
    const val = this.view.getUint8(this._offset);
    this._offset += 1;
    return val;
  }

  readInt32LE(): number | undefined {
    if (!this.check(4)) return undefined;
    const val = this.view.getInt32(this._offset, true);
    this._offset += 4;
    return val;
  }

  readUint32BE(): number | undefined {
    if (!this.check(4)) return undefined;
    const val = this.view.getUint32(this._offset, false);
    this._offset += 4;
    return val;
  }

  readInt64LE(): bigint | undefined {
    if (!this.check(8)) return undefined;
    const val = this.view.getBigInt64(this._offset, true);
    this._offset += 8;
    return val;
  }

  readBytes(len: number): Uint8Array | undefined {
    if (len < 0) return undefined;
    if (!this.check(len)) return undefined;
    const slice = this.data.slice(this._offset, this._offset + len);
    this._offset += len;
    return slice;
  }

  readLengthPrefixed(sizeType: 'b' | 'i' | 'q'): Uint8Array | undefined {
    let len: number | bigint | undefined;
    switch (sizeType) {
      case 'b':
        len = this.readInt8();
        break;
      case 'i':
        len = this.readInt32LE();
        break;
      case 'q':
        len = this.readInt64LE();
        break;
    }
    if (len === undefined) return undefined;
    return this.readBytes(Number(len));
  }

  readLengthPrefixedString(sizeType: 'b' | 'i'): string | undefined {
    const bytes = this.readLengthPrefixed(sizeType);
    if (bytes === undefined) return undefined;
    return textDecoder.decode(bytes);
  }

  subarray(offset: number, length: number): Uint8Array {
    return this.data.slice(offset, offset + length);
  }
}
