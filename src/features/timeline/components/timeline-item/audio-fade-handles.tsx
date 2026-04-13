import { memo, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/ui/cn';
import { getAudioFadeHandleLeft } from '../../utils/audio-fade';

function FadeTooltip({ anchorRect, label }: { anchorRect: DOMRect | null; label: string }) {
  if (!anchorRect) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg whitespace-nowrap"
      style={{ left: anchorRect.left + anchorRect.width / 2, top: anchorRect.top - 4 }}
    >
      {label}
    </div>,
    document.body
  );
}

interface AudioFadeHandlesProps {
  trackLocked: boolean;
  activeTool: string;
  clipWidth: number;
  lineYPercent: number;
  fadeInPixels: number;
  fadeOutPixels: number;
  isSelected: boolean;
  isEditing: boolean;
  curveEditingHandle: 'in' | 'out' | null;
  fadeInLabel?: string;
  fadeOutLabel?: string;
  fadeInCurveDot?: { x: number; yPercent: number } | null;
  fadeOutCurveDot?: { x: number; yPercent: number } | null;
  onFadeHandleMouseDown: (e: React.MouseEvent, handle: 'in' | 'out') => void;
  onFadeHandleDoubleClick: (handle: 'in' | 'out') => void;
  onFadeCurveDotMouseDown: (e: React.MouseEvent, handle: 'in' | 'out') => void;
  onFadeCurveDotDoubleClick: (handle: 'in' | 'out') => void;
}

export const AudioFadeHandles = memo(function AudioFadeHandles({
  trackLocked,
  activeTool,
  clipWidth,
  lineYPercent,
  fadeInPixels,
  fadeOutPixels,
  isSelected,
  isEditing,
  curveEditingHandle,
  fadeInLabel,
  fadeOutLabel,
  fadeInCurveDot,
  fadeOutCurveDot,
  onFadeHandleMouseDown,
  onFadeHandleDoubleClick,
  onFadeCurveDotMouseDown,
  onFadeCurveDotDoubleClick,
}: AudioFadeHandlesProps) {
  void lineYPercent; // now positioned via portal tooltip; kept in props for API stability
  const [hoveredHandle, setHoveredHandle] = useState<'in' | 'out' | null>(null);
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

  // Only render when the clip is actually selected/editing. Prevents the fade handles
  // from blocking clicks on small (unselected) clips at low zoom.
  if (!isSelected && !isEditing) {
    return null;
  }

  const fadeInLeft = getAudioFadeHandleLeft({ handle: 'in', clipWidthPixels: clipWidth, fadePixels: fadeInPixels });
  const fadeOutLeft = getAudioFadeHandleLeft({ handle: 'out', clipWidthPixels: clipWidth, fadePixels: fadeOutPixels });
  const visibleLabelHandle = hoveredHandle;
  const visibleLabel = hoveredHandle === 'in'
    ? fadeInLabel
    : hoveredHandle === 'out'
    ? fadeOutLabel
    : null;
  const handleTop = '-2px';

  const getHandleClassName = () => {
    return cn(
      'absolute h-2.5 w-2.5 -translate-x-1/2 rounded-[2px] border pointer-events-auto transition-opacity cursor-ew-resize touch-none focus-visible:outline-none',
      'border-slate-950/70 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.25)]',
      'after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-l-[3px] after:border-r-[3px] after:border-t-[4px] after:border-l-transparent after:border-r-transparent after:border-t-white/90',
    );
  };

  const getCurveDotClassName = (handle: 'in' | 'out') => {
    const isActive = curveEditingHandle === handle || hoveredHandle === handle;

    return cn(
      'absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 shadow-[0_0_0_1px_rgba(15,23,42,0.2)] transition-opacity pointer-events-auto cursor-move touch-none focus-visible:outline-none',
      isActive ? 'bg-primary opacity-100' : 'bg-primary/90',
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <button
        ref={fadeInRef}
        type="button"
        className={getHandleClassName()}
        style={{ left: `${fadeInLeft}px`, top: handleTop }}
        onMouseDown={(e) => onFadeHandleMouseDown(e, 'in')}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFadeHandleDoubleClick('in');
        }}
        onMouseEnter={() => setHoveredHandle('in')}
        onMouseLeave={() => setHoveredHandle((current) => (current === 'in' ? null : current))}
        aria-label="Adjust audio fade in"
      />
      <button
        ref={fadeOutRef}
        type="button"
        className={getHandleClassName()}
        style={{ left: `${fadeOutLeft}px`, top: handleTop }}
        onMouseDown={(e) => onFadeHandleMouseDown(e, 'out')}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFadeHandleDoubleClick('out');
        }}
        onMouseEnter={() => setHoveredHandle('out')}
        onMouseLeave={() => setHoveredHandle((current) => (current === 'out' ? null : current))}
        aria-label="Adjust audio fade out"
      />

      {fadeInCurveDot && (
        <button
          type="button"
          className={getCurveDotClassName('in')}
          style={{ left: `${fadeInCurveDot.x}px`, top: `${fadeInCurveDot.yPercent}%` }}
          onMouseDown={(e) => onFadeCurveDotMouseDown(e, 'in')}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFadeCurveDotDoubleClick('in');
          }}
          onMouseEnter={() => setHoveredHandle(null)}
          onMouseLeave={() => setHoveredHandle((current) => (current === 'in' ? null : current))}
          aria-label="Adjust audio fade in curve"
        />
      )}
      {fadeOutCurveDot && (
        <button
          type="button"
          className={getCurveDotClassName('out')}
          style={{ left: `${fadeOutCurveDot.x}px`, top: `${fadeOutCurveDot.yPercent}%` }}
          onMouseDown={(e) => onFadeCurveDotMouseDown(e, 'out')}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFadeCurveDotDoubleClick('out');
          }}
          onMouseEnter={() => setHoveredHandle(null)}
          onMouseLeave={() => setHoveredHandle((current) => (current === 'out' ? null : current))}
          aria-label="Adjust audio fade out curve"
        />
      )}

      {visibleLabelHandle && visibleLabel && (
        <FadeTooltip anchorRect={anchorRect} label={visibleLabel} />
      )}
    </div>
  );
});
