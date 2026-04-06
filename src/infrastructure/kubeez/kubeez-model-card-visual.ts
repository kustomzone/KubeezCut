import type { KubeezMediaModelOption } from './kubeez-models';
import { resolveLocalKubeezModelCardImage } from './kubeez-local-model-card-images';

/** Stable 0–359 hue from a model id for gradient fallbacks when no card image URL is available. */
export function kubeezModelHue(modelId: string): number {
  let h = 0;
  for (let i = 0; i < modelId.length; i++) {
    h = (h * 31 + modelId.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function kubeezModelCardGradientBackground(modelId: string): string {
  const h = kubeezModelHue(modelId);
  const h2 = (h + 48) % 360;
  return `linear-gradient(135deg, hsl(${h} 42% 32%) 0%, hsl(${h2} 38% 22%) 55%, hsl(${(h + 96) % 360} 35% 18%) 100%)`;
}

export function pickFirstCardImageUrl(variants: KubeezMediaModelOption[]): string | undefined {
  for (const v of variants) {
    const u = v.cardImageUrl?.trim();
    if (u) return u;
  }
  return undefined;
}

/**
 * Hero image for generate dialog cards: prefer API `cardImageUrl`, else bundled artwork aligned with
 * the Kubeez website model catalog.
 */
export function resolveKubeezModelCardHeroUrl(
  modelId: string,
  options?: { baseCardId?: string | null; apiCardImageUrl?: string | null }
): string | undefined {
  const api = options?.apiCardImageUrl?.trim();
  if (api) return api;
  return resolveLocalKubeezModelCardImage(modelId, options?.baseCardId ?? undefined);
}
