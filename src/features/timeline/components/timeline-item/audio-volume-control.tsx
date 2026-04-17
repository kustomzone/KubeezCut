import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const AUDIO_VOLUME_HOVER_ARM_DELAY_MS = 180;

interface AudioVolumeControlProps {
  trackLocked: boolean;
  activeTool: string;
  lineYPercent: number;
  isEditing: boolean;
  editLabel?: string | null;
  /** When set during drag, show the dB tooltip at the pointer (portaled to `document.body` so clip `contain` / transforms don't clip it). */
  editLabelViewport?: { clientX: number; clientY: number } | null;
  onVolumeMouseDown: (e: React.MouseEvent) => void;
  onVolumeDoubleClick: () => void;
}

export const AudioVolumeControl = memo(function AudioVolumeControl({
  trackLocked,
  activeTool,
  lineYPercent,
  isEditing,
  editLabel,
  editLabelViewport,
  onVolumeMouseDown,
  onVolumeDoubleClick,
}: AudioVolumeControlProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverArmed, setIsHoverArmed] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setIsHoverArmed(true);
      return;
    }

    if (!isHovered) {
      setIsHoverArmed(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsHoverArmed(true);
    }, AUDIO_VOLUME_HOVER_ARM_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEditing, isHovered]);

  const isDragEnabled = isEditing || isHoverArmed;

  if (trackLocked || activeTool !== 'select') {
    return null;
  }

  return (
    <div className="absolute inset-x-0 inset-y-0 pointer-events-none z-30">
      <button
        type="button"
        className={`absolute left-0 right-0 h-2 -translate-y-1/2 pointer-events-auto touch-none ${isDragEnabled ? 'cursor-ns-resize' : 'cursor-default'}`}
        style={{ top: `var(--timeline-audio-volume-line-y, ${lineYPercent}%)` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          if (!isDragEnabled) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          if (!isDragEnabled) {
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          onVolumeMouseDown(e);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          // Fire even when not hover-armed — double-click should always reset to 0 dB,
          // otherwise users have to pre-hover for 180ms which feels broken.
          onVolumeDoubleClick();
        }}
        tabIndex={-1}
        aria-label="Adjust clip volume"
      />

      {isEditing &&
        editLabel &&
        (editLabelViewport ? (
          createPortal(
            <div
              className="pointer-events-none fixed z-[9999] rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg whitespace-nowrap"
              style={{
                left: editLabelViewport.clientX,
                top: editLabelViewport.clientY,
                transform: 'translate(-50%, calc(-100% - 8px))',
              }}
            >
              {editLabel}
            </div>,
            document.body
          )
        ) : (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg whitespace-nowrap"
            style={{ top: `calc(var(--timeline-audio-volume-line-y, ${lineYPercent}%) - 10px)` }}
          >
            {editLabel}
          </div>
        ))}
    </div>
  );
});
