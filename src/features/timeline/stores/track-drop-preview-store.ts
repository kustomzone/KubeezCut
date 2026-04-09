import { create } from 'zustand';
import type { DroppableMediaType } from '../utils/dropped-media';

export interface TrackDropGhostPreview {
  left: number;
  width: number;
  label: string;
  type: 'composition' | DroppableMediaType | 'external-file' | 'text' | 'shape' | 'adjustment';
  targetTrackId: string;
  /** New video/image lane not in the store yet — draw ghost row above this classic track (e.g. audio-only). */
  previewAboveTrackId?: string;
  previewBelowTrackId?: string;
}

interface TrackDropPreviewState {
  ghostPreviews: TrackDropGhostPreview[];
  setGhostPreviews: (ghostPreviews: TrackDropGhostPreview[]) => void;
  clearGhostPreviews: () => void;
}

export const useTrackDropPreviewStore = create<TrackDropPreviewState>((set) => ({
  ghostPreviews: [],
  setGhostPreviews: (ghostPreviews) => set({ ghostPreviews }),
  clearGhostPreviews: () => set({ ghostPreviews: [] }),
}));
