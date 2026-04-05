import { create } from 'zustand';

/**
 * Timeline settings state - FPS, scroll position, snap, dirty tracking.
 * These are UI/editor settings, not timeline content.
 */

interface TimelineSettingsState {
  fps: number;
  scrollPosition: number;
  snapEnabled: boolean;
  isDirty: boolean;
  /** True while loadTimeline() is in progress - used to coordinate initial player sync */
  isTimelineLoading: boolean;
  /**
   * When true, TimelineContent applies zoom-to-fit once after layout (new project or no saved zoom).
   * Cleared after the fit runs so saved zoom from project files is not overwritten.
   */
  pendingInitialZoomFit: boolean;
}

interface TimelineSettingsActions {
  setFps: (fps: number) => void;
  setScrollPosition: (position: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnap: () => void;
  setIsDirty: (dirty: boolean) => void;
  markDirty: () => void;
  markClean: () => void;
  setTimelineLoading: (loading: boolean) => void;
  setPendingInitialZoomFit: (pending: boolean) => void;
}

export const useTimelineSettingsStore = create<TimelineSettingsState & TimelineSettingsActions>()(
  (set, get) => ({
    // State
    fps: 30,
    scrollPosition: 0,
    snapEnabled: true,
    isDirty: false,
    isTimelineLoading: true, // Start true - set false after loadTimeline completes
    pendingInitialZoomFit: false,

    // Actions
    setFps: (fps) => set({ fps }),
    setScrollPosition: (position) => set({ scrollPosition: position }),
    setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
    toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
    setIsDirty: (dirty) => set({ isDirty: dirty }),
    markDirty: () => { if (!get().isDirty) set({ isDirty: true }); },
    markClean: () => set({ isDirty: false }),
    setTimelineLoading: (loading) => set({ isTimelineLoading: loading }),
    setPendingInitialZoomFit: (pending) => set({ pendingInitialZoomFit: pending }),
  })
);
