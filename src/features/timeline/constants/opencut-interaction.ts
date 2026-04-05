/**
 * Interaction values aligned with OpenCut’s timeline
 * (`OpenCut/apps/web/src/components/editor/panels/timeline/interaction.ts`).
 * Keeps wheel zoom / pan feel consistent with that reference.
 */

/** Max pixels applied per wheel tick when scrolling the timeline horizontally */
export const TIMELINE_HORIZONTAL_WHEEL_STEP_PX = 40;

/** OpenCut clamps pinch-zoom delta per frame before exp() scaling */
export const TIMELINE_ZOOM_WHEEL_DELTA_CAP = 30;

/** Denominator for exp(-delta / divisor) pinch-zoom (OpenCut uses 300) */
export const TIMELINE_ZOOM_WHEEL_EXP_DIVISOR = 300;
