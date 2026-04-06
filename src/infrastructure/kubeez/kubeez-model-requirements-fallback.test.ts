/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KUBEEZ_API_PROXY_PATH_PREFIX,
  KUBEEZ_MEDIA_PROXY_PATH_PREFIX,
  rewriteKubeezMediaCdnUrlForFetch,
  rewriteKubeezUrlForSameOriginFetch,
} from './kubeez-cdn-fetch-url';
import type { KubeezMediaModelOption } from './kubeez-models';
import { effectiveMaxReferenceFilesForModel } from './kubeez-documented-reference-limits';
import {
  applyModelRequirementFallbacks,
  getRequirementFallbackForModelId,
} from './kubeez-model-requirements-fallback';

function baseImage(overrides: Partial<KubeezMediaModelOption> = {}) {
  return {
    model_id: 'test-model',
    display_name: 'Test',
    mediaKind: 'image' as const,
    showAspectRatio: true,
    ...overrides,
  };
}

describe('getRequirementFallbackForModelId', () => {
  it('prefers exact id over prefix', () => {
    const p = getRequirementFallbackForModelId('seedream-v4-5');
    expect(p?.prompt_max_chars).toBe(3000);
  });

  it('uses longest matching prefix', () => {
    const p = getRequirementFallbackForModelId('kling-2-6-text-to-video-5s');
    expect(p?.prompt_max_chars).toBe(2500);
    const p25 = getRequirementFallbackForModelId('kling-2-5-image-to-video-pro-10s');
    expect(p25?.prompt_max_chars).toBe(2500);
  });

  it('matches veo3-1- before shorter veo3-', () => {
    const p = getRequirementFallbackForModelId('veo3-1-fast-text-to-video');
    expect(p?.prompt_max_chars).toBe(5000);
  });
});

describe('applyModelRequirementFallbacks', () => {
  it('keeps API prompt_max_chars when set', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'seedream-v4',
        prompt_max_chars: 9999,
      })
    );
    expect(m.prompt_max_chars).toBe(9999);
  });

  it('fills prompt_max_chars from fallback when missing', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'seedream-v4',
      })
    );
    expect(m.prompt_max_chars).toBe(2500);
  });

  it('fills grok-text-to-image aspect ratios when missing', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'grok-text-to-image',
      })
    );
    expect(m.aspectRatioOptions).toEqual(['1:1', '2:3', '3:2']);
  });

  it('preserves empty aspectRatioOptions array from API', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'grok-text-to-image',
        aspectRatioOptions: [],
      })
    );
    expect(m.aspectRatioOptions).toEqual([]);
  });

  it('uses documented max reference files when API omits maxReferenceFiles', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'nano-banana-2',
      })
    );
    expect(m.maxReferenceFiles).toBe(8);
  });

  it('prefers documented max reference over API when model has a docs row', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'nano-banana-2',
        maxReferenceFiles: 3,
      })
    );
    expect(m.maxReferenceFiles).toBe(8);
  });

  it('forces z-image to 0 refs even when API returns a positive max_input_images', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'z-image',
        maxReferenceFiles: 8,
      })
    );
    expect(m.maxReferenceFiles).toBe(0);
  });

  it('uses API maxReferenceFiles when documented table has no entry', () => {
    const m = applyModelRequirementFallbacks(
      baseImage({
        model_id: 'hypothetical-new-model-xyz',
        maxReferenceFiles: 5,
      })
    );
    expect(m.maxReferenceFiles).toBe(5);
  });
});

describe('effectiveMaxReferenceFilesForModel', () => {
  it('prefers docs over model.maxReferenceFiles when docs define a cap', () => {
    expect(
      effectiveMaxReferenceFilesForModel({ model_id: 'z-image', maxReferenceFiles: 99 })
    ).toBe(0);
  });

  it('uses API when docs have no row', () => {
    expect(
      effectiveMaxReferenceFilesForModel({ model_id: 'hypothetical-new-model-xyz', maxReferenceFiles: 4 })
    ).toBe(4);
  });
});

describe('rewriteKubeezUrlForSameOriginFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps root-relative CDN paths to media proxy (same-origin download)', () => {
    expect(rewriteKubeezUrlForSameOriginFetch('/images/c5c6f2dc-3a6f-45ba-8f6b-49a5fbf1dc46.jpg')).toBe(
      `${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}/images/c5c6f2dc-3a6f-45ba-8f6b-49a5fbf1dc46.jpg`
    );
  });

  it('maps absolute media.kubeez.com URLs to media proxy', () => {
    expect(
      rewriteKubeezUrlForSameOriginFetch('https://media.kubeez.com/images/foo.jpg?q=1')
    ).toBe(`${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}/images/foo.jpg?q=1`);
  });

  it('maps absolute api.kubeez.com URLs to API proxy', () => {
    expect(rewriteKubeezUrlForSameOriginFetch('https://api.kubeez.com/v1/generate/media/x')).toBe(
      `${KUBEEZ_API_PROXY_PATH_PREFIX}/v1/generate/media/x`
    );
  });

  it('rewriteKubeezMediaCdnUrlForFetch aliases same-origin helper', () => {
    expect(rewriteKubeezMediaCdnUrlForFetch('//media.kubeez.com/audio/a.mp3')).toBe(
      `${KUBEEZ_MEDIA_PROXY_PATH_PREFIX}/audio/a.mp3`
    );
  });
});
