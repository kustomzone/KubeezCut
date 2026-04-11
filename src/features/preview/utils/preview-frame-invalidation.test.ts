import { describe, expect, it } from 'vitest';
import {
  areTrackTimelineItemRefsEqual,
  collectVisualInvalidationRanges,
  getTextContentOnlyInvalidationDiag,
  isTextContentOnlyInvalidation,
} from './preview-frame-invalidation';
import type { CompositionInputProps } from '@/types/export';
import type { ItemKeyframes } from '@/types/keyframe';
import type { TimelineItem } from '@/types/timeline';

function createTracks(items: TimelineItem[]): CompositionInputProps['tracks'] {
  return [
    {
      id: 'track-1',
      name: 'Track 1',
      height: 60,
      locked: false,
      visible: true,
      muted: false,
      solo: false,
      order: 0,
      items,
    },
  ];
}

describe('collectVisualInvalidationRanges', () => {
  it('returns merged frame ranges for changed items and keyframes', () => {
    const unchangedItem = {
      id: 'item-unchanged',
      type: 'video',
      trackId: 'track-1',
      from: 200,
      durationInFrames: 30,
      src: 'blob:unchanged',
    } as TimelineItem;
    const previousItem = {
      id: 'item-1',
      type: 'video',
      trackId: 'track-1',
      from: 10,
      durationInFrames: 40,
      src: 'blob:clip',
      transform: { x: 0, y: 0, width: 100, height: 60, rotation: 0, opacity: 1 },
    } as TimelineItem;
    const nextItem = {
      ...previousItem,
      transform: { ...previousItem.transform!, x: 50 },
    } as TimelineItem;
    const previousKeyframes: ItemKeyframes[] = [
      {
        itemId: 'item-2',
        properties: [
          {
            property: 'x',
            keyframes: [{ id: 'kf-1', frame: 0, value: 0, easing: 'linear' }],
          },
        ],
      },
    ];
    const nextKeyframes: ItemKeyframes[] = [
      {
        itemId: 'item-2',
        properties: [
          {
            property: 'x',
            keyframes: [{ id: 'kf-2', frame: 0, value: 100, easing: 'linear' }],
          },
        ],
      },
    ];
    const keyedItem = {
      id: 'item-2',
      type: 'video',
      trackId: 'track-1',
      from: 40,
      durationInFrames: 30,
      src: 'blob:keyed',
    } as TimelineItem;

    expect(collectVisualInvalidationRanges({
      previousTracks: createTracks([previousItem, keyedItem, unchangedItem]),
      nextTracks: createTracks([nextItem, keyedItem, unchangedItem]),
      previousKeyframes,
      nextKeyframes,
    })).toEqual([
      { startFrame: 10, endFrame: 70 },
    ]);
  });

  it('skips invalidation when item and keyframe references are unchanged', () => {
    const item = {
      id: 'item-1',
      type: 'video',
      trackId: 'track-1',
      from: 0,
      durationInFrames: 60,
      src: 'blob:clip',
    } as TimelineItem;
    const keyframes: ItemKeyframes[] = [];
    const tracks = createTracks([item]);

    expect(collectVisualInvalidationRanges({
      previousTracks: tracks,
      nextTracks: tracks,
      previousKeyframes: keyframes,
      nextKeyframes: keyframes,
    })).toEqual([]);
  });
});

describe('areTrackTimelineItemRefsEqual', () => {
  it('returns true when track shells differ but item refs are identical', () => {
    const item = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 60,
      label: 'x',
      text: 'x',
      color: '#fff',
    };
    const a = createTracks([item as never]);
    const b = createTracks([item as never]);
    expect(a !== b).toBe(true);
    expect(areTrackTimelineItemRefsEqual(a, b)).toBe(true);
  });
});

describe('isTextContentOnlyInvalidation', () => {
  it('returns true when only text clip text/label change', () => {
    const base = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 120,
      label: 'a',
      text: 'a',
      color: '#fff',
      transform: { x: 0, y: 0, width: 800, height: 200, rotation: 0, opacity: 1 },
    };
    const prev = { ...base, text: 'hello', label: 'hello' };
    const next = { ...base, text: 'hello world', label: 'hello world' };
    expect(
      isTextContentOnlyInvalidation(
        createTracks([prev as never]),
        createTracks([next as never]),
        [],
        [],
      ),
    ).toBe(true);
  });

  it('returns false when text clip color changes', () => {
    const prev = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 120,
      label: 'x',
      text: 'x',
      color: '#ffffff',
      transform: { x: 0, y: 0, width: 800, height: 200, rotation: 0, opacity: 1 },
    };
    const next = { ...prev, color: '#000000' };
    expect(
      isTextContentOnlyInvalidation(
        createTracks([prev as never]),
        createTracks([next as never]),
        [],
        [],
      ),
    ).toBe(false);
  });

  it('returns true when keyframes are new refs but data-identical', () => {
    const base = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 120,
      label: 'a',
      text: 'a',
      color: '#fff',
      transform: { x: 0, y: 0, width: 800, height: 200, rotation: 0, opacity: 1 },
    };
    const prev = { ...base, text: 'hi', label: 'hi' };
    const next = { ...base, text: 'hi!', label: 'hi!' };
    const kfA: ItemKeyframes[] = [
      {
        itemId: 't1',
        properties: [
          {
            property: 'opacity',
            keyframes: [{ id: 'kf1', frame: 0, value: 1, easing: 'linear' }],
          },
        ],
      },
    ];
    const kfB: ItemKeyframes[] = JSON.parse(JSON.stringify(kfA)) as ItemKeyframes[];
    expect(kfA !== kfB).toBe(true);
    expect(
      isTextContentOnlyInvalidation(
        createTracks([prev as never]),
        createTracks([next as never]),
        kfA,
        kfB,
      ),
    ).toBe(true);
  });

  it('returns true when effects is [] vs omitted (sparse optional)', () => {
    const shared = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 120,
      color: '#fff',
      transform: { x: 0, y: 0, width: 800, height: 200, rotation: 0, opacity: 1 },
    };
    const prev = {
      ...shared,
      label: 'a',
      text: 'a',
      effects: [] as import('@/types/effects').ItemEffect[],
    };
    const next = {
      ...shared,
      label: 'b',
      text: 'b',
    };
    expect(
      isTextContentOnlyInvalidation(
        createTracks([prev as never]),
        createTracks([next as never]),
        [],
        [],
      ),
    ).toBe(true);
  });

  it('returns true when nested transform key order differs but values match', () => {
    const shared = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 120,
      color: '#fff',
    };
    const prev = {
      ...shared,
      label: 'a',
      text: 'a',
      transform: { x: 0, y: 0, width: 800, height: 200, rotation: 0, opacity: 1 },
    };
    const next = {
      ...shared,
      label: 'b',
      text: 'b',
      transform: { opacity: 1, rotation: 0, height: 200, width: 800, y: 0, x: 0 },
    };
    expect(
      isTextContentOnlyInvalidation(
        createTracks([prev as never]),
        createTracks([next as never]),
        [],
        [],
      ),
    ).toBe(true);
  });

  it('diag matches isTextContentOnlyInvalidation for failure cases', () => {
    const prev = {
      id: 't1',
      type: 'text' as const,
      trackId: 'track-1',
      from: 0,
      durationInFrames: 120,
      label: 'x',
      text: 'x',
      color: '#ffffff',
      transform: { x: 0, y: 0, width: 800, height: 200, rotation: 0, opacity: 1 },
    };
    const next = { ...prev, color: '#000000' };
    const tracksA = createTracks([prev as never]);
    const tracksB = createTracks([next as never]);
    expect(getTextContentOnlyInvalidationDiag(tracksA, tracksB, [], [])).toEqual({
      ok: false,
      reason: 'text_body_mismatch_other_fields',
    });
  });
});
