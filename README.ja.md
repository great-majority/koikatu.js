# koikatu.js

[![npm version](https://img.shields.io/npm/v/koikatu.js)](https://www.npmjs.com/package/koikatu.js)

Koikatu / Honeycome キャラクターカードのパーサーライブラリ。PNG 末尾に付加されたバイナリペイロードを解析し、キャラクターデータを JavaScript オブジェクトとして取得できる。

ブラウザ・Node.js 両対応。ESM / CJS デュアルフォーマット。

## Install

```bash
npm install koikatu.js
```

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
console.log(summary.product);  // "koikatu"
console.log(summary.name);     // "白峰 一乃"
console.log(summary.birthday); // { month: 5, day: 12 }
```

### PNG を含まないペイロードの場合

```ts
const card = parseCard(rawPayload, { containsPng: false });
```

## API

### `parseCard(input, options?): Card`

カードをフルパースし、ヘッダー・全ブロック・ブロックインデックスを返す。

### `parseCardSummary(input, options?): CardSummary`

カードをパースし、product / name / birthday / sex 等の正規化されたサマリーを返す。

### `parseHeader(input, options?): CardHeader`

ヘッダー部分のみを軽量にパースする。

### `isCard(input): boolean`

入力がキャラクターカードかどうかを判定する。

### `scanPngIend(input): number`

PNG の IEND チャンク末尾のオフセットを返す。

### Options

```ts
type ParseOptions = {
  containsPng?: boolean;  // default: true - 入力に PNG が含まれるか
  strict?: boolean;       // default: false - 不明ヘッダーや壊れたブロックでエラーを投げるか
  decodeBlocks?: boolean; // default: true - ブロックを MessagePack デコードするか
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
make install  # 依存関係インストール
make build    # ビルド
make test     # テスト実行
make clean    # dist/ を削除
```

## License

MIT
