import { decode } from '@msgpack/msgpack';

export function decodeMsgpack(data: Uint8Array): any {
  return decode(data, { useBigInt64: true });
}
