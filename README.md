# koikatu.js

[![npm version](https://img.shields.io/npm/v/koikatu.js)](https://www.npmjs.com/package/koikatu.js)

Parser library for Koikatu / Honeycome character cards. Extracts character data from the binary payload appended after the PNG IEND chunk.

Works in both browser and Node.js. Dual ESM / CJS output.

[日本語版 README](./README.ja.md)

## Install

```bash
npm install koikatu.js
```

## Usage

```ts
import { parseCard, parseCardSummary, isCard } from 'koikatu.js';

// Check if a file is a character card
const buf = await fetch('card.png').then(r => r.arrayBuffer());
if (isCard(buf)) {
  console.log('Character card detected');
}

// Full parse
const card = parseCard(buf);
console.log(card.header.header);       // "【KoiKatuChara】"
console.log(card.blockIndex);          // [{ name: "Custom", ... }, ...]
console.log(card.blocks['Parameter']); // { lastname: "白峰", firstname: "一乃", ... }

// Summary only
const summary = parseCardSummary(buf);
console.log(summary.product);  // "【KoiKatuChara】"
console.log(summary.name);     // "白峰 一乃"
console.log(summary.birthday); // { month: 5, day: 12 }
```

### Raw payload without PNG

```ts
const card = parseCard(rawPayload, { containsPng: false });
```

## API

### `parseCard(input, options?): Card`

Fully parses a card and returns the header, all decoded blocks, and the block index.

### `parseCardSummary(input, options?): CardSummary`

Parses a card and returns a normalized summary including product, name, birthday, and sex. `product` currently mirrors `header.header`.

### `parseHeader(input, options?): CardHeader`

Lightweight parse of the header only.

### `isCard(input): boolean`

Returns whether the input is a character card.

### `scanPngIend(input): number`

Returns the byte offset immediately after the PNG IEND chunk.

### `transformCard(card, target, options?): Card`

Transforms a parsed card to another supported title format. Use `options.pngBytes` when the target format needs image data.

### `serializeCard(card, pngBytes): Uint8Array`

Serializes a transformed `Card` back into `PNG + payload` bytes.

### `convertCard(input, target): Uint8Array`

Runs `parseCard -> transformCard -> serializeCard` in one step.

### `ConvertTarget`

```ts
type ConvertTarget = 'KK' | 'KKS' | 'EC' | 'HC' | 'SV' | 'AC';
```

Low-level helpers such as `BinaryReader`, `decodeMsgpack`, and block decoders are also exported.

### Options

```ts
type ParseOptions = {
  containsPng?: boolean;  // default: true  - whether the input contains a PNG image
  strict?: boolean;       // default: false - throw on unknown headers or corrupted blocks
  decodeBlocks?: boolean; // default: true  - decode blocks via MessagePack
};
```

## Supported Games

| Game | Header |
|------|--------|
| Koikatu | `【KoiKatuChara】` |
| Koikatu Sunshine | `【KoiKatuCharaSun】` |
| EmotionCreators | `【EroMakeChara】` |
| Honeycome | `【HCChara】` |
| Honeycome Party | `【HCPChara】` |
| DigitalCraft | `【DCChara】` |
| SummerVacation | `【SVChara】` |
| Aicomi | `【ACChara】` |

`【KoiKatuCharaSP】` is also accepted as a Koikatu-compatible header.

## Types

```ts
type ParseError = {
  code: string;
  message: string;
  at?: string;
};

type MsgpackHint =
  | { kind: 'number'; format: 'int' | 'float' }
  | { kind: 'array'; items: MsgpackHint[] }
  | {
      kind: 'map';
      entries: {
        keyId: string;
        keyType: 'string' | 'int' | 'float' | 'boolean' | 'nil';
        valueHint: MsgpackHint;
      }[];
    }
  | { kind: 'scalar' };

type Card = {
  header: CardHeader;
  blocks: Record<string, any>;
  blockIndex: BlockInfo[];
  rawBlockBytes?: Record<string, Uint8Array>;
  blockHints?: Record<string, MsgpackHint>;
  errors?: ParseError[];
  unsupportedHeader?: boolean;
};

type CardSummary = {
  header: CardHeader;
  product: string;
  name?: string;
  birthday?: { month?: number; day?: number };
  sex?: number;
  hasKKEx?: boolean;
  blocks: string[];
};

type CardHeader = {
  productNo: number;
  header: string;
  version: string;
  faceImage?: Uint8Array;
  language?: number;
  userid?: string;
  dataid?: string;
  packages?: number[];
};

type BlockInfo = {
  name: string;
  version: string;
  pos: number;
  size: number;
};
```

## Development

```bash
make install  # Install dependencies
make build    # Build with tsup
make test     # Run tests
make check    # Run lint + build + test
make clean    # Remove dist/
```

## License

MIT
