/**
 * OpenCut-style resizable panel percentages for the editor shell.
 * Persisted so layout matches OpenCut behavior (tools / preview / properties / main vs timeline).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EditorPanelSizes {
  tools: number;
  preview: number;
  properties: number;
  mainContent: number;
  timeline: number;
}

export type EditorPanelId = keyof EditorPanelSizes;

const DEFAULT_PANELS: EditorPanelSizes = {
  tools: 25,
  preview: 50,
  properties: 25,
  mainContent: 50,
  timeline: 50,
};

interface EditorPanelLayoutState {
  panels: EditorPanelSizes;
  setPanel: (panel: EditorPanelId, size: number) => void;
  resetPanels: () => void;
}

export const useEditorPanelLayoutStore = create<EditorPanelLayoutState>()(
  persist(
    (set) => ({
      panels: { ...DEFAULT_PANELS },
      setPanel: (panel, size) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [panel]: size,
          },
        })),
      resetPanels: () => set({ panels: { ...DEFAULT_PANELS } }),
    }),
    {
      name: 'kubeez-editor-panel-sizes',
      version: 1,
      partialize: (state) => ({ panels: state.panels }),
    }
  )
);
