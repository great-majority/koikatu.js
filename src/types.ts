import type { MsgpackHint } from './parse/msgpack.js';

export type Input = ArrayBuffer | Uint8Array;

export type ParseOptions = {
  containsPng?: boolean;
  strict?: boolean;
  decodeBlocks?: boolean;
};

export type SceneParseOptions = {
  containsPng?: boolean;
  strict?: boolean;
  decodeEmbeddedCards?: boolean;
  preserveRaw?: boolean;
};

export type CardHeader = {
  productNo: number;
  header: string;
  version: string;
  faceImage?: Uint8Array;
  language?: number;
  userid?: string;
  dataid?: string;
  packages?: number[];
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
  blockHints?: Record<string, MsgpackHint>;
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

export type SceneVector3 = {
  x: number;
  y: number;
  z: number;
};

export type SceneColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type SceneObject = {
  type: number;
  data: Record<string, any>;
  rawBytes?: Uint8Array;
};

export type Scene = KkScene | HcScene;

export type SceneWalkKey = number | readonly [number, number];

export type SceneWalkEntry = {
  key: SceneWalkKey;
  object: SceneObject;
  depth: number;
};

export type SceneWalkOptions = {
  objectType?: number;
};

export type SceneObjectTypeNameMap = Record<number, string>;

export type SceneCameraData = {
  version?: number;
  position: SceneVector3;
  rotation: SceneVector3;
  distance: SceneVector3;
  fieldOfView: number;
  deprecated_distance?: number;
};

export type KkScene = {
  image?: Uint8Array;
  version: string;
  dataVersion: string;
  objects: Record<number, SceneObject>;
  objectOrder?: number[];
  map: number;
  caMap: {
    pos: SceneVector3;
    rot: SceneVector3;
    scale: SceneVector3;
  };
  sunLightType: number;
  mapOption: boolean;
  aceNo: number;
  aceBlend: number;
  deprecatedV001Bool?: boolean;
  deprecatedV001Float?: number;
  deprecatedV001String?: string;
  enableAOE: boolean;
  aoeColor: SceneColor;
  aoeRadius: number;
  enableBloom: boolean;
  bloomIntensity: number;
  bloomBlur: number;
  bloomThreshold: number;
  deprecatedV001Bool2?: boolean;
  enableDepth: boolean;
  depthFocalSize: number;
  depthAperture: number;
  enableVignette: boolean;
  deprecatedV001Float2?: number;
  enableFog: boolean;
  fogColor: SceneColor;
  fogHeight: number;
  fogStartDistance: number;
  enableSunShafts: boolean;
  sunThresholdColor: SceneColor;
  sunColor: SceneColor;
  sunCaster: number;
  enableShadow: boolean;
  faceNormal: boolean;
  faceShadow: boolean;
  lineColorG: number;
  ambientShadow: SceneColor;
  lineWidthG: number;
  rampG: number;
  ambientShadowG: number;
  shaderType: number;
  skyInfo: any;
  skyInfoRaw?: Uint8Array;
  cameraSaveData: SceneCameraData;
  cameraData: SceneCameraData[];
  charaLight: Record<string, any>;
  mapLight: Record<string, any>;
  bgmCtrl: Record<string, any>;
  envCtrl: Record<string, any>;
  outsideSoundCtrl: Record<string, any>;
  background: string;
  frame: string;
  tail: string;
  modHeader?: string;
  modUnknown?: number;
  modData?: any;
  modDataRaw?: Uint8Array;
  modTail?: Uint8Array;
  tailRaw?: Uint8Array;
};

export type HcScene = {
  image?: Uint8Array;
  version: string;
  dataVersion: string;
  userId: string;
  dataId: string;
  title: string;
  unknown1: number;
  unknown2: Uint8Array;
  objects: Record<number, SceneObject>;
  objectOrder?: number[];
  unknownTails: Uint8Array[];
  frameFilename: string;
  unknownTail11: Uint8Array;
  footerMarker: string;
  unknownTailExtra?: Uint8Array;
};
