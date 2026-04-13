import { BinaryWriter } from '../convert/writer.js';
import { decodeMsgpack, encodeMsgpack } from '../parse/msgpack.js';
import { BinaryReader } from '../parse/reader.js';
import { scanPngIend } from '../parse/scanPng.js';
import type {
  KkScene,
  SceneCameraData,
  SceneColor,
  SceneParseOptions,
} from '../types.js';
import {
  compareVersions,
  readJsonLengthPrefixed,
  readVector3,
  required,
  writeJsonLengthPrefixed,
  writeVector3,
} from './common.js';
import { readKkSceneObject, writeKkSceneObject } from './kk-objects.js';

function defaultColor(r = 1, g = 1, b = 1, a = 1): SceneColor {
  return { r, g, b, a };
}

function readLightInfoBase(
  reader: BinaryReader,
  label: string,
): Record<string, any> {
  return {
    color: JSON.parse(
      required(reader.read7BitEncodedString(), `Failed to read ${label}.color`),
    ),
    intensity: required(
      reader.readFloat32LE(),
      `Failed to read ${label}.intensity`,
    ),
    rot: [
      required(reader.readFloat32LE(), `Failed to read ${label}.rot[0]`),
      required(reader.readFloat32LE(), `Failed to read ${label}.rot[1]`),
    ],
    shadow:
      required(reader.readUint8(), `Failed to read ${label}.shadow`) !== 0,
  };
}

function writeLightInfoBase(
  writer: BinaryWriter,
  value: Record<string, any>,
): void {
  writer.write7BitEncodedString(JSON.stringify(value.color ?? defaultColor()));
  writer.writeFloat32LE(value.intensity ?? 0);
  writer.writeFloat32LE(value.rot?.[0] ?? 0);
  writer.writeFloat32LE(value.rot?.[1] ?? 0);
  writer.writeUint8(value.shadow ? 1 : 0);
}

function readChangeAmount(reader: BinaryReader): KkScene['caMap'] {
  return {
    pos: readVector3(reader, 'scene.caMap.pos'),
    rot: readVector3(reader, 'scene.caMap.rot'),
    scale: readVector3(reader, 'scene.caMap.scale'),
  };
}

function writeChangeAmount(
  writer: BinaryWriter,
  value: KkScene['caMap'],
): void {
  writeVector3(writer, value.pos);
  writeVector3(writer, value.rot);
  writeVector3(writer, value.scale);
}

function readCameraData(reader: BinaryReader, label: string): SceneCameraData {
  const version = required(
    reader.readInt32LE(),
    `Failed to read ${label}.version`,
  );
  const position = readVector3(reader, `${label}.position`);
  const rotation = readVector3(reader, `${label}.rotation`);

  let deprecated_distance: number | undefined;
  let distance: SceneCameraData['distance'];
  if (version === 1) {
    deprecated_distance = required(
      reader.readFloat32LE(),
      `Failed to read ${label}.deprecated_distance`,
    );
    distance = { x: 0, y: 0, z: 0 };
  } else {
    distance = readVector3(reader, `${label}.distance`);
  }

  return {
    version,
    position,
    rotation,
    distance,
    fieldOfView: required(
      reader.readFloat32LE(),
      `Failed to read ${label}.fieldOfView`,
    ),
    ...(deprecated_distance !== undefined ? { deprecated_distance } : {}),
  };
}

function writeCameraData(writer: BinaryWriter, camera: SceneCameraData): void {
  const version =
    camera.version ?? (camera.deprecated_distance !== undefined ? 1 : 2);
  writer.writeInt32LE(version);
  writeVector3(writer, camera.position);
  writeVector3(writer, camera.rotation);
  if (version === 1) {
    writer.writeFloat32LE(camera.deprecated_distance ?? 0);
  } else {
    writeVector3(writer, camera.distance);
  }
  writer.writeFloat32LE(camera.fieldOfView);
}

function readBgmCtrl(reader: BinaryReader, label: string): Record<string, any> {
  return {
    repeat: required(reader.readInt32LE(), `Failed to read ${label}.repeat`),
    no: required(reader.readInt32LE(), `Failed to read ${label}.no`),
    play: required(reader.readUint8(), `Failed to read ${label}.play`) !== 0,
  };
}

function writeBgmCtrl(writer: BinaryWriter, value: Record<string, any>): void {
  writer.writeInt32LE(value.repeat ?? 0);
  writer.writeInt32LE(value.no ?? 0);
  writer.writeUint8(value.play ? 1 : 0);
}

function readOutsideSoundCtrl(reader: BinaryReader): Record<string, any> {
  return {
    repeat: required(
      reader.readInt32LE(),
      'Failed to read scene.outsideSoundCtrl.repeat',
    ),
    fileName: required(
      reader.read7BitEncodedString(),
      'Failed to read scene.outsideSoundCtrl.fileName',
    ),
    play:
      required(
        reader.readUint8(),
        'Failed to read scene.outsideSoundCtrl.play',
      ) !== 0,
  };
}

function writeOutsideSoundCtrl(
  writer: BinaryWriter,
  value: Record<string, any>,
): void {
  writer.writeInt32LE(value.repeat ?? 0);
  writer.write7BitEncodedString(value.fileName ?? '');
  writer.writeUint8(value.play ? 1 : 0);
}

export function parseKkScene(
  input: Uint8Array | ArrayBuffer,
  options?: SceneParseOptions,
): KkScene {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  let image: Uint8Array | undefined;
  let payload = data;

  if (options?.containsPng !== false) {
    const pngEnd = scanPngIend(data);
    image = data.subarray(0, pngEnd);
    payload = data.subarray(pngEnd);
  }

  const reader = new BinaryReader(payload, options?.strict ?? false);
  const version = required(
    reader.read7BitEncodedString(),
    'Failed to read scene.version',
  );
  const decodeEmbeddedCards = options?.decodeEmbeddedCards ?? true;
  const preserveRaw = options?.preserveRaw ?? false;

  const scene: KkScene = {
    ...(image ? { image } : {}),
    version,
    dataVersion: version,
    objects: {},
    objectOrder: [],
    map: 0,
    caMap: {
      pos: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    sunLightType: 0,
    mapOption: true,
    aceNo: 0,
    aceBlend: 0,
    enableAOE: true,
    aoeColor: defaultColor(180 / 255, 180 / 255, 180 / 255, 1),
    aoeRadius: 0.1,
    enableBloom: true,
    bloomIntensity: 0.4,
    bloomBlur: 0.8,
    bloomThreshold: 0.6,
    enableDepth: false,
    depthFocalSize: 0.95,
    depthAperture: 0.6,
    enableVignette: true,
    enableFog: false,
    fogColor: defaultColor(137 / 255, 193 / 255, 221 / 255, 1),
    fogHeight: 1,
    fogStartDistance: 0,
    enableSunShafts: false,
    sunThresholdColor: defaultColor(128 / 255, 128 / 255, 128 / 255, 1),
    sunColor: defaultColor(),
    sunCaster: -1,
    enableShadow: true,
    faceNormal: false,
    faceShadow: false,
    lineColorG: 0,
    ambientShadow: defaultColor(128 / 255, 128 / 255, 128 / 255, 1),
    lineWidthG: 0,
    rampG: 0,
    ambientShadowG: 0,
    shaderType: 0,
    skyInfo: { Enable: false, Pattern: 0 },
    cameraSaveData: {
      version: 2,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      distance: { x: 0, y: 0, z: 0 },
      fieldOfView: 23,
    },
    cameraData: [],
    charaLight: {},
    mapLight: {},
    bgmCtrl: { play: false, repeat: 0, no: 0 },
    envCtrl: { play: false, repeat: 0, no: 0 },
    outsideSoundCtrl: { play: false, repeat: 0, fileName: '' },
    background: '',
    frame: '',
    tail: '',
  };

  const objectCount = required(
    reader.readInt32LE(),
    'Failed to read scene.objects count',
  );
  for (let index = 0; index < objectCount; index += 1) {
    const key = required(
      reader.readInt32LE(),
      `Failed to read scene.object key ${index}`,
    );
    const type = required(
      reader.readInt32LE(),
      `Failed to read scene.object type ${index}`,
    );
    scene.objectOrder?.push(key);
    scene.objects[key] = readKkSceneObject(
      reader,
      type,
      version,
      decodeEmbeddedCards,
      preserveRaw,
    );
  }
  const tailStart = reader.offset;

  scene.map = required(reader.readInt32LE(), 'Failed to read scene.map');
  scene.caMap = readChangeAmount(reader);
  scene.sunLightType = required(
    reader.readInt32LE(),
    'Failed to read scene.sunLightType',
  );
  scene.mapOption =
    required(reader.readUint8(), 'Failed to read scene.mapOption') !== 0;
  scene.aceNo = required(reader.readInt32LE(), 'Failed to read scene.aceNo');

  if (compareVersions(version, '0.0.2') >= 0) {
    scene.aceBlend = required(
      reader.readFloat32LE(),
      'Failed to read scene.aceBlend',
    );
  }

  if (compareVersions(version, '0.0.1') <= 0) {
    scene.deprecatedV001Bool =
      required(
        reader.readUint8(),
        'Failed to read scene.deprecatedV001Bool',
      ) !== 0;
    scene.deprecatedV001Float = required(
      reader.readFloat32LE(),
      'Failed to read scene.deprecatedV001Float',
    );
    scene.deprecatedV001String = required(
      reader.readLengthPrefixedString('b'),
      'Failed to read scene.deprecatedV001String',
    );
  }

  if (compareVersions(version, '0.0.2') >= 0) {
    scene.enableAOE =
      required(reader.readUint8(), 'Failed to read scene.enableAOE') !== 0;
    scene.aoeColor = readJsonLengthPrefixed<SceneColor>(
      reader,
      'b',
      'scene.aoeColor',
    );
    scene.aoeRadius = required(
      reader.readFloat32LE(),
      'Failed to read scene.aoeRadius',
    );
  }

  scene.enableBloom =
    required(reader.readUint8(), 'Failed to read scene.enableBloom') !== 0;
  scene.bloomIntensity = required(
    reader.readFloat32LE(),
    'Failed to read scene.bloomIntensity',
  );
  scene.bloomBlur = required(
    reader.readFloat32LE(),
    'Failed to read scene.bloomBlur',
  );

  if (compareVersions(version, '0.0.2') >= 0) {
    scene.bloomThreshold = required(
      reader.readFloat32LE(),
      'Failed to read scene.bloomThreshold',
    );
  }

  if (compareVersions(version, '0.0.1') <= 0) {
    scene.deprecatedV001Bool2 =
      required(
        reader.readUint8(),
        'Failed to read scene.deprecatedV001Bool2',
      ) !== 0;
  }

  scene.enableDepth =
    required(reader.readUint8(), 'Failed to read scene.enableDepth') !== 0;
  scene.depthFocalSize = required(
    reader.readFloat32LE(),
    'Failed to read scene.depthFocalSize',
  );
  scene.depthAperture = required(
    reader.readFloat32LE(),
    'Failed to read scene.depthAperture',
  );
  scene.enableVignette =
    required(reader.readUint8(), 'Failed to read scene.enableVignette') !== 0;

  if (compareVersions(version, '0.0.1') <= 0) {
    scene.deprecatedV001Float2 = required(
      reader.readFloat32LE(),
      'Failed to read scene.deprecatedV001Float2',
    );
  }

  scene.enableFog =
    required(reader.readUint8(), 'Failed to read scene.enableFog') !== 0;
  if (compareVersions(version, '0.0.2') >= 0) {
    scene.fogColor = readJsonLengthPrefixed<SceneColor>(
      reader,
      'b',
      'scene.fogColor',
    );
    scene.fogHeight = required(
      reader.readFloat32LE(),
      'Failed to read scene.fogHeight',
    );
    scene.fogStartDistance = required(
      reader.readFloat32LE(),
      'Failed to read scene.fogStartDistance',
    );
  }

  scene.enableSunShafts =
    required(reader.readUint8(), 'Failed to read scene.enableSunShafts') !== 0;
  if (compareVersions(version, '0.0.2') >= 0) {
    scene.sunThresholdColor = readJsonLengthPrefixed<SceneColor>(
      reader,
      'b',
      'scene.sunThresholdColor',
    );
    scene.sunColor = readJsonLengthPrefixed<SceneColor>(
      reader,
      'b',
      'scene.sunColor',
    );
  }

  if (compareVersions(version, '0.0.4') >= 0) {
    scene.sunCaster = required(
      reader.readInt32LE(),
      'Failed to read scene.sunCaster',
    );
    scene.enableShadow =
      required(reader.readUint8(), 'Failed to read scene.enableShadow') !== 0;
    scene.faceNormal =
      required(reader.readUint8(), 'Failed to read scene.faceNormal') !== 0;
    scene.faceShadow =
      required(reader.readUint8(), 'Failed to read scene.faceShadow') !== 0;
    scene.lineColorG = required(
      reader.readFloat32LE(),
      'Failed to read scene.lineColorG',
    );
    scene.ambientShadow = readJsonLengthPrefixed<SceneColor>(
      reader,
      'b',
      'scene.ambientShadow',
    );
  }

  if (compareVersions(version, '0.0.5') >= 0) {
    scene.lineWidthG = required(
      reader.readFloat32LE(),
      'Failed to read scene.lineWidthG',
    );
    scene.rampG = required(reader.readInt32LE(), 'Failed to read scene.rampG');
    scene.ambientShadowG = required(
      reader.readFloat32LE(),
      'Failed to read scene.ambientShadowG',
    );
  }

  if (compareVersions(version, '1.1.0.0') >= 0) {
    scene.shaderType = required(
      reader.readInt32LE(),
      'Failed to read scene.shaderType',
    );
  }

  if (compareVersions(version, '1.1.2.0') >= 0) {
    const skyInfoRaw = required(
      reader.readLengthPrefixed('i'),
      'Failed to read scene.skyInfoRaw',
    );
    scene.skyInfoRaw = skyInfoRaw;
    scene.skyInfo = decodeMsgpack(skyInfoRaw);
  }

  scene.cameraSaveData = readCameraData(reader, 'scene.cameraSaveData');
  scene.cameraData = [];
  for (let index = 0; index < 10; index += 1) {
    scene.cameraData.push(readCameraData(reader, `scene.cameraData[${index}]`));
  }

  scene.charaLight = readLightInfoBase(reader, 'scene.charaLight');
  scene.mapLight = readLightInfoBase(reader, 'scene.mapLight');
  scene.mapLight.type = required(
    reader.readInt32LE(),
    'Failed to read scene.mapLight.type',
  );

  scene.bgmCtrl = readBgmCtrl(reader, 'scene.bgmCtrl');
  scene.envCtrl = readBgmCtrl(reader, 'scene.envCtrl');
  scene.outsideSoundCtrl = readOutsideSoundCtrl(reader);
  scene.background = required(
    reader.readLengthPrefixedString('b'),
    'Failed to read scene.background',
  );
  scene.frame = required(
    reader.readLengthPrefixedString('b'),
    'Failed to read scene.frame',
  );
  scene.tail = required(
    reader.readLengthPrefixedString('b'),
    'Failed to read scene.tail',
  );

  if (reader.remaining > 0) {
    scene.modHeader = required(
      reader.readLengthPrefixedString('b'),
      'Failed to read scene.modHeader',
    );
    scene.modUnknown = required(
      reader.readInt32LE(),
      'Failed to read scene.modUnknown',
    );
    const modDataRaw = required(
      reader.readLengthPrefixed('i'),
      'Failed to read scene.modDataRaw',
    );
    scene.modDataRaw = modDataRaw;
    scene.modData = decodeMsgpack(modDataRaw);
    if (reader.remaining > 0) {
      scene.modTail = required(
        reader.readBytes(reader.remaining),
        'Failed to read scene.modTail',
      );
    }
  }

  if (preserveRaw) {
    scene.tailRaw = payload.subarray(tailStart);
  }

  return scene;
}

export function serializeKkScene(scene: KkScene): Uint8Array {
  const writer = new BinaryWriter();

  if (scene.image) {
    writer.writeBytes(scene.image);
  }

  writer.write7BitEncodedString(scene.version);

  const objectKeys =
    scene.objectOrder ?? Object.keys(scene.objects).map((key) => Number(key));
  writer.writeInt32LE(objectKeys.length);
  for (const key of objectKeys) {
    const object = scene.objects[key];
    if (!object) continue;
    writer.writeInt32LE(key);
    writer.writeInt32LE(object.type);
    writeKkSceneObject(writer, object, scene.version);
  }

  if (scene.tailRaw) {
    writer.writeBytes(scene.tailRaw);
    return writer.toUint8Array();
  }

  writer.writeInt32LE(scene.map);
  writeChangeAmount(writer, scene.caMap);
  writer.writeInt32LE(scene.sunLightType);
  writer.writeUint8(scene.mapOption ? 1 : 0);
  writer.writeInt32LE(scene.aceNo);

  if (compareVersions(scene.version, '0.0.2') >= 0) {
    writer.writeFloat32LE(scene.aceBlend);
  }

  if (compareVersions(scene.version, '0.0.1') <= 0) {
    writer.writeUint8(scene.deprecatedV001Bool ? 1 : 0);
    writer.writeFloat32LE(scene.deprecatedV001Float ?? 0);
    writer.writeLengthPrefixedString(scene.deprecatedV001String ?? '', 'b');
  }

  if (compareVersions(scene.version, '0.0.2') >= 0) {
    writer.writeUint8(scene.enableAOE ? 1 : 0);
    writeJsonLengthPrefixed(writer, scene.aoeColor, 'b');
    writer.writeFloat32LE(scene.aoeRadius);
  }

  writer.writeUint8(scene.enableBloom ? 1 : 0);
  writer.writeFloat32LE(scene.bloomIntensity);
  writer.writeFloat32LE(scene.bloomBlur);
  if (compareVersions(scene.version, '0.0.2') >= 0) {
    writer.writeFloat32LE(scene.bloomThreshold);
  }

  if (compareVersions(scene.version, '0.0.1') <= 0) {
    writer.writeUint8(scene.deprecatedV001Bool2 ? 1 : 0);
  }

  writer.writeUint8(scene.enableDepth ? 1 : 0);
  writer.writeFloat32LE(scene.depthFocalSize);
  writer.writeFloat32LE(scene.depthAperture);
  writer.writeUint8(scene.enableVignette ? 1 : 0);

  if (compareVersions(scene.version, '0.0.1') <= 0) {
    writer.writeFloat32LE(scene.deprecatedV001Float2 ?? 0);
  }

  writer.writeUint8(scene.enableFog ? 1 : 0);
  if (compareVersions(scene.version, '0.0.2') >= 0) {
    writeJsonLengthPrefixed(writer, scene.fogColor, 'b');
    writer.writeFloat32LE(scene.fogHeight);
    writer.writeFloat32LE(scene.fogStartDistance);
  }

  writer.writeUint8(scene.enableSunShafts ? 1 : 0);
  if (compareVersions(scene.version, '0.0.2') >= 0) {
    writeJsonLengthPrefixed(writer, scene.sunThresholdColor, 'b');
    writeJsonLengthPrefixed(writer, scene.sunColor, 'b');
  }

  if (compareVersions(scene.version, '0.0.4') >= 0) {
    writer.writeInt32LE(scene.sunCaster);
    writer.writeUint8(scene.enableShadow ? 1 : 0);
    writer.writeUint8(scene.faceNormal ? 1 : 0);
    writer.writeUint8(scene.faceShadow ? 1 : 0);
    writer.writeFloat32LE(scene.lineColorG);
    writeJsonLengthPrefixed(writer, scene.ambientShadow, 'b');
  }

  if (compareVersions(scene.version, '0.0.5') >= 0) {
    writer.writeFloat32LE(scene.lineWidthG);
    writer.writeInt32LE(scene.rampG);
    writer.writeFloat32LE(scene.ambientShadowG);
  }

  if (compareVersions(scene.version, '1.1.0.0') >= 0) {
    writer.writeInt32LE(scene.shaderType);
  }

  if (compareVersions(scene.version, '1.1.2.0') >= 0) {
    const skyInfoRaw = encodeMsgpack(scene.skyInfo);
    writer.writeInt32LE(skyInfoRaw.length);
    writer.writeBytes(skyInfoRaw);
  }

  writeCameraData(writer, scene.cameraSaveData);
  for (const camera of scene.cameraData) {
    writeCameraData(writer, camera);
  }

  writeLightInfoBase(writer, scene.charaLight);
  writeLightInfoBase(writer, scene.mapLight);
  writer.writeInt32LE(scene.mapLight.type ?? 0);
  writeBgmCtrl(writer, scene.bgmCtrl);
  writeBgmCtrl(writer, scene.envCtrl);
  writeOutsideSoundCtrl(writer, scene.outsideSoundCtrl);
  writer.writeLengthPrefixedString(scene.background, 'b');
  writer.writeLengthPrefixedString(scene.frame, 'b');
  writer.writeLengthPrefixedString(scene.tail, 'b');

  if (scene.modHeader) {
    writer.writeLengthPrefixedString(scene.modHeader, 'b');
    writer.writeInt32LE(scene.modUnknown ?? 0);
    const modDataRaw = encodeMsgpack(scene.modData);
    writer.writeInt32LE(modDataRaw.length);
    writer.writeBytes(modDataRaw);
    if (scene.modTail) {
      writer.writeBytes(scene.modTail);
    }
  }

  return writer.toUint8Array();
}
