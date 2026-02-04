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
console.log(summary.product);  // "koikatu"
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

Parses a card and returns a normalized summary including product, name, birthday, and sex.

### `parseHeader(input, options?): CardHeader`

Lightweight parse of the header only.

### `isCard(input): boolean`

Returns whether the input is a character card.

### `scanPngIend(input): number`

Returns the byte offset immediately after the PNG IEND chunk.

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
| EmotionCreators | `【Emocre】` |
| Honeycome | `【HCChara】` |
| Honeycome Party | `【HCPChara】` |
| DigitalCraft | `【DCChara】` |
| SummerVacation | `【SVChara】` |
| Aicomi | `【ACChara】` |

## Types

```ts
type Card = {
  header: CardHeader;
  blocks: Record<string, any>;
  blockIndex: BlockInfo[];
  rawBlockBytes?: Record<string, Uint8Array>;
  errors?: ParseError[];
  unsupportedHeader?: boolean;
};

type CardSummary = {
  header: CardHeader;
  product: 'koikatu' | 'honeycome' | 'unknown';
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
make check    # Build + test
make clean    # Remove dist/
```

## License

MIT
