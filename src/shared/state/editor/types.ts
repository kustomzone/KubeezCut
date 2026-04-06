import type { EditorDensityPresetName, EditorLayout } from '@/shared/ui/editor-layout';

export type ClipInspectorTab = 'video' | 'audio' | 'effects';

/** Left rail library tabs (mutually exclusive with keyframes). */
export type LibrarySidebarTab = 'media' | 'text' | 'shapes' | 'effects' | 'transitions' | 'ai';

/** Left sidebar mode: one library panel or the keyframe editor (never both). */
export type LeftSidebarTab = LibrarySidebarTab | 'keyframes';

export interface EditorState {
  activePanel: 'media' | 'effects' | 'properties' | null;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  /** Last library tab before opening keyframes; restored when closing the keyframe editor. */
  lastLibraryTab: LibrarySidebarTab;
  activeTab: LeftSidebarTab;
  clipInspectorTab: ClipInspectorTab;
  sidebarWidth: number;
  rightSidebarWidth: number;
  timelineHeight: number;
  sourcePreviewMediaId: string | null;
  mediaSkimPreviewMediaId: string | null;
  mediaSkimPreviewFrame: number | null;
  compoundClipSkimPreviewCompositionId: string | null;
  compoundClipSkimPreviewFrame: number | null;
  sourcePatchVideoEnabled: boolean;
  sourcePatchAudioEnabled: boolean;
  linkedSelectionEnabled: boolean;
  colorScopesOpen: boolean;
  mixerFloating: boolean;
  propertiesFullColumn: boolean;
  mediaFullColumn: boolean;
}

export interface EditorActions {
  setActivePanel: (panel: 'media' | 'effects' | 'properties' | null) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setKeyframeEditorOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleKeyframeEditorOpen: () => void;
  setActiveTab: (tab: LeftSidebarTab) => void;
  setClipInspectorTab: (tab: ClipInspectorTab) => void;
  setSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  syncSidebarLayout: (layout: EditorLayout | EditorDensityPresetName) => void;
  setTimelineHeight: (height: number) => void;
  setSourcePreviewMediaId: (mediaId: string | null) => void;
  setMediaSkimPreview: (mediaId: string | null, frame?: number | null) => void;
  clearMediaSkimPreview: () => void;
  setCompoundClipSkimPreview: (compositionId: string | null, frame?: number | null) => void;
  clearCompoundClipSkimPreview: () => void;
  setSourcePatchVideoEnabled: (enabled: boolean) => void;
  setSourcePatchAudioEnabled: (enabled: boolean) => void;
  toggleSourcePatchVideoEnabled: () => void;
  toggleSourcePatchAudioEnabled: () => void;
  setLinkedSelectionEnabled: (enabled: boolean) => void;
  toggleLinkedSelectionEnabled: () => void;
  setColorScopesOpen: (open: boolean) => void;
  toggleColorScopesOpen: () => void;
  setMixerFloating: (floating: boolean) => void;
  toggleMixerFloating: () => void;
  togglePropertiesFullColumn: () => void;
  toggleMediaFullColumn: () => void;
}
