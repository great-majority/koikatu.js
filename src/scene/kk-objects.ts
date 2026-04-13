import type { BinaryWriter } from '../convert/writer.js';
import type { BinaryReader } from '../parse/reader.js';
import type { SceneObject } from '../types.js';
import {
  compareVersions,
  parseEmbeddedCard,
  readBoneInfo,
  readBoolArray,
  readChildObjects,
  readColorRgba,
  readJson7Bit,
  readObjectInfoBase,
  readVector3,
  required,
  serializeEmbeddedCard,
  writeBoneInfo,
  writeBoolArray,
  writeChildObjects,
  writeColorRgba,
  writeJson7Bit,
  writeObjectInfoBase,
  writeVector3,
} from './common.js';

function readPatternInfo(reader: BinaryReader): Record<string, any> {
  return {
    key: required(reader.readInt32LE(), 'Failed to read pattern.key'),
    file_path: required(
      reader.read7BitEncodedString(),
      'Failed to read pattern.file_path',
    ),
    clamp: required(reader.readUint8(), 'Failed to read pattern.clamp') !== 0,
    uv: readJson7Bit<Record<string, any>>(reader, 'pattern.uv'),
    rot: required(reader.readFloat32LE(), 'Failed to read pattern.rot'),
  };
}

function writePatternInfo(
  writer: BinaryWriter,
  pattern: Record<string, any>,
): void {
  writer.writeInt32LE(pattern.key ?? 0);
  writer.write7BitEncodedString(pattern.file_path ?? '');
  writer.writeUint8(pattern.clamp === false ? 0 : 1);
  writeJson7Bit(writer, pattern.uv ?? { x: 0, y: 0, z: 1, w: 1 });
  writer.writeFloat32LE(pattern.rot ?? 0);
}

function readRoutePointAidInfo(reader: BinaryReader): Record<string, any> {
  return {
    dicKey: required(
      reader.readInt32LE(),
      'Failed to read routePoint.aidInfo.dicKey',
    ),
    changeAmount: {
      position: readVector3(reader, 'routePoint.aidInfo.changeAmount.position'),
      rotation: readVector3(reader, 'routePoint.aidInfo.changeAmount.rotation'),
      scale: readVector3(reader, 'routePoint.aidInfo.changeAmount.scale'),
    },
    isInit:
      required(
        reader.readUint8(),
        'Failed to read routePoint.aidInfo.isInit',
      ) !== 0,
  };
}

function writeRoutePointAidInfo(
  writer: BinaryWriter,
  aidInfo: Record<string, any>,
): void {
  writer.writeInt32LE(aidInfo.dicKey ?? 0);
  writeVector3(writer, aidInfo.changeAmount?.position ?? { x: 0, y: 0, z: 0 });
  writeVector3(writer, aidInfo.changeAmount?.rotation ?? { x: 0, y: 0, z: 0 });
  writeVector3(writer, aidInfo.changeAmount?.scale ?? { x: 1, y: 1, z: 1 });
  writer.writeUint8(aidInfo.isInit ? 1 : 0);
}

function readRoutePointInfo(
  reader: BinaryReader,
  version: string,
): Record<string, any> {
  const routePoint: Record<string, any> = {
    dicKey: required(reader.readInt32LE(), 'Failed to read routePoint.dicKey'),
    changeAmount: {
      position: readVector3(reader, 'routePoint.changeAmount.position'),
      rotation: readVector3(reader, 'routePoint.changeAmount.rotation'),
      scale: readVector3(reader, 'routePoint.changeAmount.scale'),
    },
    speed: required(reader.readFloat32LE(), 'Failed to read routePoint.speed'),
    easeType: required(
      reader.readInt32LE(),
      'Failed to read routePoint.easeType',
    ),
  };

  if (compareVersions(version, '1.0.3') === 0) {
    required(reader.readUint8(), 'Failed to read routePoint.version103Padding');
  }

  if (compareVersions(version, '1.0.4.1') >= 0) {
    routePoint.connection = required(
      reader.readInt32LE(),
      'Failed to read routePoint.connection',
    );
    routePoint.aidInfo = readRoutePointAidInfo(reader);
  }

  if (compareVersions(version, '1.0.4.2') >= 0) {
    routePoint.link =
      required(reader.readUint8(), 'Failed to read routePoint.link') !== 0;
  }

  return routePoint;
}

function writeRoutePointInfo(
  writer: BinaryWriter,
  routePoint: Record<string, any>,
  version: string,
): void {
  writer.writeInt32LE(routePoint.dicKey ?? 0);
  writeVector3(
    writer,
    routePoint.changeAmount?.position ?? { x: 0, y: 0, z: 0 },
  );
  writeVector3(
    writer,
    routePoint.changeAmount?.rotation ?? { x: 0, y: 0, z: 0 },
  );
  writeVector3(writer, routePoint.changeAmount?.scale ?? { x: 1, y: 1, z: 1 });
  writer.writeFloat32LE(routePoint.speed ?? 0);
  writer.writeInt32LE(routePoint.easeType ?? 0);

  if (compareVersions(version, '1.0.3') === 0) {
    writer.writeUint8(0);
  }

  if (compareVersions(version, '1.0.4.1') >= 0) {
    writer.writeInt32LE(routePoint.connection ?? 0);
    writeRoutePointAidInfo(writer, routePoint.aidInfo ?? {});
  }

  if (compareVersions(version, '1.0.4.2') >= 0) {
    writer.writeUint8(routePoint.link ? 1 : 0);
  }
}

function loadCharInfo(
  reader: BinaryReader,
  version: string,
  decodeEmbeddedCards: boolean,
  preserveRaw: boolean,
): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'char');
  data.sex = required(reader.readInt32LE(), 'Failed to read char.sex');

  const embedded = parseEmbeddedCard(reader, {
    hasPng: false,
    decodeBlocks: decodeEmbeddedCards,
  });
  data.character = embedded.card;

  const bonesCount = required(
    reader.readInt32LE(),
    'Failed to read char.bonesCount',
  );
  data.bones = {};
  for (let index = 0; index < bonesCount; index += 1) {
    const key = required(
      reader.readInt32LE(),
      `Failed to read char.bones key ${index}`,
    );
    data.bones[key] = readBoneInfo(reader, `char.bones.${key}`);
  }

  const ikCount = required(
    reader.readInt32LE(),
    'Failed to read char.ikTargetsCount',
  );
  data.ik_targets = {};
  for (let index = 0; index < ikCount; index += 1) {
    const key = required(
      reader.readInt32LE(),
      `Failed to read char.ikTargets key ${index}`,
    );
    data.ik_targets[key] = readBoneInfo(reader, `char.ik_targets.${key}`);
  }

  const childCount = required(
    reader.readInt32LE(),
    'Failed to read char.childDictCount',
  );
  data.child = {};
  for (let index = 0; index < childCount; index += 1) {
    const key = required(
      reader.readInt32LE(),
      `Failed to read char.child key ${index}`,
    );
    data.child[key] = readChildObjects(reader, version, (childReader, type) =>
      readKkSceneObject(
        childReader,
        type,
        version,
        decodeEmbeddedCards,
        preserveRaw,
      ),
    );
  }

  data.kinematic_mode = required(
    reader.readInt32LE(),
    'Failed to read char.kinematic_mode',
  );
  data.anime_info = {
    group: required(
      reader.readInt32LE(),
      'Failed to read char.anime_info.group',
    ),
    category: required(
      reader.readInt32LE(),
      'Failed to read char.anime_info.category',
    ),
    no: required(reader.readInt32LE(), 'Failed to read char.anime_info.no'),
  };
  data.hand_patterns = [
    required(reader.readInt32LE(), 'Failed to read char.hand_patterns[0]'),
    required(reader.readInt32LE(), 'Failed to read char.hand_patterns[1]'),
  ];
  data.nipple = required(reader.readFloat32LE(), 'Failed to read char.nipple');
  data.siru = required(reader.readBytes(5), 'Failed to read char.siru');
  data.mouth_open = required(
    reader.readFloat32LE(),
    'Failed to read char.mouth_open',
  );
  data.lip_sync =
    required(reader.readUint8(), 'Failed to read char.lip_sync') !== 0;
  data.lookAtTarget = {
    dicKey: required(
      reader.readInt32LE(),
      'Failed to read char.lookAtTarget.dicKey',
    ),
    position: readVector3(reader, 'char.lookAtTarget.position'),
    rotation: readVector3(reader, 'char.lookAtTarget.rotation'),
    scale: readVector3(reader, 'char.lookAtTarget.scale'),
  };
  data.enable_ik =
    required(reader.readUint8(), 'Failed to read char.enable_ik') !== 0;
  data.active_ik = readBoolArray(reader, 5, 'char.active_ik');
  data.enable_fk =
    required(reader.readUint8(), 'Failed to read char.enable_fk') !== 0;
  data.active_fk = readBoolArray(reader, 7, 'char.active_fk');

  const expressionCount = compareVersions(version, '0.0.9') >= 0 ? 8 : 4;
  data.expression = readBoolArray(reader, expressionCount, 'char.expression');
  data.anime_speed = required(
    reader.readFloat32LE(),
    'Failed to read char.anime_speed',
  );
  data.anime_pattern = required(
    reader.readFloat32LE(),
    'Failed to read char.anime_pattern',
  );
  data.anime_option_visible =
    required(reader.readUint8(), 'Failed to read char.anime_option_visible') !==
    0;
  data.is_anime_force_loop =
    required(reader.readUint8(), 'Failed to read char.is_anime_force_loop') !==
    0;

  const voiceCount = required(
    reader.readInt32LE(),
    'Failed to read char.voiceCtrl.listCount',
  );
  data.voiceCtrl = { list: [] as Array<Record<string, number>> };
  for (let index = 0; index < voiceCount; index += 1) {
    data.voiceCtrl.list.push({
      group: required(
        reader.readInt32LE(),
        `Failed to read char.voiceCtrl.group ${index}`,
      ),
      category: required(
        reader.readInt32LE(),
        `Failed to read char.voiceCtrl.category ${index}`,
      ),
      no: required(
        reader.readInt32LE(),
        `Failed to read char.voiceCtrl.no ${index}`,
      ),
    });
  }
  data.voiceCtrl.repeat = required(
    reader.readInt32LE(),
    'Failed to read char.voiceCtrl.repeat',
  );

  data.visible_son =
    required(reader.readUint8(), 'Failed to read char.visible_son') !== 0;
  data.son_length = required(
    reader.readFloat32LE(),
    'Failed to read char.son_length',
  );
  data.visible_simple =
    required(reader.readUint8(), 'Failed to read char.visible_simple') !== 0;
  data.simple_color = required(
    reader.readLengthPrefixedString('b'),
    'Failed to read char.simple_color',
  );
  data.simple_color = JSON.parse(data.simple_color);
  data.anime_option_param = [
    required(
      reader.readFloat32LE(),
      'Failed to read char.anime_option_param[0]',
    ),
    required(
      reader.readFloat32LE(),
      'Failed to read char.anime_option_param[1]',
    ),
  ];

  const neckLength = required(
    reader.readInt32LE(),
    'Failed to read char.neck_byte_data length',
  );
  data.neck_byte_data = required(
    reader.readBytes(neckLength),
    'Failed to read char.neck_byte_data',
  );

  const eyesLength = required(
    reader.readInt32LE(),
    'Failed to read char.eyes_byte_data length',
  );
  data.eyes_byte_data = required(
    reader.readBytes(eyesLength),
    'Failed to read char.eyes_byte_data',
  );

  data.anime_normalized_time = required(
    reader.readFloat32LE(),
    'Failed to read char.anime_normalized_time',
  );

  const accessGroupCount = required(
    reader.readInt32LE(),
    'Failed to read char.dic_access_group count',
  );
  data.dic_access_group = {};
  for (let index = 0; index < accessGroupCount; index += 1) {
    const key = required(
      reader.readInt32LE(),
      `Failed to read char.dic_access_group key ${index}`,
    );
    data.dic_access_group[key] = required(
      reader.readInt32LE(),
      `Failed to read char.dic_access_group value ${index}`,
    );
  }

  const accessNoCount = required(
    reader.readInt32LE(),
    'Failed to read char.dic_access_no count',
  );
  data.dic_access_no = {};
  for (let index = 0; index < accessNoCount; index += 1) {
    const key = required(
      reader.readInt32LE(),
      `Failed to read char.dic_access_no key ${index}`,
    );
    data.dic_access_no[key] = required(
      reader.readInt32LE(),
      `Failed to read char.dic_access_no value ${index}`,
    );
  }

  return { type: 0, data };
}

function saveCharInfo(
  writer: BinaryWriter,
  object: SceneObject,
  version: string,
): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.writeInt32LE(data.sex ?? 0);
  writer.writeBytes(serializeEmbeddedCard(data.character, data.characterPng));

  const bones = Object.entries(data.bones ?? {});
  writer.writeInt32LE(bones.length);
  for (const [key, bone] of bones) {
    writer.writeInt32LE(Number(key));
    writeBoneInfo(writer, bone);
  }

  const ikTargets = Object.entries(data.ik_targets ?? {});
  writer.writeInt32LE(ikTargets.length);
  for (const [key, target] of ikTargets) {
    writer.writeInt32LE(Number(key));
    writeBoneInfo(writer, target);
  }

  const childEntries = Object.entries(data.child ?? {});
  writer.writeInt32LE(childEntries.length);
  for (const [key, children] of childEntries) {
    writer.writeInt32LE(Number(key));
    writeChildObjects(
      writer,
      children as SceneObject[],
      writeKkSceneObject,
      version,
    );
  }

  writer.writeInt32LE(data.kinematic_mode ?? 0);
  writer.writeInt32LE(data.anime_info?.group ?? 0);
  writer.writeInt32LE(data.anime_info?.category ?? 0);
  writer.writeInt32LE(data.anime_info?.no ?? 0);

  const handPatterns = data.hand_patterns ?? [0, 0];
  writer.writeInt32LE(handPatterns[0] ?? 0);
  writer.writeInt32LE(handPatterns[1] ?? 0);
  writer.writeFloat32LE(data.nipple ?? 0);
  writer.writeBytes(data.siru ?? new Uint8Array(5));
  writer.writeFloat32LE(data.mouth_open ?? 0);
  writer.writeUint8(data.lip_sync ? 1 : 0);

  writer.writeInt32LE(data.lookAtTarget?.dicKey ?? 0);
  writeVector3(writer, data.lookAtTarget?.position ?? { x: 0, y: 0, z: 0 });
  writeVector3(writer, data.lookAtTarget?.rotation ?? { x: 0, y: 0, z: 0 });
  writeVector3(writer, data.lookAtTarget?.scale ?? { x: 1, y: 1, z: 1 });

  writer.writeUint8(data.enable_ik ? 1 : 0);
  writeBoolArray(writer, data.active_ik ?? [false, false, false, false, false]);
  writer.writeUint8(data.enable_fk ? 1 : 0);
  writeBoolArray(
    writer,
    data.active_fk ?? [false, false, false, false, false, false, false],
  );

  const expressionCount = compareVersions(version, '0.0.9') >= 0 ? 8 : 4;
  const expression = Array.from({ length: expressionCount }, (_, index) =>
    Boolean(data.expression?.[index]),
  );
  writeBoolArray(writer, expression);

  writer.writeFloat32LE(data.anime_speed ?? 0);
  writer.writeFloat32LE(data.anime_pattern ?? 0);
  writer.writeUint8(data.anime_option_visible ? 1 : 0);
  writer.writeUint8(data.is_anime_force_loop ? 1 : 0);

  const voices = data.voiceCtrl?.list ?? [];
  writer.writeInt32LE(voices.length);
  for (const voice of voices) {
    writer.writeInt32LE(voice.group ?? 0);
    writer.writeInt32LE(voice.category ?? 0);
    writer.writeInt32LE(voice.no ?? 0);
  }
  writer.writeInt32LE(data.voiceCtrl?.repeat ?? 0);

  writer.writeUint8(data.visible_son ? 1 : 0);
  writer.writeFloat32LE(data.son_length ?? 0);
  writer.writeUint8(data.visible_simple ? 1 : 0);
  writer.writeLengthPrefixedString(
    JSON.stringify(data.simple_color ?? null),
    'b',
  );

  const animeOptionParam = data.anime_option_param ?? [0, 0];
  writer.writeFloat32LE(animeOptionParam[0] ?? 0);
  writer.writeFloat32LE(animeOptionParam[1] ?? 0);

  const neck = data.neck_byte_data ?? new Uint8Array(0);
  writer.writeInt32LE(neck.length);
  writer.writeBytes(neck);

  const eyes = data.eyes_byte_data ?? new Uint8Array(0);
  writer.writeInt32LE(eyes.length);
  writer.writeBytes(eyes);

  writer.writeFloat32LE(data.anime_normalized_time ?? 0);

  const accessGroup = Object.entries(data.dic_access_group ?? {});
  writer.writeInt32LE(accessGroup.length);
  for (const [key, value] of accessGroup) {
    writer.writeInt32LE(Number(key));
    writer.writeInt32LE(Number(value));
  }

  const accessNo = Object.entries(data.dic_access_no ?? {});
  writer.writeInt32LE(accessNo.length);
  for (const [key, value] of accessNo) {
    writer.writeInt32LE(Number(key));
    writer.writeInt32LE(Number(value));
  }
}

function loadItemInfo(
  reader: BinaryReader,
  version: string,
  decodeEmbeddedCards: boolean,
  preserveRaw: boolean,
): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'item');
  data.group = required(reader.readInt32LE(), 'Failed to read item.group');
  data.category = required(
    reader.readInt32LE(),
    'Failed to read item.category',
  );
  data.no = required(reader.readInt32LE(), 'Failed to read item.no');

  if (compareVersions(version, '1.1.1.0') >= 0) {
    data.anime_pattern = required(
      reader.readInt32LE(),
      'Failed to read item.anime_pattern',
    );
  } else {
    data.anime_pattern = 0;
  }

  data.anime_speed = required(
    reader.readFloat32LE(),
    'Failed to read item.anime_speed',
  );

  data.colors = [];
  if (compareVersions(version, '0.0.3') >= 0) {
    for (let index = 0; index < 8; index += 1) {
      const json = required(
        reader.read7BitEncodedString(),
        `Failed to read item.colors[${index}]`,
      );
      data.colors.push(json.length > 0 ? JSON.parse(json) : null);
    }
  } else {
    for (let index = 0; index < 7; index += 1) {
      const json = required(
        reader.read7BitEncodedString(),
        `Failed to read item.colors[${index}]`,
      );
      data.colors.push(json.length > 0 ? JSON.parse(json) : null);
    }
    data.colors.push({ r: 1, g: 1, b: 1, a: 1 });
  }

  data.patterns = [
    readPatternInfo(reader),
    readPatternInfo(reader),
    readPatternInfo(reader),
  ];
  data.alpha = required(reader.readFloat32LE(), 'Failed to read item.alpha');

  if (compareVersions(version, '0.0.4') >= 0) {
    data.line_color = required(
      reader.read7BitEncodedString(),
      'Failed to read item.line_color',
    );
    data.line_color = JSON.parse(data.line_color);
    data.line_width = required(
      reader.readFloat32LE(),
      'Failed to read item.line_width',
    );
  } else {
    data.line_color = { r: 128 / 255, g: 128 / 255, b: 128 / 255, a: 1 };
    data.line_width = 1;
  }

  if (compareVersions(version, '0.0.7') >= 0) {
    data.emission_color = required(
      reader.read7BitEncodedString(),
      'Failed to read item.emission_color',
    );
    data.emission_color = JSON.parse(data.emission_color);
    data.emission_power = required(
      reader.readFloat32LE(),
      'Failed to read item.emission_power',
    );
    data.light_cancel = required(
      reader.readFloat32LE(),
      'Failed to read item.light_cancel',
    );
  } else {
    data.emission_color = { r: 1, g: 1, b: 1, a: 1 };
    data.emission_power = 0;
    data.light_cancel = 0;
  }

  if (compareVersions(version, '0.0.6') >= 0) {
    data.panel = readPatternInfo(reader);
  } else {
    data.panel = {
      key: 0,
      file_path: '',
      clamp: true,
      uv: { x: 0, y: 0, z: 1, w: 1 },
      rot: 0,
    };
  }

  data.enable_fk =
    required(reader.readUint8(), 'Failed to read item.enable_fk') !== 0;

  const bonesCount = required(
    reader.readInt32LE(),
    'Failed to read item.bonesCount',
  );
  data.bones = {};
  for (let index = 0; index < bonesCount; index += 1) {
    const key = required(
      reader.read7BitEncodedString(),
      `Failed to read item.bones key ${index}`,
    );
    data.bones[key] = readBoneInfo(reader, `item.bones.${key}`);
  }

  if (compareVersions(version, '1.0.1') >= 0) {
    data.enable_dynamic_bone =
      required(
        reader.readUint8(),
        'Failed to read item.enable_dynamic_bone',
      ) !== 0;
  } else {
    data.enable_dynamic_bone = true;
  }

  data.anime_normalized_time = required(
    reader.readFloat32LE(),
    'Failed to read item.anime_normalized_time',
  );
  data.child = readChildObjects(reader, version, (childReader, type) =>
    readKkSceneObject(
      childReader,
      type,
      version,
      decodeEmbeddedCards,
      preserveRaw,
    ),
  );

  return { type: 1, data };
}

function saveItemInfo(
  writer: BinaryWriter,
  object: SceneObject,
  version: string,
): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.writeInt32LE(data.group ?? 0);
  writer.writeInt32LE(data.category ?? 0);
  writer.writeInt32LE(data.no ?? 0);

  if (compareVersions(version, '1.1.1.0') >= 0) {
    writer.writeInt32LE(data.anime_pattern ?? 0);
  }

  writer.writeFloat32LE(data.anime_speed ?? 0);

  const colorCount = compareVersions(version, '0.0.3') >= 0 ? 8 : 7;
  for (let index = 0; index < colorCount; index += 1) {
    writer.write7BitEncodedString(JSON.stringify(data.colors?.[index] ?? null));
  }

  for (let index = 0; index < 3; index += 1) {
    writePatternInfo(writer, data.patterns?.[index] ?? {});
  }

  writer.writeFloat32LE(data.alpha ?? 0);

  if (compareVersions(version, '0.0.4') >= 0) {
    writer.write7BitEncodedString(JSON.stringify(data.line_color ?? null));
    writer.writeFloat32LE(data.line_width ?? 1);
  }

  if (compareVersions(version, '0.0.7') >= 0) {
    writer.write7BitEncodedString(JSON.stringify(data.emission_color ?? null));
    writer.writeFloat32LE(data.emission_power ?? 0);
    writer.writeFloat32LE(data.light_cancel ?? 0);
  }

  if (compareVersions(version, '0.0.6') >= 0) {
    writePatternInfo(writer, data.panel ?? {});
  }

  writer.writeUint8(data.enable_fk ? 1 : 0);

  const bones = Object.entries(data.bones ?? {});
  writer.writeInt32LE(bones.length);
  for (const [key, bone] of bones) {
    writer.write7BitEncodedString(key);
    writeBoneInfo(writer, bone);
  }

  if (compareVersions(version, '1.0.1') >= 0) {
    writer.writeUint8(data.enable_dynamic_bone === false ? 0 : 1);
  }

  writer.writeFloat32LE(data.anime_normalized_time ?? 0);
  writeChildObjects(
    writer,
    (data.child ?? []) as SceneObject[],
    writeKkSceneObject,
    version,
  );
}

function loadLightInfo(reader: BinaryReader): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'light');
  data.no = required(reader.readInt32LE(), 'Failed to read light.no');
  data.color = readColorRgba(reader, 'light.color');
  data.intensity = required(
    reader.readFloat32LE(),
    'Failed to read light.intensity',
  );
  data.range = required(reader.readFloat32LE(), 'Failed to read light.range');
  data.spotAngle = required(
    reader.readFloat32LE(),
    'Failed to read light.spotAngle',
  );
  data.shadow =
    required(reader.readUint8(), 'Failed to read light.shadow') !== 0;
  data.enable =
    required(reader.readUint8(), 'Failed to read light.enable') !== 0;
  data.drawTarget =
    required(reader.readUint8(), 'Failed to read light.drawTarget') !== 0;
  return { type: 2, data };
}

function saveLightInfo(writer: BinaryWriter, object: SceneObject): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.writeInt32LE(data.no ?? 0);
  writeColorRgba(writer, data.color ?? { r: 1, g: 1, b: 1, a: 1 });
  writer.writeFloat32LE(data.intensity ?? 0);
  writer.writeFloat32LE(data.range ?? 0);
  writer.writeFloat32LE(data.spotAngle ?? 0);
  writer.writeUint8(data.shadow ? 1 : 0);
  writer.writeUint8(data.enable ? 1 : 0);
  writer.writeUint8(data.drawTarget ? 1 : 0);
}

function loadFolderInfo(
  reader: BinaryReader,
  version: string,
  decodeEmbeddedCards: boolean,
  preserveRaw: boolean,
): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'folder');
  data.name = required(
    reader.read7BitEncodedString(),
    'Failed to read folder.name',
  );
  data.child = readChildObjects(reader, version, (childReader, type) =>
    readKkSceneObject(
      childReader,
      type,
      version,
      decodeEmbeddedCards,
      preserveRaw,
    ),
  );
  return { type: 3, data };
}

function saveFolderInfo(
  writer: BinaryWriter,
  object: SceneObject,
  version: string,
): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.write7BitEncodedString(data.name ?? '');
  writeChildObjects(
    writer,
    (data.child ?? []) as SceneObject[],
    writeKkSceneObject,
    version,
  );
}

function loadRouteInfo(
  reader: BinaryReader,
  version: string,
  decodeEmbeddedCards: boolean,
  preserveRaw: boolean,
): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'route');
  data.name = required(
    reader.read7BitEncodedString(),
    'Failed to read route.name',
  );
  data.child = readChildObjects(reader, version, (childReader, type) =>
    readKkSceneObject(
      childReader,
      type,
      version,
      decodeEmbeddedCards,
      preserveRaw,
    ),
  );

  const count = required(
    reader.readInt32LE(),
    'Failed to read route.route_points count',
  );
  data.route_points = [];
  for (let index = 0; index < count; index += 1) {
    data.route_points.push(readRoutePointInfo(reader, version));
  }

  if (compareVersions(version, '1.0.3') >= 0) {
    data.active =
      required(reader.readUint8(), 'Failed to read route.active') !== 0;
    data.loop = required(reader.readUint8(), 'Failed to read route.loop') !== 0;
    data.visibleLine =
      required(reader.readUint8(), 'Failed to read route.visibleLine') !== 0;
  }

  if (compareVersions(version, '1.0.4') >= 0) {
    data.orient = required(reader.readInt32LE(), 'Failed to read route.orient');
  }

  if (compareVersions(version, '1.0.4.1') >= 0) {
    data.color = JSON.parse(
      required(reader.read7BitEncodedString(), 'Failed to read route.color'),
    );
  }

  return { type: 4, data };
}

function saveRouteInfo(
  writer: BinaryWriter,
  object: SceneObject,
  version: string,
): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.write7BitEncodedString(data.name ?? '');
  writeChildObjects(
    writer,
    (data.child ?? []) as SceneObject[],
    writeKkSceneObject,
    version,
  );

  const routePoints = data.route_points ?? [];
  writer.writeInt32LE(routePoints.length);
  for (const routePoint of routePoints) {
    writeRoutePointInfo(writer, routePoint, version);
  }

  if (compareVersions(version, '1.0.3') >= 0) {
    writer.writeUint8(data.active ? 1 : 0);
    writer.writeUint8(data.loop ? 1 : 0);
    writer.writeUint8(data.visibleLine ? 1 : 0);
  }

  if (compareVersions(version, '1.0.4') >= 0) {
    writer.writeInt32LE(data.orient ?? 0);
  }

  if (compareVersions(version, '1.0.4.1') >= 0) {
    writer.write7BitEncodedString(JSON.stringify(data.color ?? null));
  }
}

function loadCameraInfo(reader: BinaryReader): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'camera');
  data.name = required(
    reader.read7BitEncodedString(),
    'Failed to read camera.name',
  );
  data.active =
    required(reader.readUint8(), 'Failed to read camera.active') !== 0;
  return { type: 5, data };
}

function saveCameraInfo(writer: BinaryWriter, object: SceneObject): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.write7BitEncodedString(data.name ?? '');
  writer.writeUint8(data.active ? 1 : 0);
}

function loadTextInfo(reader: BinaryReader): SceneObject {
  const data: Record<string, any> = readObjectInfoBase(reader, 'text');
  data.id = required(reader.readInt32LE(), 'Failed to read text.id');
  data.color = JSON.parse(
    required(reader.read7BitEncodedString(), 'Failed to read text.color'),
  );
  data.outlineColor = JSON.parse(
    required(
      reader.read7BitEncodedString(),
      'Failed to read text.outlineColor',
    ),
  );
  data.outlineSize = required(
    reader.readFloat32LE(),
    'Failed to read text.outlineSize',
  );
  const length = required(
    reader.readInt32LE(),
    'Failed to read text.textInfos_raw length',
  );
  data.textInfos_raw = required(
    reader.readBytes(length),
    'Failed to read text.textInfos_raw',
  );
  return { type: 7, data };
}

function saveTextInfo(writer: BinaryWriter, object: SceneObject): void {
  const data = object.data;
  writeObjectInfoBase(writer, data);
  writer.writeInt32LE(data.id ?? 0);
  writer.write7BitEncodedString(JSON.stringify(data.color ?? null));
  writer.write7BitEncodedString(JSON.stringify(data.outlineColor ?? null));
  writer.writeFloat32LE(data.outlineSize ?? 0);
  const raw = data.textInfos_raw ?? new Uint8Array(0);
  writer.writeInt32LE(raw.length);
  writer.writeBytes(raw);
}

export function readKkSceneObject(
  reader: BinaryReader,
  type: number,
  version: string,
  decodeEmbeddedCards = true,
  preserveRaw = false,
): SceneObject {
  const start = reader.offset;
  let object: SceneObject;

  switch (type) {
    case 0:
      object = loadCharInfo(reader, version, decodeEmbeddedCards, preserveRaw);
      break;
    case 1:
      object = loadItemInfo(reader, version, decodeEmbeddedCards, preserveRaw);
      break;
    case 2:
      object = loadLightInfo(reader);
      break;
    case 3:
      object = loadFolderInfo(
        reader,
        version,
        decodeEmbeddedCards,
        preserveRaw,
      );
      break;
    case 4:
      object = loadRouteInfo(reader, version, decodeEmbeddedCards, preserveRaw);
      break;
    case 5:
      object = loadCameraInfo(reader);
      break;
    case 7:
      object = loadTextInfo(reader);
      break;
    default:
      throw new Error(`Unknown KK scene object type: ${type}`);
  }

  if (preserveRaw) {
    object.rawBytes = reader.subarray(start, reader.offset - start);
  }
  return object;
}

export function writeKkSceneObject(
  writer: BinaryWriter,
  object: SceneObject,
  version: string,
): void {
  if (object.rawBytes) {
    writer.writeBytes(object.rawBytes);
    return;
  }

  switch (object.type) {
    case 0:
      saveCharInfo(writer, object, version);
      return;
    case 1:
      saveItemInfo(writer, object, version);
      return;
    case 2:
      saveLightInfo(writer, object);
      return;
    case 3:
      saveFolderInfo(writer, object, version);
      return;
    case 4:
      saveRouteInfo(writer, object, version);
      return;
    case 5:
      saveCameraInfo(writer, object);
      return;
    case 7:
      saveTextInfo(writer, object);
      return;
    default:
      throw new Error(`Unknown KK scene object type: ${object.type}`);
  }
}
