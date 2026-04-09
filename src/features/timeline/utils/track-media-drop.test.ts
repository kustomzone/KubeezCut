import { describe, expect, it } from 'vitest';
import { createDefaultClassicTracks, getTrackKind } from './classic-tracks';
import {
  buildGhostPreviewsFromTrackMediaDropPlan,
  planTrackMediaDropPlacements,
} from './track-media-drop';

function makeTrack(params: {
  id: string;
  name: string;
  kind: 'video' | 'audio';
  order: number;
}) {
  return {
    id: params.id,
    name: params.name,
    kind: params.kind,
    order: params.order,
    height: 80,
    locked: false,
    visible: true,
    muted: false,
    solo: false,
    volume: 0,
    items: [],
  };
}

describe('planTrackMediaDropPlacements', () => {
  it('plans linked video drops onto both video and audio tracks', () => {
    const tracks = createDefaultClassicTracks(72);

    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-1' },
        label: 'clip.mp4',
        mediaType: 'video',
        durationInFrames: 90,
        hasLinkedAudio: true,
      }],
      dropFrame: 24,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'track-1',
    });

    expect(result.plannedItems).toHaveLength(1);
    const [videoPlacement, audioPlacement] = result.plannedItems[0]!.placements;
    expect(videoPlacement).toMatchObject({ trackId: 'track-1', mediaType: 'video', from: 24 });
    expect(audioPlacement).toMatchObject({ mediaType: 'audio', from: 24 });
    expect(audioPlacement!.trackId).not.toBe('track-1');
    expect(result.tracks.filter((track) => getTrackKind(track) === 'audio')).toHaveLength(1);
  });

  it('maps linked video dropped on V2 to A2', () => {
    const tracks = [
      makeTrack({ id: 'v1', name: 'V1', kind: 'video', order: 0 }),
      makeTrack({ id: 'v2', name: 'V2', kind: 'video', order: 1 }),
      makeTrack({ id: 'a1', name: 'A1', kind: 'audio', order: 2 }),
      makeTrack({ id: 'a2', name: 'A2', kind: 'audio', order: 3 }),
    ];

    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-v2' },
        label: 'clip-v2.mp4',
        mediaType: 'video',
        durationInFrames: 60,
        hasLinkedAudio: true,
      }],
      dropFrame: 30,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'v2',
    });

    expect(result.plannedItems[0]!.placements).toEqual([
      expect.objectContaining({ trackId: 'v2', mediaType: 'video', from: 30 }),
      expect.objectContaining({ trackId: 'a2', mediaType: 'audio', from: 30 }),
    ]);
  });

  it('retargets linked video dropped on an audio lane to the video row above (V2 + A2)', () => {
    const tracks = [
      makeTrack({ id: 'v1', name: 'V1', kind: 'video', order: 0 }),
      makeTrack({ id: 'v2', name: 'V2', kind: 'video', order: 1 }),
      makeTrack({ id: 'a1', name: 'A1', kind: 'audio', order: 2 }),
      makeTrack({ id: 'a2', name: 'A2', kind: 'audio', order: 3 }),
    ];

    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-a2' },
        label: 'clip-a2.mp4',
        mediaType: 'video',
        durationInFrames: 60,
        hasLinkedAudio: true,
      }],
      dropFrame: 42,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'a2',
    });

    expect(result.plannedItems[0]!.placements).toEqual([
      expect.objectContaining({ trackId: 'v2', mediaType: 'video', from: 42 }),
      expect.objectContaining({ trackId: 'a2', mediaType: 'audio', from: 42 }),
    ]);
  });

  it('retargets visual media dropped on an audio lane to the nearest video track above', () => {
    const tracks = [
      ...createDefaultClassicTracks(72),
      makeTrack({ id: 'a1', name: 'A1', kind: 'audio', order: 1 }),
    ];

    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-2' },
        label: 'still.png',
        mediaType: 'image',
        durationInFrames: 45,
      }],
      dropFrame: 12,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'a1',
    });

    expect(result.plannedItems).toHaveLength(1);
    expect(result.plannedItems[0]!.placements[0]).toMatchObject({
      trackId: 'track-1',
      mediaType: 'image',
      from: 12,
      durationInFrames: 45,
    });
  });

  it('spawns a new audio lane below A1 when preferNewAudioLane is set', () => {
    const tracks = [makeTrack({ id: 'a1', name: 'A1', kind: 'audio', order: 0 })];
    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'snd' },
        label: 'bass.wav',
        mediaType: 'audio',
        durationInFrames: 120,
      }],
      dropFrame: 0,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'a1',
      preferNewAudioLane: true,
    });

    expect(result.plannedItems).toHaveLength(1);
    expect(result.tracks.filter((t) => getTrackKind(t) === 'audio')).toHaveLength(2);
    expect(result.plannedItems[0]!.placements[0]!.trackId).not.toBe('a1');
    expect(result.plannedItems[0]!.placements[0]!.mediaType).toBe('audio');
  });

  it('creates a video lane when visual media is dropped and only audio tracks exist', () => {
    const tracks = [makeTrack({ id: 'a1', name: 'A1', kind: 'audio', order: 0 })];

    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-img' },
        label: 'solo.png',
        mediaType: 'image',
        durationInFrames: 30,
      }],
      dropFrame: 6,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'a1',
    });

    expect(result.plannedItems).toHaveLength(1);
    const vid = result.tracks.filter((t) => getTrackKind(t) === 'video');
    expect(vid).toHaveLength(1);
    expect(result.plannedItems[0]!.placements[0]!.trackId).toBe(vid[0]!.id);
  });

  it('creates an audio lane when audio is dropped on a video-only stack', () => {
    const tracks = createDefaultClassicTracks(72);

    const result = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-a1' },
        label: 'voice.wav',
        mediaType: 'audio',
        durationInFrames: 90,
      }],
      dropFrame: 12,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'track-1',
    });

    expect(result.plannedItems).toHaveLength(1);
    const placement = result.plannedItems[0]!.placements[0];
    expect(placement).toMatchObject({ mediaType: 'audio', from: 12, durationInFrames: 90 });
    const host = result.tracks.find((t) => t.id === placement!.trackId);
    expect(getTrackKind(host!)).toBe('audio');
    expect(result.tracks.filter((t) => getTrackKind(t) === 'audio')).toHaveLength(1);
  });
});

describe('buildGhostPreviewsFromTrackMediaDropPlan', () => {
  it('builds a companion audio ghost on the linked audio track', () => {
    const tracks = createDefaultClassicTracks(72);
    const { plannedItems } = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'media-1' },
        label: 'clip.mp4',
        mediaType: 'video',
        durationInFrames: 90,
        hasLinkedAudio: true,
      }],
      dropFrame: 24,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'track-1',
    });

    const existingIds = new Set(tracks.map((t) => t.id));
    const ghosts = buildGhostPreviewsFromTrackMediaDropPlan({
      plannedItems,
      frameToPixels: (frame) => frame,
      existingTrackIds: existingIds,
      dropTargetTrackId: 'track-1',
    });

    const audioTrackId = plannedItems[0]!.placements.find((placement) => placement.mediaType === 'audio')?.trackId;
    expect(audioTrackId).toBeDefined();
    expect(ghosts).toEqual([
      expect.objectContaining({ targetTrackId: 'track-1', type: 'video', left: 24, width: 90 }),
      expect.objectContaining({
        targetTrackId: audioTrackId,
        type: 'audio',
        left: 24,
        width: 90,
        previewBelowTrackId: 'track-1',
      }),
    ]);
  });

  it('sets previewAboveTrackId when a new video lane is planned above an audio-only drop target', () => {
    const tracks = [makeTrack({ id: 'a1', name: 'A1', kind: 'audio', order: 0 })];
    const { plannedItems } = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'img-1' },
        label: 'still.png',
        mediaType: 'image',
        durationInFrames: 48,
      }],
      dropFrame: 6,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'a1',
    });

    expect(plannedItems).toHaveLength(1);
    const placement = plannedItems[0]!.placements[0]!;
    expect(placement.mediaType).toBe('image');

    const ghosts = buildGhostPreviewsFromTrackMediaDropPlan({
      plannedItems,
      frameToPixels: (frame) => frame,
      existingTrackIds: new Set(tracks.map((t) => t.id)),
      dropTargetTrackId: 'a1',
    });

    expect(ghosts).toEqual([
      expect.objectContaining({
        targetTrackId: placement.trackId,
        previewAboveTrackId: 'a1',
        type: 'image',
        left: 6,
        width: 48,
      }),
    ]);
  });

  it('sets previewBelowTrackId when first audio lane is planned under V1', () => {
    const tracks = createDefaultClassicTracks(72);
    const { plannedItems } = planTrackMediaDropPlacements({
      entries: [{
        payload: { id: 'm1' },
        label: 'clip.mp3',
        mediaType: 'audio',
        durationInFrames: 90,
      }],
      dropFrame: 12,
      tracks,
      existingItems: [],
      dropTargetTrackId: 'track-1',
    });

    expect(plannedItems).toHaveLength(1);
    const placement = plannedItems[0]!.placements[0]!;
    expect(placement.trackId).not.toBe('track-1');
    expect(placement.mediaType).toBe('audio');

    const ghosts = buildGhostPreviewsFromTrackMediaDropPlan({
      plannedItems,
      frameToPixels: (frame) => frame,
      existingTrackIds: new Set(tracks.map((t) => t.id)),
      dropTargetTrackId: 'track-1',
    });

    expect(ghosts).toEqual([
      expect.objectContaining({
        targetTrackId: placement.trackId,
        previewBelowTrackId: 'track-1',
        type: 'audio',
        left: 12,
        width: 90,
      }),
    ]);
  });
});
