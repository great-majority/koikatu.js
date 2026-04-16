# koikatu.js

[![npm version](https://img.shields.io/npm/v/koikatu.js)](https://www.npmjs.com/package/koikatu.js)

Parser library for Koikatu / Honeycome character cards and scene data. Extracts data from the binary payload appended after the PNG IEND chunk.

Works in both browser and Node.js. ESM / CJS / IIFE output.

[日本語版 README](./README.ja.md)

## Install

### npm

```bash
npm install koikatu.js
```

### CDN / script tag

```html
<script src="https://cdn.jsdelivr.net/npm/koikatu.js/dist/index.global.min.js"></script>
<script>
  const { parseCardSummary } = KoikatuJS;
</script>
```

The global variable name is `KoikatuJS`.

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

### Scene data

```ts
import {
  parseHcScene,
  parseKkScene,
  serializeHcScene,
  serializeKkScene,
} from 'koikatu.js';

const kkScene = parseKkScene(await fetch('scene.png').then(r => r.arrayBuffer()));
console.log(kkScene.version);
console.log(Object.keys(kkScene.objects).length);

const hcScene = parseHcScene(await fetch('hc_scene.png').then(r => r.arrayBuffer()));
console.log(hcScene.title);

const kkBytes = serializeKkScene(kkScene);
const hcBytes = serializeHcScene(hcScene);
```

### Card Conversion

Convert a character card from one supported title to another. Only conversions within the same series are supported (KK series: KK / KKS / EC; HC series: HC / SV / AC). Cross-series conversion (e.g. KK → HC) is not supported.

**One-shot** — `convertCard` parses, converts, and serializes in a single call:

```ts
import { convertCard } from 'koikatu.js';

const buf = await fetch('kk_card.png').then(r => r.arrayBuffer());

// Convert a Koikatu card to Koikatu Sunshine
const kksBytes = convertCard(buf, 'KKS');

// Convert a Honeycome card to Summer Vacation
const svBytes = convertCard(buf, 'SV');
```

**Step-by-step** — use `transformCard` + `serializeCard` when you need to inspect or modify the card between conversion and serialization:

```ts
import { parseCard, transformCard, serializeCard, scanPngIend } from 'koikatu.js';

const buf = new Uint8Array(await fetch('kk_card.png').then(r => r.arrayBuffer()));
const card = parseCard(buf);

// Extract the original PNG image bytes (required by some target formats)
const pngBytes = buf.slice(0, scanPngIend(buf));

const converted = transformCard(card, 'EC', { pngBytes });
const result = serializeCard(converted, pngBytes);
```

`options.pngBytes` is required for conversions that embed the thumbnail image in the payload (EC → KK / KKS, HC ↔ SV, HC ↔ AC).

**Saving the result (Node.js)**

```ts
import { writeFile } from 'node:fs/promises';

const result = convertCard(buf, 'KKS');
await writeFile('converted.png', result);
```

**Downloading the result (browser)**

```ts
const result = convertCard(buf, 'KKS');
const blob = new Blob([result], { type: 'image/png' });
const url = URL.createObjectURL(blob);

const a = document.createElement('a');
a.href = url;
a.download = 'converted.png';
a.click();
URL.revokeObjectURL(url);
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

### `parseKkScene(input, options?): KkScene`

Parses Koikatu / Koikatu Sunshine scene data.

### `serializeKkScene(scene): Uint8Array`

Serializes a `KkScene` back into `PNG + payload`.

### `parseHcScene(input, options?): HcScene`

Parses Honeycome / SummerVacation / Aicomi scene data. Encrypted or unknown HC tail blocks are preserved as raw bytes.

### `serializeHcScene(scene): Uint8Array`

Serializes an `HcScene` back into `PNG + payload`.

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

type SceneParseOptions = {
  containsPng?: boolean;         // default: true
  strict?: boolean;              // default: false
  decodeEmbeddedCards?: boolean; // default: true
  preserveRaw?: boolean;         // default: false - keep original scene bytes for exact round-trip
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

`make build` emits both `dist/index.global.js` and `dist/index.global.min.js` for CDN / classic `<script>` usage.

## License

MIT
