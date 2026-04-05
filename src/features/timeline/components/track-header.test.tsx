import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TimelineTrack } from '@/types/timeline';

import { useItemsStore } from '../stores/items-store';
import { TrackHeader } from './track-header';

vi.mock('../hooks/use-track-drag', () => ({
  useTrackDrag: () => ({
    handleDragStart: () => undefined,
  }),
}));

function makeTrack(overrides: Partial<TimelineTrack> = {}): TimelineTrack {
  return {
    id: 'track-1',
    name: 'V1',
    kind: 'video',
    height: 72,
    locked: false,
    visible: true,
    muted: false,
    solo: false,
    volume: 0,
    order: 0,
    items: [],
    ...overrides,
  };
}

function renderTrackHeader(
  track: TimelineTrack,
  handlers: {
    onToggleMute?: () => void;
    onToggleVisibility?: () => void;
  } = {}
) {
  const onToggleMute = handlers.onToggleMute ?? vi.fn();
  const onToggleVisibility = handlers.onToggleVisibility ?? vi.fn();

  render(
    <TrackHeader
      track={track}
      isActive={false}
      isSelected={false}
      canDeleteTrack
      canDeleteEmptyTracks
      onToggleMute={onToggleMute}
      onToggleVisibility={onToggleVisibility}
      onToggleLock={() => undefined}
      onSelect={() => undefined}
      onAddVideoTrack={() => undefined}
      onAddAudioTrack={() => undefined}
      onDeleteTrack={() => undefined}
      onDeleteEmptyTracks={() => undefined}
    />
  );

  return { onToggleMute, onToggleVisibility };
}

describe('TrackHeader', () => {
  beforeEach(() => {
    useItemsStore.getState().setItems([]);
  });

  it('renders visibility control for video tracks (no mute — audio has its own lane)', () => {
    const { onToggleMute, onToggleVisibility } = renderTrackHeader(
      makeTrack({ kind: 'video', visible: true, muted: false })
    );

    expect(screen.queryByRole('button', { name: /Mute track|Unmute track/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide track' }));
    expect(onToggleVisibility).toHaveBeenCalledTimes(1);
    expect(onToggleMute).not.toHaveBeenCalled();
  });

  it('renders mute control for audio tracks', () => {
    const { onToggleMute, onToggleVisibility } = renderTrackHeader(
      makeTrack({ id: 'track-2', name: 'A1', kind: 'audio', muted: true })
    );

    expect(screen.queryByRole('button', { name: /Hide track|Show track/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unmute track' }));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    expect(onToggleVisibility).not.toHaveBeenCalled();
  });
});
