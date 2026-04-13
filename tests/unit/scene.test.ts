import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  countSceneObjectTypes,
  getSceneObjectTypeName,
  parseHcScene,
  parseKkScene,
  serializeHcScene,
  serializeKkScene,
  walkSceneObjects,
} from '../../src/index.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');

const FIXTURE_COUNTS = {
  kk: {
    counts: {
      Character: 1,
      Folder: 202,
      Item: 202,
      Light: 1,
    },
    total: 406,
  },
  hc: {
    counts: {
      Character: 2,
      Folder: 31,
      Item: 214,
      Light: 7,
    },
    total: 254,
  },
} as const;

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name)));
}

describe('parseKkScene', () => {
  const data = loadFixture('kk_scene.png');

  it('parses the fixture scene', () => {
    const scene = parseKkScene(data);
    expect(scene.version.length).toBeGreaterThan(0);
    expect(scene.tail.length).toBeGreaterThan(0);
    expect(scene.objectOrder?.length ?? 0).toBeGreaterThan(0);
    expect(scene.image).toBeInstanceOf(Uint8Array);
    expect(scene.tailRaw).toBeUndefined();
    expect(Object.values(scene.objects).some((object) => object.rawBytes)).toBe(
      false,
    );
  });

  it('re-serializes and reparses in default mode', () => {
    const scene = parseKkScene(data);
    const reparsed = parseKkScene(serializeKkScene(scene));
    expect(reparsed.version).toBe(scene.version);
    expect(reparsed.tail).toBe(scene.tail);
    expect(reparsed.objectOrder).toEqual(scene.objectOrder);
  });

  it('walks objects and counts types', () => {
    const scene = parseKkScene(data);
    const walked = [...walkSceneObjects(scene)];
    const topLevelKeys = walked
      .filter((entry) => entry.depth === 0)
      .map((entry) => entry.key);
    const characterCount = walked.filter(
      (entry) => entry.object.type === 0,
    ).length;
    const counts = countSceneObjectTypes(scene);

    expect(topLevelKeys).toEqual(scene.objectOrder);
    expect(counts).toEqual(FIXTURE_COUNTS.kk.counts);
    expect(walked).toHaveLength(FIXTURE_COUNTS.kk.total);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(
      walked.length,
    );
    expect([...walkSceneObjects(scene, { objectType: 0 })]).toHaveLength(
      characterCount,
    );
    expect(getSceneObjectTypeName(scene, 0)).toBe('Character');
    expect(getSceneObjectTypeName(scene, 999)).toBe('Unknown(999)');
  });

  it('round-trips the fixture bytes exactly in preserveRaw mode', () => {
    const scene = parseKkScene(data, { preserveRaw: true });
    expect(serializeKkScene(scene)).toEqual(data);
  });
});

describe('parseHcScene', () => {
  const data = loadFixture('hc_scene.png');

  it('parses the fixture scene', () => {
    const scene = parseHcScene(data);
    expect(scene.version.length).toBeGreaterThan(0);
    expect(scene.title.length).toBeGreaterThan(0);
    expect(scene.footerMarker.length).toBeGreaterThan(0);
    expect(scene.objectOrder?.length ?? 0).toBeGreaterThan(0);
    expect(scene.image).toBeInstanceOf(Uint8Array);
    expect(Object.values(scene.objects).some((object) => object.rawBytes)).toBe(
      false,
    );
  });

  it('re-serializes and reparses in default mode', () => {
    const scene = parseHcScene(data);
    const reparsed = parseHcScene(serializeHcScene(scene));
    expect(reparsed.version).toBe(scene.version);
    expect(reparsed.title).toBe(scene.title);
    expect(reparsed.objectOrder).toEqual(scene.objectOrder);
  });

  it('walks objects and counts types', () => {
    const scene = parseHcScene(data);
    const walked = [...walkSceneObjects(scene)];
    const topLevelKeys = walked
      .filter((entry) => entry.depth === 0)
      .map((entry) => entry.key);
    const characterCount = walked.filter(
      (entry) => entry.object.type === 0,
    ).length;
    const counts = countSceneObjectTypes(scene);

    expect(topLevelKeys).toEqual(scene.objectOrder);
    expect(counts).toEqual(FIXTURE_COUNTS.hc.counts);
    expect(walked).toHaveLength(FIXTURE_COUNTS.hc.total);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(
      walked.length,
    );
    expect([...walkSceneObjects(scene, { objectType: 0 })]).toHaveLength(
      characterCount,
    );
    expect(getSceneObjectTypeName(scene, 0)).toBe('Character');
    expect(getSceneObjectTypeName(scene, 999)).toBe('Unknown(999)');
  });

  it('round-trips the fixture bytes exactly in preserveRaw mode', () => {
    const scene = parseHcScene(data, { preserveRaw: true });
    expect(serializeHcScene(scene)).toEqual(data);
  });
});
