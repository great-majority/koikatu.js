import type {
  HcScene,
  Scene,
  SceneObject,
  SceneObjectTypeNameMap,
  SceneWalkEntry,
  SceneWalkOptions,
} from '../types.js';

export const KK_SCENE_OBJECT_TYPE_NAMES: SceneObjectTypeNameMap = {
  0: 'Character',
  1: 'Item',
  2: 'Light',
  3: 'Folder',
  4: 'Route',
  5: 'Camera',
  7: 'Text',
};

export const HC_SCENE_OBJECT_TYPE_NAMES: SceneObjectTypeNameMap = {
  0: 'Character',
  1: 'Item',
  2: 'Light',
  3: 'Folder',
  4: 'Route',
  5: 'Camera',
};

function isHcScene(scene: Scene): scene is HcScene {
  return 'userId' in scene;
}

function sceneTopLevelKeys(scene: Scene): number[] {
  return (
    scene.objectOrder ??
    Object.keys(scene.objects)
      .map((key) => Number(key))
      .filter((key) => Number.isInteger(key))
  );
}

function sceneObjectTypeNames(scene: Scene): SceneObjectTypeNameMap {
  return isHcScene(scene)
    ? HC_SCENE_OBJECT_TYPE_NAMES
    : KK_SCENE_OBJECT_TYPE_NAMES;
}

function shouldYield(object: SceneObject, options?: SceneWalkOptions): boolean {
  return (
    options?.objectType === undefined || object.type === options.objectType
  );
}

function* walkSceneChildren(
  object: SceneObject,
  depth: number,
  options?: SceneWalkOptions,
): Generator<SceneWalkEntry> {
  const child = object.data.child;
  if (!child) return;

  if (object.type === 0 && typeof child === 'object' && !Array.isArray(child)) {
    for (const [childKey, childObjects] of Object.entries(child)) {
      if (!Array.isArray(childObjects)) continue;
      const numericChildKey = Number(childKey);

      for (const [index, childObject] of childObjects.entries()) {
        if (shouldYield(childObject, options)) {
          yield {
            key: [numericChildKey, index],
            object: childObject,
            depth,
          };
        }
        yield* walkSceneChildren(childObject, depth + 1, options);
      }
    }
    return;
  }

  if (!Array.isArray(child)) return;

  for (const [index, childObject] of child.entries()) {
    if (shouldYield(childObject, options)) {
      yield { key: index, object: childObject, depth };
    }
    yield* walkSceneChildren(childObject, depth + 1, options);
  }
}

export function* walkSceneObjects(
  scene: Scene,
  options?: SceneWalkOptions,
): Generator<SceneWalkEntry> {
  for (const key of sceneTopLevelKeys(scene)) {
    const object = scene.objects[key];
    if (!object) continue;

    if (shouldYield(object, options)) {
      yield { key, object, depth: 0 };
    }
    yield* walkSceneChildren(object, 1, options);
  }
}

export function getSceneObjectTypeName(scene: Scene, type: number): string {
  return sceneObjectTypeNames(scene)[type] ?? `Unknown(${type})`;
}

export function countSceneObjectTypes(scene: Scene): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const entry of walkSceneObjects(scene)) {
    const name = getSceneObjectTypeName(scene, entry.object.type);
    counts[name] = (counts[name] ?? 0) + 1;
  }

  return counts;
}

export function getSceneObjectTypeNames(scene: Scene): SceneObjectTypeNameMap {
  return { ...sceneObjectTypeNames(scene) };
}
