export type Input = ArrayBuffer | Uint8Array;

export type ParseOptions = {
  containsPng?: boolean;
  strict?: boolean;
  decodeBlocks?: boolean;
};

export type CardHeader = {
  productNo: number;
  header: string;
  version: string;
  faceImage?: Uint8Array;
};

export type BlockInfo = {
  name: string;
  version: string;
  pos: number;
  size: number;
};

export type ParseError = {
  code: string;
  message: string;
  at?: string;
};

export type Card = {
  header: CardHeader;
  blocks: Record<string, any>;
  blockIndex: BlockInfo[];
  rawBlockBytes?: Record<string, Uint8Array>;
  errors?: ParseError[];
  unsupportedHeader?: boolean;
};

export type CardSummary = {
  header: CardHeader;
  product: string;
  name?: string;
  birthday?: { month?: number; day?: number };
  sex?: number;
  hasKKEx?: boolean;
  blocks: string[];
};
