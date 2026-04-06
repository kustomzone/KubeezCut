/**
 * Video aspect ratio options for the generate dialog, aligned with KubeezWebsite
 * `ModelSettings.tsx` / `modelDefaults.ts` behavior (explicit ratios + Veo Auto = omit on wire).
 */
import {
  findRegistryEntryForModelId,
  parseKling30Variant,
  parseVeo31Variant,
  type KubeezVeo31Mode,
} from './model-family-registry';

/** Same ordering as website `SEEDANCE_15_PRO_ASPECT_RATIOS` (common API values). */
export const SEEDANCE_15_PRO_ASPECT_RATIOS = [
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
  '21:9',
] as const;

export type VideoAspectUiWireValue = string;
/** Veo "Auto" — omit `aspect_ratio` on POST. */
export type VideoAspectUiChoice = VideoAspectUiWireValue | 'auto';

export type VideoAspectUiOption = {
  value: VideoAspectUiChoice;
  label: string;
};

export type VideoAspectUiResult = {
  options: VideoAspectUiOption[];
  /** Dialog state / optional `KubeezModelSettings.videoAspectRatio`; use `'auto'` for Veo Auto. */
  defaultValue: VideoAspectUiChoice;
  /** When true, only 16:9 is valid (Veo reference-to-video). */
  force16x9?: boolean;
};

function veoModeFromModelId(modelId: string): KubeezVeo31Mode | undefined {
  return parseVeo31Variant(modelId)?.mode;
}

/**
 * Returns aspect UI config for a resolved video `model_id`, or `null` when the family has no ratio control.
 */
export function getVideoAspectUi(
  resolvedModelId: string,
  ctx?: { veoMode?: KubeezVeo31Mode }
): VideoAspectUiResult | null {
  const entry = findRegistryEntryForModelId(resolvedModelId);
  if (!entry || entry.mediaKind !== 'video') return null;

  const base = entry.baseCardId;

  if (base === 'veo3-1') {
    const mode = ctx?.veoMode ?? veoModeFromModelId(resolvedModelId) ?? 'text-to-video';
    if (mode === 'reference-to-video') {
      return {
        options: [{ value: '16:9', label: '16:9' }],
        defaultValue: '16:9',
        force16x9: true,
      };
    }
    return {
      options: [
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
        { value: 'auto', label: 'Auto' },
      ],
      defaultValue: '16:9',
    };
  }

  if (base === 'sora-2') {
    return {
      options: [
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
      ],
      defaultValue: '16:9',
    };
  }

  if (base === 'wan-2-5') {
    return {
      options: [
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
        { value: '1:1', label: '1:1' },
      ],
      defaultValue: '16:9',
    };
  }

  if (base === 'grok-video') {
    return {
      options: [
        { value: '2:3', label: '2:3' },
        { value: '3:2', label: '3:2' },
        { value: '1:1', label: '1:1' },
        { value: '9:16', label: '9:16' },
        { value: '16:9', label: '16:9' },
      ],
      defaultValue: '16:9',
    };
  }

  if (base === 'seedance-1-5-pro') {
    return {
      options: SEEDANCE_15_PRO_ASPECT_RATIOS.map((r) => ({ value: r, label: r })),
      defaultValue: '16:9',
    };
  }

  if (base === 'v1-pro-fast-i2v') {
    return {
      options: [
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
      ],
      defaultValue: '16:9',
    };
  }

  if (base === 'kling-2-6-motion') {
    return null;
  }

  if (base === 'kling-2-6') {
    return {
      options: [
        { value: '1:1', label: '1:1' },
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
      ],
      defaultValue: '1:1',
    };
  }

  if (base === 'kling-3-0') {
    const k3 = parseKling30Variant(resolvedModelId);
    if (k3?.line === 'motion') return null;
    return {
      options: [
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
        { value: '1:1', label: '1:1' },
      ],
      defaultValue: '16:9',
    };
  }

  return null;
}

/** Whether `aspect_ratio` should be sent for video (false for Veo Auto). */
export function shouldIncludeVideoAspectRatio(
  ui: VideoAspectUiResult | null,
  storedRatio: string | undefined
): boolean {
  if (!ui) return false;
  if (ui.force16x9) return true;
  const v = storedRatio ?? ui.defaultValue;
  if (v === 'auto') return false;
  return true;
}

/** Value passed to `generateKubeezMediaBlob` when `includeAspectRatio` is true. */
export function videoAspectRatioForRequest(
  ui: VideoAspectUiResult | null,
  storedRatio: string | undefined
): string {
  if (!ui) return '16:9';
  if (ui.force16x9) return '16:9';
  const v = storedRatio ?? ui.defaultValue;
  if (v === 'auto') return '16:9';
  return v;
}
