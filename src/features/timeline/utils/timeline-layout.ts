import { ZOOM_MAX, ZOOM_MIN } from '../constants';

export const TIMELINE_ZOOM_TO_FIT_RIGHT_PADDING_PX = 50;

const TIMELINE_RIGHT_SCROLL_ROOM_MIN_PX = 240;
const TIMELINE_RIGHT_SCROLL_ROOM_MAX_PX = 480;
const TIMELINE_RIGHT_SCROLL_ROOM_VIEWPORT_RATIO = 0.35;

interface TimelineWidthInput {
  contentWidth: number;
  viewportWidth: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Seconds of timeline to frame in view when using zoom-to-fit (short projects fit without scrolling). */
const ZOOM_TO_FIT_MAX_SECONDS = 30;

export function getZoomToFitLevel(containerWidth: number, contentDurationSeconds: number): number {
  const duration = Math.min(ZOOM_TO_FIT_MAX_SECONDS, Math.max(10, contentDurationSeconds));
  const targetWidth = Math.max(0, containerWidth - TIMELINE_ZOOM_TO_FIT_RIGHT_PADDING_PX);
  return clamp(targetWidth / (duration * 100), ZOOM_MIN, ZOOM_MAX);
}

export function getTimelineRightScrollRoom(viewportWidth: number): number {
  if (viewportWidth <= 0) {
    return TIMELINE_RIGHT_SCROLL_ROOM_MIN_PX;
  }

  return clamp(
    viewportWidth * TIMELINE_RIGHT_SCROLL_ROOM_VIEWPORT_RATIO,
    TIMELINE_RIGHT_SCROLL_ROOM_MIN_PX,
    TIMELINE_RIGHT_SCROLL_ROOM_MAX_PX
  );
}

export function getTimelineWidth({ contentWidth, viewportWidth }: TimelineWidthInput): number {
  if (viewportWidth <= 0) {
    return Math.max(0, contentWidth);
  }

  // When content already fits in the viewport, do not add trailing scroll room — avoids a redundant
  // horizontal scrollbar for typical 0–30s edits. Extra room only applies once content exceeds width.
  if (contentWidth <= viewportWidth) {
    return viewportWidth;
  }

  return Math.max(viewportWidth, contentWidth + getTimelineRightScrollRoom(viewportWidth));
}
