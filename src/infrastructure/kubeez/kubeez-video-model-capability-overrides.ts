import type { KubeezMediaModelOption } from './kubeez-models';

/**
 * When `GET /v1/models` misreports `supportsTextToVideo` / `supportsImageToVideo` vs Kubeez web
 * (VideoAIChat / fileRestrictions), add `model_id` entries here. Empty until a mismatch is confirmed.
 */
export const KUBEEZ_VIDEO_CAPABILITY_OVERRIDES: Partial<
  Record<string, { supportsTextToVideo?: boolean; supportsImageToVideo?: boolean }>
> = {};

export function applyVideoCapabilityOverrides(model: KubeezMediaModelOption): KubeezMediaModelOption {
  if (model.mediaKind !== 'video') return model;
  const o = KUBEEZ_VIDEO_CAPABILITY_OVERRIDES[model.model_id];
  if (!o) return model;
  return {
    ...model,
    ...(o.supportsTextToVideo !== undefined ? { supportsTextToVideo: o.supportsTextToVideo } : {}),
    ...(o.supportsImageToVideo !== undefined ? { supportsImageToVideo: o.supportsImageToVideo } : {}),
  };
}
