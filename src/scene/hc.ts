import { BinaryWriter } from '../convert/writer.js';
import { BinaryReader } from '../parse/reader.js';
import { scanPngIend } from '../parse/scanPng.js';
import type { HcScene, SceneParseOptions } from '../types.js';
import { required } from './common.js';
import { readHcSceneObject, writeHcSceneObject } from './hc-objects.js';

export function parseHcScene(
  input: Uint8Array | ArrayBuffer,
  options?: SceneParseOptions,
): HcScene {
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

  const scene: HcScene = {
    ...(image ? { image } : {}),
    version,
    dataVersion: version,
    userId: required(
      reader.read7BitEncodedString(),
      'Failed to read scene.userId',
    ),
    dataId: required(
      reader.read7BitEncodedString(),
      'Failed to read scene.dataId',
    ),
    title: required(
      reader.read7BitEncodedString(),
      'Failed to read scene.title',
    ),
    unknown1: required(reader.readInt32LE(), 'Failed to read scene.unknown1'),
    unknown2: new Uint8Array(0),
    objects: {},
    objectOrder: [],
    unknownTails: [],
    frameFilename: '',
    unknownTail11: new Uint8Array(0),
    footerMarker: '',
  };

  const unknown2Length = required(
    reader.readInt32LE(),
    'Failed to read scene.unknown2 length',
  );
  scene.unknown2 = required(
    reader.readBytes(unknown2Length),
    'Failed to read scene.unknown2',
  );

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
    scene.objects[key] = readHcSceneObject(
      reader,
      type,
      version,
      decodeEmbeddedCards,
      preserveRaw,
    );
  }

  scene.unknownTails = [];
  for (let index = 0; index < 10; index += 1) {
    const length = required(
      reader.readInt32LE(),
      `Failed to read scene.unknownTails[${index}] length`,
    );
    scene.unknownTails.push(
      required(
        reader.readBytes(length),
        `Failed to read scene.unknownTails[${index}]`,
      ),
    );
  }

  scene.frameFilename = required(
    reader.read7BitEncodedString(),
    'Failed to read scene.frameFilename',
  );
  const unknownTail11Length = required(
    reader.readInt32LE(),
    'Failed to read scene.unknownTail11 length',
  );
  scene.unknownTail11 = required(
    reader.readBytes(unknownTail11Length),
    'Failed to read scene.unknownTail11',
  );
  scene.footerMarker = required(
    reader.read7BitEncodedString(),
    'Failed to read scene.footerMarker',
  );

  if (reader.remaining > 0) {
    scene.unknownTailExtra = required(
      reader.readBytes(reader.remaining),
      'Failed to read scene.unknownTailExtra',
    );
  }

  return scene;
}

export function serializeHcScene(scene: HcScene): Uint8Array {
  const writer = new BinaryWriter();

  if (scene.image) {
    writer.writeBytes(scene.image);
  }

  writer.write7BitEncodedString(scene.version);
  writer.write7BitEncodedString(scene.userId);
  writer.write7BitEncodedString(scene.dataId);
  writer.write7BitEncodedString(scene.title);
  writer.writeInt32LE(scene.unknown1);
  writer.writeInt32LE(scene.unknown2.length);
  writer.writeBytes(scene.unknown2);

  const objectKeys =
    scene.objectOrder ?? Object.keys(scene.objects).map((key) => Number(key));
  writer.writeInt32LE(objectKeys.length);
  for (const key of objectKeys) {
    const object = scene.objects[key];
    if (!object) continue;
    writer.writeInt32LE(key);
    writer.writeInt32LE(object.type);
    writeHcSceneObject(writer, object, scene.version);
  }

  for (let index = 0; index < 10; index += 1) {
    const block = scene.unknownTails[index] ?? new Uint8Array(0);
    writer.writeInt32LE(block.length);
    writer.writeBytes(block);
  }

  writer.write7BitEncodedString(scene.frameFilename);
  writer.writeInt32LE(scene.unknownTail11.length);
  writer.writeBytes(scene.unknownTail11);
  writer.write7BitEncodedString(scene.footerMarker);
  if (scene.unknownTailExtra) {
    writer.writeBytes(scene.unknownTailExtra);
  }

  return writer.toUint8Array();
}
