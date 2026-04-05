/**
 * Per-model max reference uploads for `source_media_urls`, aligned with Kubeez REST docs:
 * https://kubeez.com/docs/rest-api-model-requirements (max images + max videos when both apply).
 *
 * When `GET /v1/models` omits merged limits, these values keep the UI accurate. Regenerate from
 * that page when Kubeez updates provider rules.
 */

const EXACT: Record<string, number> = {
  // Image — docs table
  '5-lite-image-to-image': 10,
  '5-lite-text-to-image': 10,
  'flux-2': 0,
  'flux-2-1K': 0,
  'flux-2-2K': 0,
  'flux-2-edit-1K': 8,
  'flux-2-edit-2K': 8,
  'gpt-1.5-image-high': 16,
  'gpt-1.5-image-medium': 16,
  'grok-text-to-image': 0,
  'imagen-4': 0,
  'imagen-4-fast': 0,
  'imagen-4-ultra': 0,
  'nano-banana': 10,
  'nano-banana-2': 8,
  'nano-banana-2-2K': 8,
  'nano-banana-2-4K': 8,
  'nano-banana-edit': 10,
  'nano-banana-pro': 8,
  'nano-banana-pro-2K': 8,
  'nano-banana-pro-4K': 8,
  'p-image-edit': 8,
  'seedream-v4': 10,
  'seedream-v4-edit': 10,
  'seedream-v4-5': 10,
  'seedream-v4-5-edit': 10,
  'z-image': 0,
  'z-image-hd': 0,

  // Video
  'grok-image-to-video': 1,
  'grok-text-to-video-6s': 0,
  'kling-2-5-image-to-video-pro': 2,
  'kling-2-5-image-to-video-pro-10s': 2,
  'kling-2-6-motion-control-720p': 2,
  'kling-2-6-motion-control-1080p': 2,
  'kling-3-0-motion-control-720p': 2,
  'kling-3-0-motion-control-1080p': 2,
};

/** Longest prefixes first for greedy match. */
const PREFIX_RULES: { prefix: string; maxFiles: number }[] = [
  { prefix: 'seedance-1-5-pro-', maxFiles: 2 },
  /** Kling 3.0 std/pro: up to 2 images for I2V; T2V uses 0 refs (same cap for upload UI). */
  { prefix: 'kling-3-0-', maxFiles: 2 },
  { prefix: 'kling-2-6-image-to-video-', maxFiles: 1 },
  { prefix: 'kling-2-6-text-to-video-', maxFiles: 0 },
  { prefix: 'v1-pro-fast-i2v-', maxFiles: 1 },
  { prefix: 'sora-2-pro-storyboard-', maxFiles: 1 },
  { prefix: 'sora-2-pro-image-to-video-', maxFiles: 1 },
  { prefix: 'sora-2-pro-text-to-video-', maxFiles: 0 },
  { prefix: 'sora-2-image-to-video-', maxFiles: 1 },
  { prefix: 'sora-2-text-to-video-', maxFiles: 0 },
  { prefix: 'veo3-1-', maxFiles: 3 },
  { prefix: 'wan-2-5-image-to-video-', maxFiles: 1 },
  { prefix: 'wan-2-5-text-to-video-', maxFiles: 0 },
  { prefix: 'wan-2-5', maxFiles: 0 },
];

export function documentedMaxReferenceFilesForModelId(modelId: string): number | undefined {
  if (!modelId) return undefined;
  if (modelId in EXACT) return EXACT[modelId];

  for (const { prefix, maxFiles } of PREFIX_RULES) {
    if (modelId.startsWith(prefix)) return maxFiles;
  }

  return undefined;
}

/** API value wins; otherwise Kubeez REST model requirements (docs). */
export function effectiveMaxReferenceFilesForModel(model: {
  model_id: string;
  maxReferenceFiles?: number;
} | null | undefined): number | undefined {
  if (!model) return undefined;
  if (typeof model.maxReferenceFiles === 'number' && Number.isFinite(model.maxReferenceFiles)) {
    const n = Math.floor(model.maxReferenceFiles);
    if (n < 0) return 0;
    return Math.min(32, n);
  }
  return documentedMaxReferenceFilesForModelId(model.model_id);
}
