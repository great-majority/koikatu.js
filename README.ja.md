# koikatu.js

[![npm version](https://img.shields.io/npm/v/koikatu.js)](https://www.npmjs.com/package/koikatu.js)

Koikatu / Honeycome のキャラクターカードとシーンデータのパーサーライブラリ。PNG 末尾に付加されたバイナリペイロードを解析し、JavaScript オブジェクトとして取得できる。

ブラウザ・Node.js 両対応。ESM / CJS / IIFE を出力する。

## Install

### npm

```bash
npm install koikatu.js
```

### CDN / script タグ

```html
<script src="https://cdn.jsdelivr.net/npm/koikatu.js/dist/index.global.min.js"></script>
<script>
  const { parseCardSummary } = KoikatuJS;
</script>
```

グローバル変数名は `KoikatuJS`。

## Usage

```ts
import { parseCard, parseCardSummary, isCard } from 'koikatu.js';

// ファイルがキャラクターカードか判定
const buf = await fetch('card.png').then(r => r.arrayBuffer());
if (isCard(buf)) {
  console.log('Character card detected');
}

// カード全体をパース
const card = parseCard(buf);
console.log(card.header.header);       // "【KoiKatuChara】"
console.log(card.blockIndex);          // [{ name: "Custom", ... }, ...]
console.log(card.blocks['Parameter']); // { lastname: "白峰", firstname: "一乃", ... }

// サマリーのみ取得
const summary = parseCardSummary(buf);
console.log(summary.product);  // "【KoiKatuChara】"
console.log(summary.name);     // "白峰 一乃"
console.log(summary.birthday); // { month: 5, day: 12 }
```

### シーンデータ

```ts
import {
  parseHcScene,
  parseKkScene,
  serializeHcScene,
  serializeKkScene,
} from 'koikatu.js';

const kkScene = parseKkScene(await fetch('scene.png').then((r) => r.arrayBuffer()));
console.log(kkScene.version);
console.log(Object.keys(kkScene.objects).length);

const hcScene = parseHcScene(await fetch('hc_scene.png').then((r) => r.arrayBuffer()));
console.log(hcScene.title);

const kkBytes = serializeKkScene(kkScene);
const hcBytes = serializeHcScene(hcScene);
```

### PNG を含まないペイロードの場合

```ts
const card = parseCard(rawPayload, { containsPng: false });
```

## API

### `parseCard(input, options?): Card`

カードをフルパースし、ヘッダー・全ブロック・ブロックインデックスを返す。

### `parseCardSummary(input, options?): CardSummary`

カードをパースし、product / name / birthday / sex 等の正規化されたサマリーを返す。`product` は現在 `header.header` をそのまま返す。

### `parseHeader(input, options?): CardHeader`

ヘッダー部分のみを軽量にパースする。

### `isCard(input): boolean`

入力がキャラクターカードかどうかを判定する。

### `scanPngIend(input): number`

PNG の IEND チャンク末尾のオフセットを返す。

### `transformCard(card, target, options?): Card`

パース済みのカードを別タイトル形式に変換する。画像データが必要な変換では `options.pngBytes` を使う。

### `serializeCard(card, pngBytes): Uint8Array`

変換済み `Card` を `PNG + payload` バイト列へ戻す。

### `convertCard(input, target): Uint8Array`

`parseCard -> transformCard -> serializeCard` を一括実行する。

### `parseKkScene(input, options?): KkScene`

Koikatu / Koikatu Sunshine 系のシーンデータをパースする。

### `serializeKkScene(scene): Uint8Array`

`KkScene` を `PNG + payload` のバイト列に戻す。

### `parseHcScene(input, options?): HcScene`

Honeycome / SummerVacation / Aicomi 系のシーンデータをパースする。暗号化済みの未知 tail 領域は raw bytes のまま保持する。

### `serializeHcScene(scene): Uint8Array`

`HcScene` を `PNG + payload` のバイト列に戻す。

### `ConvertTarget`

```ts
type ConvertTarget = 'KK' | 'KKS' | 'EC' | 'HC' | 'SV' | 'AC';
```

低レベル API として `BinaryReader`、`decodeMsgpack`、各種ブロックデコーダーも export している。

### Options

```ts
type ParseOptions = {
  containsPng?: boolean;  // default: true - 入力に PNG が含まれるか
  strict?: boolean;       // default: false - 不明ヘッダーや壊れたブロックでエラーを投げるか
  decodeBlocks?: boolean; // default: true - ブロックを MessagePack デコードするか
};

type SceneParseOptions = {
  containsPng?: boolean;       // default: true
  strict?: boolean;            // default: false
  decodeEmbeddedCards?: boolean; // default: true
  preserveRaw?: boolean;       // default: false - exact round-trip 用に元バイト列を保持する
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

`【KoiKatuCharaSP】` も Koikatu 互換ヘッダーとして受け付けます。

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
make install  # 依存関係インストール
make build    # ビルド
make test     # テスト実行
make check    # lint + build + test
make clean    # dist/ を削除
```

`make build` で CDN / 通常の `<script>` 向けに `dist/index.global.js` と `dist/index.global.min.js` を出力する。

## License

MIT
