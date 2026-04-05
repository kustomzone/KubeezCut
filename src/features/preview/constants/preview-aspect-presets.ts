/**
 * Three frame aspect families used across social / web (TikTok, Instagram, YouTube, Facebook, etc.).
 * Each maps to a standard working resolution at that aspect.
 */
export type PreviewAspectKind = 'horizontal' | 'vertical' | 'square';

export interface PreviewAspectPreset {
  id: PreviewAspectKind;
  /** Short UI label */
  label: string;
  /** e.g. "16∶9" */
  ratioLabel: string;
  width: number;
  height: number;
  /** Where this format is commonly used */
  platforms: string;
}

export const PREVIEW_ASPECT_PRESETS: readonly PreviewAspectPreset[] = [
  {
    id: 'square',
    label: 'Square',
    ratioLabel: '1∶1',
    width: 1080,
    height: 1080,
    platforms: 'Instagram & Facebook feed (square)',
  },
  {
    id: 'vertical',
    label: 'Vertical',
    ratioLabel: '9∶16',
    width: 1080,
    height: 1920,
    platforms: 'TikTok, Instagram Reels, YouTube Shorts',
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    ratioLabel: '16∶9',
    width: 1920,
    height: 1080,
    platforms: 'YouTube, Facebook landscape, X',
  },
] as const;

const ASPECT_EPS = 0.02;

/** Classify current frame dimensions into one of the three aspect families. */
export function getPreviewAspectKind(width: number, height: number): PreviewAspectKind {
  if (width <= 0 || height <= 0) return 'horizontal';
  const r = width / height;
  if (Math.abs(r - 1) < ASPECT_EPS) return 'square';
  if (r > 1) return 'horizontal';
  return 'vertical';
}
