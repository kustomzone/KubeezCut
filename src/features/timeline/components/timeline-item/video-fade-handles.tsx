import { memo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/ui/cn';
import { getAudioFadeHandleLeft, type AudioFadeHandle } from '../../utils/audio-fade';

interface VideoFadeHandlesProps {
  trackLocked: boolean;
  activeTool: string;
  clipWidth: number;
  lineYPercent: number;
  fadeInPixels: number;
  fadeOutPixels: number;
  isSelected: boolean;
  isEditing: boolean;
  fadeInLabel?: string;
  fadeOutLabel?: string;
  onFadeHandleMouseDown: (e: React.MouseEvent, handle: AudioFadeHandle) => void;
  onFadeHandleDoubleClick: (handle: AudioFadeHandle) => void;
}

function FadeTooltip({
  anchorRect,
  label,
}: {
  anchorRect: DOMRect | null;
  label: string;
}) {
  if (!anchorRect) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg whitespace-nowrap"
      style={{
        left: anchorRect.left + anchorRect.width / 2,
        top: anchorRect.top - 4,
      }}
    >
      {label}
    </div>,
    document.body
  );
}

export const VideoFadeHandles = memo(function VideoFadeHandles({
  trackLocked,
  activeTool,
  clipWidth,
  lineYPercent,
  fadeInPixels,
  fadeOutPixels,
  isSelected,
  isEditing,
  fadeInLabel,
  fadeOutLabel,
  onFadeHandleMouseDown,
  onFadeHandleDoubleClick,
}: VideoFadeHandlesProps) {
  void lineYPercent; // now positioned via portal tooltip; kept in props for API stability
  const [hoveredHandle, setHoveredHandle] = useState<AudioFadeHandle | null>(null);
  const fadeInRef = useRef<HTMLButtonElement>(null);
  const fadeOutRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!hoveredHandle) { setAnchorRect(null); return; }
    const el = hoveredHandle === 'in' ? fadeInRef.current : fadeOutRef.current;
    if (el) setAnchorRect(el.getBoundingClientRect());
  }, [hoveredHandle, fadeInPixels, fadeOutPixels, clipWidth]);

  if (trackLocked || activeTool !== 'select') {
    return null;
  }

  // Only show fade handles when the clip is actually selected (or being edited).
  // Previously they showed on hover too, which blocked clicks on small clips.
  if (!isSelected && !isEditing) {
    return null;
  }

  const fadeInLeft = getAudioFadeHandleLeft({ handle: 'in', clipWidthPixels: clipWidth, fadePixels: fadeInPixels });
  const fadeOutLeft = getAudioFadeHandleLeft({ handle: 'out', clipWidthPixels: clipWidth, fadePixels: fadeOutPixels });
  const visibleLabel = hoveredHandle === 'in'
    ? fadeInLabel
    : hoveredHandle === 'out'
      ? fadeOutLabel
      : null;
  const handleTop = '-2px';

  const handleClassName = cn(
    'absolute h-2.5 w-2.5 -translate-x-1/2 rounded-[2px] border pointer-events-auto transition-opacity cursor-ew-resize touch-none focus-visible:outline-none',
    'border-slate-950/70 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.25)]',
    'after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-l-[3px] after:border-r-[3px] after:border-t-[4px] after:border-l-transparent after:border-r-transparent after:border-t-white/90',
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <button
        ref={fadeInRef}
        type="button"
        className={handleClassName}
        style={{ left: `${fadeInLeft}px`, top: handleTop }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => onFadeHandleMouseDown(e, 'in')}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFadeHandleDoubleClick('in');
        }}
        onMouseEnter={() => setHoveredHandle('in')}
        onMouseLeave={() => setHoveredHandle((current) => (current === 'in' ? null : current))}
        aria-label="Adjust video fade in"
      />
      <button
        ref={fadeOutRef}
        type="button"
        className={handleClassName}
        style={{ left: `${fadeOutLeft}px`, top: handleTop }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => onFadeHandleMouseDown(e, 'out')}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFadeHandleDoubleClick('out');
        }}
        onMouseEnter={() => setHoveredHandle('out')}
        onMouseLeave={() => setHoveredHandle((current) => (current === 'out' ? null : current))}
        aria-label="Adjust video fade out"
      />

      {hoveredHandle && visibleLabel && (
        <FadeTooltip anchorRect={anchorRect} label={visibleLabel} />
      )}
    </div>
  );
});
