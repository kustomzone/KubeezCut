import { create } from 'zustand';
import type { DroppableMediaType } from '../utils/dropped-media';

export interface NewTrackZoneGhostPreview {
  left: number;
  width: number;
  label: string;
  type: 'composition' | DroppableMediaType | 'external-file' | 'text' | 'shape' | 'adjustment';
  targetZone: 'video' | 'audio';
}

interface NewTrackZonePreviewState {
  ghostPreviews: NewTrackZoneGhostPreview[];
  /** True while dragging over the top video new-lane strip (syncs header + canvas blue line). */
  topVideoNewLaneDropActive: boolean;
  setGhostPreviews: (ghostPreviews: NewTrackZoneGhostPreview[]) => void;
  clearGhostPreviews: () => void;
  setTopVideoNewLaneDropActive: (active: boolean) => void;
}

export const useNewTrackZonePreviewStore = create<NewTrackZonePreviewState>((set) => ({
  ghostPreviews: [],
  topVideoNewLaneDropActive: false,
  setGhostPreviews: (ghostPreviews) => set({ ghostPreviews }),
  clearGhostPreviews: () => set({ ghostPreviews: [] }),
  setTopVideoNewLaneDropActive: (active) => set({ topVideoNewLaneDropActive: active }),
}));
