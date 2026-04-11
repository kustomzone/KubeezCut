import type { CSSProperties } from 'react';
import type { TextItem } from '@/types/timeline';

/**
 * Catalog of Clipchamp-style text presets for the Text sidebar and timeline template drops.
 * Preview styles are CSS-only; item overrides map to existing `TextItem` fields.
 */
export type TextStylePreset = {
  id: string;
  label: string;
  /** Styles for the mini preview label inside each card */
  previewStyle: CSSProperties;
  /** Card background behind the preview */
  cardBg: string;
  getItemOverrides: () => Partial<TextItem>;
};

const CHECKER_BG =
  'repeating-conic-gradient(#2a2a2a 0% 25%, #1f1f1f 0% 50%) 50% / 16px 16px';

/** Plain text — default typography, no effects */
export const PLAIN_PRESET: TextStylePreset = {
  id: 'plain',
  label: 'Plain text',
  cardBg: '#0a0a0a',
  previewStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 700,
    color: '#ffffff',
    fontSize: 18,
  },
  getItemOverrides: (): Partial<TextItem> => ({
    label: 'Plain text',
    text: 'Your Text Here',
    fontFamily: 'Inter',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#ffffff',
    textShadow: undefined,
    stroke: undefined,
    backgroundColor: undefined,
    letterSpacing: 0,
  }),
};

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: 'bold-title',
    label: 'Bold Title',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 800,
      color: '#ffffff',
      fontSize: 17,
      textShadow: '3px 4px 8px rgba(0,0,0,0.85)',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Bold Title',
      text: 'Your Text Here',
      fontWeight: 'bold',
      color: '#ffffff',
      textShadow: {
        offsetX: 4,
        offsetY: 6,
        blur: 12,
        color: '#000000',
      },
      stroke: undefined,
    }),
  },
  {
    id: 'creator',
    label: 'Creator',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 900,
      color: '#ffffff',
      fontSize: 16,
      WebkitTextStroke: '2px #000000',
      paintOrder: 'stroke fill',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Creator',
      text: 'CREATOR',
      fontWeight: 'bold',
      color: '#ffffff',
      stroke: { width: 4, color: '#000000' },
      textShadow: undefined,
    }),
  },
  {
    id: 'text-box',
    label: 'Text box',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      color: '#ffffff',
      fontSize: 14,
      backgroundColor: 'rgba(0,0,0,0.75)',
      padding: '6px 10px',
      display: 'inline-block',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Text box',
      text: 'Your Text Here',
      fontWeight: 'semibold',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.75)',
      textAlign: 'center',
      verticalAlign: 'middle',
    }),
  },
  {
    id: 'neon',
    label: 'Neon',
    cardBg: '#050508',
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 700,
      color: '#00ffff',
      fontSize: 18,
      textShadow:
        '0 0 10px #00ffff, 0 0 20px rgba(0,255,255,0.6), 0 0 30px rgba(0,255,255,0.35)',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Neon',
      text: 'Neon',
      fontWeight: 'bold',
      color: '#00ffff',
      textShadow: {
        offsetX: 0,
        offsetY: 0,
        blur: 20,
        color: '#00ffff',
      },
      stroke: { width: 1, color: '#00ffff' },
    }),
  },
  {
    id: 'fire',
    label: 'Fire',
    cardBg: '#1a0804',
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 800,
      color: '#ff6600',
      fontSize: 17,
      textShadow: '2px 3px 0 #cc2200, 0 0 12px rgba(255,100,0,0.6)',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Fire',
      text: 'Fire',
      fontWeight: 'bold',
      color: '#ff6600',
      textShadow: {
        offsetX: 2,
        offsetY: 4,
        blur: 14,
        color: '#cc2200',
      },
      stroke: undefined,
    }),
  },
  {
    id: 'retro',
    label: 'Retro',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 900,
      color: '#ffe600',
      fontSize: 16,
      textShadow: '3px 3px 0 #000000',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Retro',
      text: 'RETRO',
      fontWeight: 'bold',
      color: '#FFE600',
      textShadow: {
        offsetX: 4,
        offsetY: 4,
        blur: 0,
        color: '#000000',
      },
      stroke: undefined,
    }),
  },
  {
    id: 'subtitle',
    label: 'Subtitle',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 500,
      color: '#ffffff',
      fontSize: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: '4px 8px',
      display: 'inline-block',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Subtitle',
      text: 'Subtitle text here',
      fontSize: 40,
      fontWeight: 'medium',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      verticalAlign: 'bottom',
      textAlign: 'center',
    }),
  },
  {
    id: 'outline',
    label: 'Outline',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 800,
      color: '#ffffff',
      fontSize: 16,
      WebkitTextStroke: '1.5px #ffffff',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Outline',
      text: 'Your Text Here',
      fontWeight: 'bold',
      color: '#ffffff',
      stroke: { width: 3, color: '#ffffff' },
      textShadow: undefined,
    }),
  },
  {
    id: 'gold',
    label: 'Gold',
    cardBg: '#0d0c08',
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 700,
      color: '#ffd700',
      fontSize: 16,
      WebkitTextStroke: '1px #b8860b',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Gold',
      text: 'Gold',
      fontWeight: 'semibold',
      color: '#FFD700',
      stroke: { width: 2, color: '#B8860B' },
      textShadow: {
        offsetX: 0,
        offsetY: 2,
        blur: 6,
        color: 'rgba(184, 134, 11, 0.5)',
      },
    }),
  },
  {
    id: 'glitch',
    label: 'Glitch',
    cardBg: '#080808',
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 800,
      color: '#ffffff',
      fontSize: 15,
      textShadow: '2px 0 0 #00ffff, -2px 0 0 #ff00ff',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Glitch',
      text: 'GLITCH',
      fontWeight: 'bold',
      color: '#ffffff',
      textShadow: {
        offsetX: 2,
        offsetY: 0,
        blur: 0,
        color: '#00ffff',
      },
      stroke: { width: 1, color: '#ff00ff' },
    }),
  },
  {
    id: 'italic',
    label: 'Italic',
    cardBg: CHECKER_BG,
    previewStyle: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontStyle: 'italic',
      fontWeight: 600,
      color: '#f3f4f6',
      fontSize: 16,
      textShadow: '1px 2px 4px rgba(0,0,0,0.55)',
    },
    getItemOverrides: (): Partial<TextItem> => ({
      label: 'Italic',
      text: 'Your Text Here',
      fontStyle: 'italic',
      fontWeight: 'normal',
      color: '#ffffff',
      textShadow: {
        offsetX: 1,
        offsetY: 2,
        blur: 6,
        color: 'rgba(100, 100, 100, 0.8)',
      },
      stroke: undefined,
    }),
  },
];

const PRESET_BY_ID: Map<string, TextStylePreset> = new Map(
  [[PLAIN_PRESET.id, PLAIN_PRESET], ...TEXT_STYLE_PRESETS.map((p) => [p.id, p] as const)],
);

/** Merge payload for `TextItem` when applying a preset by id (timeline template drop / programmatic). */
export function getTextStylePresetOverridesById(id: string): Partial<TextItem> | null {
  const preset = PRESET_BY_ID.get(id);
  return preset ? preset.getItemOverrides() : null;
}
