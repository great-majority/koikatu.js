export const ERR_NO_PNG = 'ERR_NO_PNG';
export const ERR_NO_CARD_PAYLOAD = 'ERR_NO_CARD_PAYLOAD';
export const ERR_UNSUPPORTED_HEADER = 'ERR_UNSUPPORTED_HEADER';
export const ERR_PARSE_BLOCK = 'ERR_PARSE_BLOCK';

export class KoikatuError extends Error {
  code: string;
  at?: string;

  constructor(code: string, message: string, at?: string) {
    super(message);
    this.name = 'KoikatuError';
    this.code = code;
    this.at = at;
  }
}
