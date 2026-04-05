import { useRef, useEffect, useCallback, useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ZoomIn,
  ZoomOut,
  Magnet,
  Scissors,
  MousePointer2,
  Flag,
  Link2,
  Gauge,
  Activity,
  Snowflake,
  Loader2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatHotkeyBinding } from '@/config/hotkeys';
import { useTimelineZoom } from '../hooks/use-timeline-zoom';
import { useTimelineStore } from '../stores/timeline-store';
import { usePlaybackStore } from '@/shared/state/playback';
import { useEditorStore } from '@/shared/state/editor';
import { useSelectionStore } from '@/shared/state/selection';
import {
  ZOOM_FRICTION,
  ZOOM_MIN_VELOCITY,
  ZOOM_MIN,
  ZOOM_MAX,
} from '../constants';
import { EDITOR_LAYOUT_CSS_VALUES } from '@/shared/ui/editor-layout';
import { useResolvedHotkeys } from '@/features/timeline/deps/settings';
import { freezeFrameAtPlayhead } from '../utils/freeze-frame';

export interface TimelineHeaderProps {
  onZoomChange?: (newZoom: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  /** Preview color scopes (waveform / vectorscope) panel */
  isScopesPanelOpen?: boolean;
  onToggleScopesPanel?: () => void;
}

/**
 * Minimal timeline toolbar (OpenCut-style): core tools, snap, link, zoom.
 * Advanced actions remain on keyboard shortcuts / shortcuts dialog.
 */
export const TimelineHeader = memo(function TimelineHeader({
  onZoomChange,
  onZoomIn,
  onZoomOut,
  isScopesPanelOpen = false,
  onToggleScopesPanel,
}: TimelineHeaderProps) {
  const hotkeys = useResolvedHotkeys();
  const { zoomLevel, zoomIn, zoomOut, setZoom } = useTimelineZoom();
  const snapEnabled = useTimelineStore((s) => s.snapEnabled);
  const toggleSnap = useTimelineStore((s) => s.toggleSnap);
  const addMarker = useTimelineStore((s) => s.addMarker);
  const activeTool = useSelectionStore((s) => s.activeTool);
  const setActiveTool = useSelectionStore((s) => s.setActiveTool);
  const linkedSelectionEnabled = useEditorStore((s) => s.linkedSelectionEnabled);
  const setLinkedSelectionEnabled = useEditorStore((s) => s.setLinkedSelectionEnabled);

  const btnSize = { width: EDITOR_LAYOUT_CSS_VALUES.toolbarButtonSize, height: EDITOR_LAYOUT_CSS_VALUES.toolbarButtonSize } as const;

  const zoomVelocityRef = useRef(0);
  const lastZoomValueRef = useRef(zoomLevel);
  const lastZoomTimeRef = useRef(0);
  const momentumIdRef = useRef<number | null>(null);
  const sliderRafIdRef = useRef<number | null>(null);
  const queuedSliderZoomRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const [freezeBusy, setFreezeBusy] = useState(false);
  const handleFreezeFrame = useCallback(async () => {
    if (freezeBusy) return;
    setFreezeBusy(true);
    try {
      await freezeFrameAtPlayhead();
    } finally {
      setFreezeBusy(false);
    }
  }, [freezeBusy]);

  const applyZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    if (onZoomChange) {
      onZoomChange(clampedZoom);
    } else {
      setZoom(clampedZoom);
    }
    return clampedZoom;
  }, [onZoomChange, setZoom]);

  const startZoomMomentum = useCallback(() => {
    if (momentumIdRef.current !== null) {
      cancelAnimationFrame(momentumIdRef.current);
    }

    const momentumLoop = () => {
      if (Math.abs(zoomVelocityRef.current) > ZOOM_MIN_VELOCITY) {
        const newZoom = zoomLevelRef.current + zoomVelocityRef.current;
        const clampedZoom = applyZoom(newZoom);

        if (clampedZoom <= ZOOM_MIN || clampedZoom >= ZOOM_MAX) {
          zoomVelocityRef.current = 0;
          momentumIdRef.current = null;
          return;
        }

        zoomVelocityRef.current *= ZOOM_FRICTION;
        momentumIdRef.current = requestAnimationFrame(momentumLoop);
      } else {
        zoomVelocityRef.current = 0;
        momentumIdRef.current = null;
      }
    };

    momentumIdRef.current = requestAnimationFrame(momentumLoop);
  }, [applyZoom]);

  const sliderToZoom = useCallback((sliderValue: number) => {
    return ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, sliderValue);
  }, []);

  const zoomToSlider = useCallback((zoom: number) => {
    return Math.log(zoom / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);
  }, []);

  const handleSliderChange = useCallback((values: number[]) => {
    const sliderValue = values[0] ?? 0.5;
    const newZoom = sliderToZoom(sliderValue);
    const now = performance.now();
    const timeDelta = now - lastZoomTimeRef.current;

    if (timeDelta > 0 && timeDelta < 100) {
      const valueDelta = newZoom - lastZoomValueRef.current;
      zoomVelocityRef.current = (valueDelta / timeDelta) * 16;
    }

    lastZoomValueRef.current = newZoom;
    lastZoomTimeRef.current = now;
    isDraggingRef.current = true;
    queuedSliderZoomRef.current = newZoom;
    if (sliderRafIdRef.current === null) {
      sliderRafIdRef.current = requestAnimationFrame(() => {
        sliderRafIdRef.current = null;
        const queuedZoom = queuedSliderZoomRef.current;
        if (queuedZoom !== null) {
          applyZoom(queuedZoom);
        }
      });
    }
  }, [applyZoom, sliderToZoom]);

  const handleSliderCommit = useCallback(() => {
    isDraggingRef.current = false;
    if (sliderRafIdRef.current !== null) {
      cancelAnimationFrame(sliderRafIdRef.current);
      sliderRafIdRef.current = null;
    }
    if (queuedSliderZoomRef.current !== null) {
      applyZoom(queuedSliderZoomRef.current);
      queuedSliderZoomRef.current = null;
    }
    if (Math.abs(zoomVelocityRef.current) > ZOOM_MIN_VELOCITY) {
      startZoomMomentum();
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [applyZoom, startZoomMomentum]);

  useEffect(() => {
    return () => {
      if (momentumIdRef.current !== null) {
        cancelAnimationFrame(momentumIdRef.current);
      }
      if (sliderRafIdRef.current !== null) {
        cancelAnimationFrame(sliderRafIdRef.current);
      }
    };
  }, []);

  return (
    <div
      className="scrollbar-hidden flex shrink-0 items-center justify-between border-b border-border px-2 py-0.5"
      style={{ height: EDITOR_LAYOUT_CSS_VALUES.timelineHeaderHeight }}
      role="toolbar"
      aria-label="Timeline controls"
    >
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          className={activeTool === 'select' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          onClick={() => setActiveTool('select')}
          aria-label="Select tool"
          data-tooltip="Select Tool (V)"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          className={activeTool === 'razor' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          onClick={() => setActiveTool(activeTool === 'razor' ? 'select' : 'razor')}
          aria-label="Razor tool"
          data-tooltip="Razor Tool (C)"
        >
          <Scissors className="w-3.5 h-3.5 -rotate-90" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          className={activeTool === 'rate-stretch' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          onClick={() => setActiveTool(activeTool === 'rate-stretch' ? 'select' : 'rate-stretch')}
          aria-label="Rate stretch tool"
          data-tooltip={`Rate stretch (${formatHotkeyBinding(hotkeys.RATE_STRETCH_TOOL)})`}
        >
          <Gauge className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-4" />

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          onClick={() => addMarker(usePlaybackStore.getState().currentFrame)}
          aria-label="Add marker"
          data-tooltip="Add Marker (M)"
        >
          <Flag className="w-3.5 h-3.5" style={{ color: 'var(--color-timeline-marker)' }} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          disabled={freezeBusy}
          onClick={() => {
            void handleFreezeFrame();
          }}
          aria-label="Freeze frame"
          data-tooltip="Freeze Frame — capture current frame, split clip, insert still (≈1s)"
        >
          {freezeBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Snowflake className="w-3.5 h-3.5" />
          )}
        </Button>

        <Separator orientation="vertical" className="mx-1 h-4" />

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          className={snapEnabled ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          onClick={toggleSnap}
          aria-label={snapEnabled ? 'Disable snapping' : 'Enable snapping'}
          data-tooltip={snapEnabled ? 'Snap on' : 'Snap off'}
        >
          <Magnet className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          className={linkedSelectionEnabled ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          onClick={() => setLinkedSelectionEnabled(!linkedSelectionEnabled)}
          aria-label={linkedSelectionEnabled ? 'Disable linked selection' : 'Enable linked selection'}
          aria-pressed={linkedSelectionEnabled}
          data-tooltip={`${linkedSelectionEnabled ? 'Linked selection on' : 'Linked selection off'} (${formatHotkeyBinding(hotkeys.TOGGLE_LINKED_SELECTION)})`}
        >
          <Link2 className="w-3.5 h-3.5" />
        </Button>

        {onToggleScopesPanel && (
          <Button
            variant="ghost"
            size="icon"
            style={btnSize}
            className={isScopesPanelOpen ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
            onClick={onToggleScopesPanel}
            aria-label={isScopesPanelOpen ? 'Hide color scopes' : 'Show color scopes'}
            aria-pressed={isScopesPanelOpen}
            data-tooltip={isScopesPanelOpen ? 'Hide color scopes' : 'Show color scopes'}
          >
            <Activity className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="min-w-0 flex-1" aria-hidden="true" />

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          onClick={() => {
            if (onZoomOut) {
              onZoomOut();
            } else {
              zoomOut();
            }
          }}
          aria-label="Zoom out"
          data-tooltip="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>

        <Slider
          value={[zoomToSlider(zoomLevel)]}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          min={0}
          max={1}
          step={0.005}
          className="w-24"
          aria-label="Timeline zoom"
        />

        <Button
          variant="ghost"
          size="icon"
          style={btnSize}
          onClick={() => {
            if (onZoomIn) {
              onZoomIn();
            } else {
              zoomIn();
            }
          }}
          aria-label="Zoom in"
          data-tooltip="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});
