import { useCallback, useMemo, useRef, useEffect, memo, Activity } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Film,
  Layers,
  LineChart,
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Heart,
  Pentagon,
  Sparkles,
  Blend,
  Pen,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/shared/state/editor';
import { useTimelineStore } from '@/features/editor/deps/timeline-store';
import { usePlaybackStore } from '@/shared/state/playback';
import { useSelectionStore } from '@/shared/state/selection';
import { useProjectStore } from '@/features/editor/deps/projects';
import {
  clearMediaDragData,
  MediaLibrary,
  setMediaDragData,
} from '@/features/editor/deps/media-library';
import { KeyframeGraphPanel } from '@/features/editor/deps/timeline-ui';
import { TransitionsPanel } from './transitions-panel';
import {
  createDefaultAdjustmentItem,
  createDefaultShapeItem,
  createDefaultTextItem,
  findCompatibleTrackForItemType,
  findNearestAvailableSpace,
  getDefaultGeneratedLayerDurationInFrames,
} from '@/features/editor/deps/timeline-utils';
import {
  PLAIN_PRESET,
  TEXT_STYLE_PRESETS,
  type TextStylePreset,
} from '@/features/editor/deps/text-style-presets';
import type { TextItem, ShapeItem, ShapeType, AdjustmentItem } from '@/types/timeline';
import { useMaskEditorStore } from '@/features/editor/deps/preview';
import type { VisualEffect, GpuEffect } from '@/types/effects';
import { EFFECT_PRESETS } from '@/types/effects';
import { getGpuCategoriesWithEffects, getGpuEffectDefaultParams } from '@/infrastructure/gpu/effects';
import { useEffectPreviews } from '@/features/editor/deps/effects-contract';
import { createLogger } from '@/shared/logging/logger';
import { useSettingsStore } from '@/features/editor/deps/settings';
import { AiPanel } from './ai-panel';
import {
  EDITOR_LAYOUT_CSS_VALUES,
  clampLeftEditorSidebarWidth,
  getEditorLayout,
} from '@/shared/ui/editor-layout';

const logger = createLogger('MediaSidebar');

/** Fills space under the sidebar title row like the Effects tab: bounded flex child + scroll. */
const SCROLL_TAB_PANEL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]';

export interface MediaSidebarProps {
  /** Parent ResizablePanel owns width (OpenCut-style editor shell). */
  fillContainer?: boolean;
}

export const MediaSidebar = memo(function MediaSidebar({ fillContainer = false }: MediaSidebarProps) {
  const editorDensity = useSettingsStore((s) => s.editorDensity);
  const editorLayout = getEditorLayout(editorDensity);
  // Use granular selectors - Zustand v5 best practice
  const leftSidebarOpen = useEditorStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const mediaFullColumn = useEditorStore((s) => s.mediaFullColumn);
  const toggleMediaFullColumn = useEditorStore((s) => s.toggleMediaFullColumn);
  const setKeyframeEditorOpen = useEditorStore((s) => s.setKeyframeEditorOpen);
  const toggleKeyframeEditorOpen = useEditorStore((s) => s.toggleKeyframeEditorOpen);
  const activeTab = useEditorStore((s) => s.activeTab);
  const keyframeEditorOpen = activeTab === 'keyframes';
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const sidebarWidth = useEditorStore((s) => s.sidebarWidth);
  const setSidebarWidth = useEditorStore((s) => s.setSidebarWidth);

  // Auto-expand sidebar to 35% viewport when keyframe editor opens
  const prevKeyframeOpenRef = useRef(keyframeEditorOpen);
  const savedWidthBeforeExpandRef = useRef<number | null>(null);

  useEffect(() => {
    if (fillContainer) return;
    const wasOpen = prevKeyframeOpenRef.current;
    prevKeyframeOpenRef.current = keyframeEditorOpen;

    if (keyframeEditorOpen && !wasOpen) {
      const targetWidth = Math.floor(window.innerWidth * 0.35);
      const clamped = clampLeftEditorSidebarWidth(targetWidth, editorLayout);
      if (clamped > sidebarWidth) {
        savedWidthBeforeExpandRef.current = sidebarWidth;
        setSidebarWidth(clamped);
      }
    } else if (!keyframeEditorOpen && wasOpen && savedWidthBeforeExpandRef.current !== null) {
      setSidebarWidth(savedWidthBeforeExpandRef.current);
      savedWidthBeforeExpandRef.current = null;
    }
  }, [fillContainer, keyframeEditorOpen, editorLayout, sidebarWidth, setSidebarWidth]);

  // Resize handle logic
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const suppressGeneratedItemClickRef = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = clampLeftEditorSidebarWidth(startWidthRef.current + delta, editorLayout);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [editorLayout, setSidebarWidth]);

  // NOTE: Don't subscribe to tracks, items, currentProject here!
  // These change frequently and would cause re-renders cascading to MediaLibrary/MediaCards
  // Read from store directly in callbacks using getState()

  // Add text item with optional style preset (plain + Clipchamp-style grid)
  const handleAddStyledText = useCallback((preset: TextStylePreset) => {
    const { tracks, items, fps, addItem } = useTimelineStore.getState();
    const { activeTrackId, selectItems } = useSelectionStore.getState();
    const currentProject = useProjectStore.getState().currentProject;

    const targetTrack = findCompatibleTrackForItemType({
      tracks,
      items,
      itemType: 'text',
      preferredTrackId: activeTrackId,
    });

    if (!targetTrack) {
      logger.warn('No available track for text item');
      return;
    }

    const durationInFrames = getDefaultGeneratedLayerDurationInFrames(fps);
    const proposedPosition = usePlaybackStore.getState().currentFrame;
    const finalPosition = findNearestAvailableSpace(
      proposedPosition,
      durationInFrames,
      targetTrack.id,
      items
    ) ?? proposedPosition;

    const canvasWidth = currentProject?.metadata.width ?? 1920;
    const canvasHeight = currentProject?.metadata.height ?? 1080;

    const base = createDefaultTextItem({
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      canvasWidth,
      canvasHeight,
    });

    const textItem: TextItem = {
      ...base,
      ...preset.getItemOverrides(),
    };

    addItem(textItem);
    selectItems([textItem.id]);
  }, []);

  const handleAddText = useCallback(() => {
    handleAddStyledText(PLAIN_PRESET);
  }, [handleAddStyledText]);

  // Add shape item to timeline at the best available position
  const handleAddShape = useCallback((shapeType: ShapeType) => {
    // Read all needed state from stores directly to avoid subscriptions
    const { tracks, items, fps, addItem } = useTimelineStore.getState();
    const { activeTrackId, selectItems } = useSelectionStore.getState();
    const currentProject = useProjectStore.getState().currentProject;

    const targetTrack = findCompatibleTrackForItemType({
      tracks,
      items,
      itemType: 'shape',
      preferredTrackId: activeTrackId,
    });

    if (!targetTrack) {
      logger.warn('No available track for shape item');
      return;
    }

    const durationInFrames = getDefaultGeneratedLayerDurationInFrames(fps);

    // Find the best position: start at playhead, find nearest available space
    const proposedPosition = usePlaybackStore.getState().currentFrame;
    const finalPosition = findNearestAvailableSpace(
      proposedPosition,
      durationInFrames,
      targetTrack.id,
      items
    ) ?? proposedPosition;

    const canvasWidth = currentProject?.metadata.width ?? 1920;
    const canvasHeight = currentProject?.metadata.height ?? 1080;

    const shapeItem: ShapeItem = createDefaultShapeItem({
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      canvasWidth,
      canvasHeight,
      shapeType,
    });

    addItem(shapeItem);
    // Select the new item
    selectItems([shapeItem.id]);
  }, []);

  // Add adjustment layer to timeline at the best available position
  // Optionally with pre-applied effects and custom label
  const handleAddAdjustmentLayer = useCallback((effects?: VisualEffect[], label?: string) => {
    // Read all needed state from stores directly to avoid subscriptions
    const { tracks, items, fps, addItem } = useTimelineStore.getState();
    const { activeTrackId, selectItems } = useSelectionStore.getState();

    const targetTrack = findCompatibleTrackForItemType({
      tracks,
      items,
      itemType: 'adjustment',
      preferredTrackId: activeTrackId,
    });

    if (!targetTrack) {
      logger.warn('No available track for adjustment layer');
      return;
    }

    const durationInFrames = getDefaultGeneratedLayerDurationInFrames(fps);

    // Find the best position: start at playhead, find nearest available space
    const proposedPosition = usePlaybackStore.getState().currentFrame;
    const finalPosition = findNearestAvailableSpace(
      proposedPosition,
      durationInFrames,
      targetTrack.id,
      items
    ) ?? proposedPosition;

    const adjustmentItem: AdjustmentItem = createDefaultAdjustmentItem({
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      effects,
      label,
    });

    addItem(adjustmentItem);
    // Select the new item
    selectItems([adjustmentItem.id]);
  }, []);

  // Create adjustment layer with preset effects
  const handleAddPreset = useCallback((presetId: string) => {
    const preset = EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    handleAddAdjustmentLayer(preset.effects, preset.name);
  }, [handleAddAdjustmentLayer]);

  // Add a single GPU effect — to selected clips, or as adjustment layer if nothing selected
  const handleAddGpuEffect = useCallback((gpuEffectId: string) => {
    const { selectedItemIds } = useSelectionStore.getState();
    const { items, addEffect } = useTimelineStore.getState();

    // Find selected visual items (not audio)
    const visualIds = selectedItemIds.filter((id) => {
      const item = items.find((i) => i.id === id);
      return item && item.type !== 'audio';
    });

    if (visualIds.length > 0) {
      const defaults = getGpuEffectDefaultParams(gpuEffectId);
      const effect: GpuEffect = {
        type: 'gpu-effect',
        gpuEffectType: gpuEffectId,
        params: defaults,
      };
      visualIds.forEach((id) => addEffect(id, effect));
    } else {
      // No visual selection — create adjustment layer with this effect
      const defaults = getGpuEffectDefaultParams(gpuEffectId);
      handleAddAdjustmentLayer(
        [{ type: 'gpu-effect', gpuEffectType: gpuEffectId, params: defaults }],
      );
    }
  }, [handleAddAdjustmentLayer]);

  // GPU effect categories and preview thumbnails (static data, memoize once)
  const gpuCategories = useMemo(() => getGpuCategoriesWithEffects(), []);
  const allEffectEntries = useMemo(
    () => gpuCategories.flatMap(({ effects: catEffects }) =>
      catEffects.map((def) => ({ id: def.id, def }))
    ),
    [gpuCategories],
  );
  const presetIds = useMemo(() => EFFECT_PRESETS.map((p) => p.id), []);
  const { previews: effectPreviews, trigger: triggerPreviews } = useEffectPreviews(allEffectEntries, presetIds);

  // Category items for the vertical nav
  const categories = [
    { id: 'media' as const, icon: Film, label: 'Media' },
    { id: 'text' as const, icon: Type, label: 'Text' },
    { id: 'shapes' as const, icon: Pentagon, label: 'Shapes' },
    { id: 'effects' as const, icon: Layers, label: 'Effects' },
    { id: 'transitions' as const, icon: Blend, label: 'Transitions' },
    { id: 'ai' as const, icon: WandSparkles, label: 'AI' },
  ];

  const shouldSuppressGeneratedItemClick = useCallback(() => {
    if (!suppressGeneratedItemClickRef.current) {
      return false;
    }

    suppressGeneratedItemClickRef.current = false;
    return true;
  }, []);

  const handleTemplateDragStart = useCallback((payload: {
    itemType: 'text' | 'shape' | 'adjustment';
    label: string;
    shapeType?: ShapeType;
    effects?: VisualEffect[];
    stylePresetId?: string;
  }) => (event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = 'copy';
    const dragData = {
      type: 'timeline-template' as const,
      ...payload,
    };

    suppressGeneratedItemClickRef.current = true;
    const json = JSON.stringify(dragData);
    event.dataTransfer.setData('application/json', json);
    event.dataTransfer.setData('text/plain', json);
    setMediaDragData(dragData);
  }, []);

  const handleTemplateDragEnd = useCallback(() => {
    clearMediaDragData();
    window.setTimeout(() => {
      suppressGeneratedItemClickRef.current = false;
    }, 0);
  }, []);

  const contentWidthStyle = fillContainer
    ? undefined
    : ({ width: sidebarWidth, transition: isResizingRef.current ? 'none' : 'width 200ms' } as const);
  const innerWidthStyle = fillContainer ? undefined : { width: sidebarWidth };

  return (
    <div
      className={`flex h-full min-h-0 w-full ${fillContainer ? 'min-w-0 flex-1' : 'flex-shrink-0'}`}
    >
      {/* Vertical Category Bar — stretch to full tools column height (see sketch: rail fills parent). */}
      <div
        className="panel-header flex h-full min-h-0 flex-shrink-0 flex-col items-center self-stretch border-r border-border"
        style={{ width: EDITOR_LAYOUT_CSS_VALUES.sidebarRailWidth }}
      >
        {/* Header row - aligned with content panel header */}
        <div
          className="flex items-center justify-center border-b border-border w-full"
          style={{ height: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderHeight }}
        >
          <button
            onClick={toggleLeftSidebar}
            className="rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            style={{ width: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderButtonSize, height: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderButtonSize }}
            data-tooltip={leftSidebarOpen ? 'Collapse Panel' : 'Expand Panel'}
            data-tooltip-side="right"
          >
            {leftSidebarOpen ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Category Icons */}
        <div className="flex flex-col gap-1 py-1.5">
          {categories.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                if (activeTab === id && leftSidebarOpen) {
                  toggleLeftSidebar();
                } else {
                  setActiveTab(id);
                  if (!leftSidebarOpen) toggleLeftSidebar();
                  if (id === 'effects') triggerPreviews();
                }
              }}
              className={`
                w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${activeTab === id && leftSidebarOpen
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }
              `}
              data-tooltip={label}
              data-tooltip-side="right"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-6 border-t border-border mx-auto my-0.5" />

          <button
            onClick={toggleKeyframeEditorOpen}
            className={`
              w-9 h-9 rounded-lg flex items-center justify-center transition-all
              ${keyframeEditorOpen
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }
            `}
            data-tooltip={keyframeEditorOpen ? 'Hide Keyframe Editor' : 'Keyframe Editor'}
            data-tooltip-side="right"
            aria-label={keyframeEditorOpen ? 'Hide keyframe editor' : 'Show keyframe editor'}
          >
            <LineChart className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Panel — match PropertiesSidebar: explicit h-full so panel-bg + border-r span the full column (not content height only). */}
      <div
        className={`panel-bg border-r border-border overflow-hidden relative h-full min-h-0 ${
          leftSidebarOpen
            ? fillContainer
              ? 'flex flex-1 min-w-0 w-full flex-col'
              : 'flex w-full flex-col'
            : ''
        }`}
        style={leftSidebarOpen ? contentWidthStyle : { transition: 'width 200ms' }}
      >
        {/* Use Activity for React 19 performance optimization - defers updates when hidden */}
        <Activity mode={leftSidebarOpen ? 'visible' : 'hidden'}>
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col w-full" style={innerWidthStyle}>
          <div
            className={
              keyframeEditorOpen
                ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
                : 'contents'
            }
          >
            <KeyframeGraphPanel
              isOpen={keyframeEditorOpen}
              onToggle={toggleKeyframeEditorOpen}
              onClose={() => setKeyframeEditorOpen(false)}
              placement="top"
            />
          </div>

          {!keyframeEditorOpen && (
            <>
          {/* Panel Header — sits with the tab content, below the keyframe editor */}
          <div
            className="flex items-center justify-between px-3 border-b border-border flex-shrink-0"
            style={{ height: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderHeight }}
          >
            <span className="text-sm font-medium text-foreground">
              {categories.find((c) => c.id === activeTab)?.label}
            </span>
            {!fillContainer && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                style={{ width: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderButtonSize, height: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderButtonSize }}
                onClick={toggleMediaFullColumn}
                data-tooltip={mediaFullColumn ? 'Dock to preview' : 'Expand full column'}
                data-tooltip-side="bottom"
              >
                {mediaFullColumn ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>

          {/* Media Tab - Full Media Library */}
          <div className={`min-h-0 flex-1 overflow-hidden ${activeTab === 'media' ? 'block' : 'hidden'}`}>
            <MediaLibrary />
          </div>

          {/* Text Tab */}
          <div className={`${SCROLL_TAB_PANEL_CLASS} ${activeTab === 'text' ? 'block' : 'hidden'}`}>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Plain text</p>
                <button
                  type="button"
                  draggable={true}
                  onDragStart={handleTemplateDragStart({
                    itemType: 'text',
                    label: PLAIN_PRESET.label,
                    stylePresetId: PLAIN_PRESET.id,
                  })}
                  onDragEnd={handleTemplateDragEnd}
                  onClick={() => {
                    if (shouldSuppressGeneratedItemClick()) return;
                    handleAddText();
                  }}
                  className="w-full rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors overflow-hidden text-left"
                >
                  <div
                    className="flex min-h-[72px] items-center justify-center px-3 py-4"
                    style={{ background: PLAIN_PRESET.cardBg }}
                  >
                    <span style={PLAIN_PRESET.previewStyle}>Text</span>
                  </div>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Text styles</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TEXT_STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      draggable={true}
                      onDragStart={handleTemplateDragStart({
                        itemType: 'text',
                        label: preset.label,
                        stylePresetId: preset.id,
                      })}
                      onDragEnd={handleTemplateDragEnd}
                      onClick={() => {
                        if (shouldSuppressGeneratedItemClick()) return;
                        handleAddStyledText(preset);
                      }}
                      className="flex flex-col rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-colors overflow-hidden text-center"
                    >
                      <div
                        className="flex min-h-[56px] items-center justify-center px-1.5 py-2"
                        style={{ background: preset.cardBg }}
                      >
                        <span style={preset.previewStyle}>Text</span>
                      </div>
                      <span className="text-[10px] leading-tight text-muted-foreground px-1 py-1.5 truncate">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shapes Tab */}
          <div className={`${SCROLL_TAB_PANEL_CLASS} ${activeTab === 'shapes' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-3 gap-1.5">
                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Rectangle', shapeType: 'rectangle' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('rectangle');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Square className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Rectangle
                    </span>
                  </button>

                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Circle', shapeType: 'circle' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('circle');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Circle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Circle
                    </span>
                  </button>

                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Triangle', shapeType: 'triangle' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('triangle');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Triangle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Triangle
                    </span>
                  </button>

                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Ellipse', shapeType: 'ellipse' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('ellipse');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Circle className="w-3.5 h-2.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Ellipse
                    </span>
                  </button>

                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Star', shapeType: 'star' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('star');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Star className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Star
                    </span>
                  </button>

                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Polygon', shapeType: 'polygon' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('polygon');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Hexagon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Polygon
                    </span>
                  </button>

                  <button
                    draggable={true}
                    onDragStart={handleTemplateDragStart({ itemType: 'shape', label: 'Heart', shapeType: 'heart' })}
                    onDragEnd={handleTemplateDragEnd}
                    onClick={() => {
                      if (shouldSuppressGeneratedItemClick()) return;
                      handleAddShape('heart');
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Heart className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Heart
                    </span>
                  </button>

                  <button
                    onClick={() => useMaskEditorStore.getState().startShapePenMode()}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                    title="Draw a custom shape mask with the pen tool"
                  >
                    <div className="w-7 h-7 rounded border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70">
                      <Pen className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                      Pen
                    </span>
                  </button>
            </div>
          </div>

          {/* Effects Tab */}
          <div className={`${SCROLL_TAB_PANEL_CLASS} ${activeTab === 'effects' ? 'block' : 'hidden'}`}>
            <div className="space-y-3">
              {/* Blank Adjustment Layer */}
              <button
                draggable={true}
                onDragStart={handleTemplateDragStart({ itemType: 'adjustment', label: 'Adjustment Layer' })}
                onDragEnd={handleTemplateDragEnd}
                onClick={() => {
                  if (shouldSuppressGeneratedItemClick()) return;
                  handleAddAdjustmentLayer();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md border border-border bg-secondary/50 flex items-center justify-center group-hover:bg-secondary/70 flex-shrink-0">
                  <Layers className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground group-hover:text-foreground">
                    Blank Adjustment Layer
                  </div>
                </div>
              </button>

              {/* Presets */}
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Presets
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {EFFECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      draggable={true}
                      onDragStart={handleTemplateDragStart({
                        itemType: 'adjustment',
                        label: preset.name,
                        effects: preset.effects,
                      })}
                      onDragEnd={handleTemplateDragEnd}
                      onClick={() => {
                        if (shouldSuppressGeneratedItemClick()) return;
                        handleAddPreset(preset.id);
                      }}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-md border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                    >
                      {effectPreviews.has(`preset:${preset.id}`) ? (
                        <img
                          src={effectPreviews.get(`preset:${preset.id}`)}
                          alt=""
                          draggable={false}
                          className="w-full aspect-video rounded-sm object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-video rounded-sm bg-muted flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      )}
                      <span className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* GPU Effects by Category */}
              {gpuCategories.map(({ category, effects: catEffects }) => (
                <div key={category}>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    {category}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {catEffects.map((def) => (
                      <button
                        key={def.id}
                        draggable={true}
                        onDragStart={handleTemplateDragStart({
                          itemType: 'adjustment',
                          label: def.name,
                          effects: [{
                            type: 'gpu-effect',
                            gpuEffectType: def.id,
                            params: getGpuEffectDefaultParams(def.id),
                          }],
                        })}
                        onDragEnd={handleTemplateDragEnd}
                        onClick={() => {
                          if (shouldSuppressGeneratedItemClick()) return;
                          handleAddGpuEffect(def.id);
                        }}
                        className="flex flex-col items-center gap-1 p-1.5 rounded-md border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors group"
                      >
                        {effectPreviews.has(def.id) ? (
                          <img
                            src={effectPreviews.get(def.id)}
                            alt=""
                            draggable={false}
                            className="w-full aspect-video rounded-sm object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-video rounded-sm bg-muted" />
                        )}
                        <span className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-full">
                          {def.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transitions Tab */}
          <div className={`min-h-0 flex-1 overflow-hidden ${activeTab === 'transitions' ? 'block' : 'hidden'}`}>
            <TransitionsPanel />
          </div>

          {/* AI Tab */}
          <div className={`${SCROLL_TAB_PANEL_CLASS} ${activeTab === 'ai' ? 'block' : 'hidden'}`}>
            <AiPanel />
          </div>
            </>
          )}
          </div>
        </Activity>
        {/* Resize Handle */}
        {leftSidebarOpen && !fillContainer && (
          <div
            data-resize-handle
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary/50 transition-colors z-10"
          />
        )}
      </div>
    </div>
  );
});
