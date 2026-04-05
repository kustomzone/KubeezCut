import { rewriteKubeezMediaCdnUrlForFetch } from '@/infrastructure/kubeez/kubeez-cdn-fetch-url';
import { createLogger } from '@/shared/logging/logger';

const logger = createLogger('Kubeez');

/** Same-origin proxy (see vite.config + vercel.json). Direct https://api.kubeez.com hits CORS in the browser. */
export const KUBEEZ_BROWSER_PROXY_BASE = '/api/kubeez';
export const KUBEEZ_MODEL_NANO_BANANA_2 = 'nano-banana-2';

/**
 * Resolves API base for fetch(). Empty, default proxy, or https://api.kubeez.com → same-origin proxy in the browser.
 */
export function resolveKubeezApiBaseUrl(configured: string | undefined): string {
  const trimmed = (configured ?? '').trim();
  const proxy = KUBEEZ_BROWSER_PROXY_BASE.replace(/\/$/, '');

  if (typeof window === 'undefined') {
    return trimmed || proxy;
  }

  if (!trimmed || trimmed === proxy || trimmed === `${proxy}/`) {
    return proxy;
  }

  try {
    const u = new URL(trimmed, window.location.origin);
    if (u.origin === 'https://api.kubeez.com') {
      return proxy;
    }
  } catch {
    /* relative e.g. /api/kubeez */
  }

  return trimmed.replace(/\/$/, '');
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function extractGenerationId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const id = o.generation_id ?? o.id ?? o.generationId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function mediaTypeMatches(mt: string, prefer: 'video' | 'image'): boolean {
  const m = mt.toLowerCase();
  if (prefer === 'video') return m.startsWith('video');
  return m.startsWith('image') || m === '' || !m;
}

/** Picks an output URL from completed generation; prefers video or image when requested. */
function firstOutputMediaUrl(data: unknown, prefer: 'video' | 'image'): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;

  const outputs = o.outputs ?? o.media_outputs;
  if (Array.isArray(outputs)) {
    let preferMatch: string | null = null;
    let fallbackUrl: string | null = null;
    for (const entry of outputs) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      const mt = typeof e.media_type === 'string' ? e.media_type : '';
      const url = typeof e.url === 'string' ? e.url : '';
      if (!url) continue;
      if (!fallbackUrl) fallbackUrl = url;
      if (mediaTypeMatches(mt, prefer)) {
        preferMatch = url;
        break;
      }
    }
    if (preferMatch) return preferMatch;
    if (fallbackUrl) return fallbackUrl;
  }

  const direct = o.output_url ?? o.image_url ?? o.video_url ?? o.url;
  return typeof direct === 'string' && direct.length > 0 ? direct : null;
}

function extractStatus(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const o = data as Record<string, unknown>;
  const s = o.status;
  return typeof s === 'string' ? s.toLowerCase() : '';
}

function extractErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  if (typeof o.error === 'string') return o.error;
  if (typeof o.message === 'string') return o.message;
  const detail = o.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object') {
    const d0 = detail[0] as Record<string, unknown>;
    if (typeof d0.msg === 'string') return d0.msg;
  }
  return undefined;
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export interface GenerateTextToImageParams {
  apiKey: string;
  baseUrl?: string;
  prompt: string;
  aspectRatio?: string;
  model?: string;
  signal?: AbortSignal;
  /** Public URLs from POST /v1/upload/media — passed as `source_media_urls` on generate. */
  sourceMediaUrls?: string[];
  /**
   * When omitted: `image-to-image` if `sourceMediaUrls` is non-empty, else `text-to-image`.
   * Use `image-to-video` / `text-to-video` for video models when those flows are enabled.
   */
  generationType?: string;
  /** When false, `aspect_ratio` is omitted (e.g. fixed-aspect video models). Default true. */
  includeAspectRatio?: boolean;
  /** Passed to API when set (video models). */
  duration?: string;
  /** After completion, prefer downloading a video output vs an image. */
  preferVideoOutput?: boolean;
}

/**
 * Starts a Kubeez media job, polls until complete, downloads primary output as a Blob.
 */
export async function generateKubeezMediaBlob(params: GenerateTextToImageParams): Promise<Blob> {
  const {
    apiKey,
    baseUrl,
    prompt,
    aspectRatio = '1:1',
    model = KUBEEZ_MODEL_NANO_BANANA_2,
    signal,
    sourceMediaUrls,
    generationType: generationTypeParam,
    includeAspectRatio = true,
    duration,
    preferVideoOutput = false,
  } = params;

  const root = resolveKubeezApiBaseUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  const urls = sourceMediaUrls?.filter((u) => typeof u === 'string' && u.trim().length > 0) ?? [];
  const generationType =
    generationTypeParam ??
    (urls.length > 0 ? 'image-to-image' : 'text-to-image');

  // `model` must be the catalog’s concrete provider id. Image “quality” tiers (e.g. Nano Banana 2K/4K)
  // are separate model_ids in this API — not a shared base model plus a resolution body field.
  const body: Record<string, unknown> = {
    prompt,
    model,
    generation_type: generationType,
  };
  if (includeAspectRatio) {
    body.aspect_ratio = aspectRatio;
  }
  if (urls.length > 0) {
    body.source_media_urls = urls;
  }
  if (duration !== undefined && duration !== '') {
    body.duration = duration;
  }

  const startRes = await fetch(`${root}/v1/generate/media`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  const startBody = await parseJsonResponse(startRes);
  if (!startRes.ok) {
    const msg = extractErrorMessage(startBody) ?? `Kubeez request failed (${startRes.status})`;
    throw new Error(msg);
  }

  const generationId = extractGenerationId(startBody);
  if (!generationId) {
    logger.error('Unexpected Kubeez start response', startBody);
    throw new Error('Kubeez did not return a generation id');
  }

  if (import.meta.env.DEV) {
    logger.debug('Kubeez generation started', { generationId });
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS, signal);

    const statusRes = await fetch(`${root}/v1/generate/media/${encodeURIComponent(generationId)}`, {
      headers: { 'X-API-Key': apiKey },
      signal,
    });
    const statusBody = await parseJsonResponse(statusRes);
    if (!statusRes.ok) {
      const msg = extractErrorMessage(statusBody) ?? `Status check failed (${statusRes.status})`;
      throw new Error(msg);
    }

    const status = extractStatus(statusBody);
    if (import.meta.env.DEV && attempt % 5 === 0) {
      logger.debug('Kubeez poll', { generationId, status, attempt });
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(extractErrorMessage(statusBody) ?? 'Media generation failed');
    }

    if (
      status === 'completed' ||
      status === 'complete' ||
      status === 'success' ||
      status === 'succeeded'
    ) {
      const prefer = preferVideoOutput ? 'video' : 'image';
      const mediaUrl = firstOutputMediaUrl(statusBody, prefer) ?? firstOutputMediaUrl(statusBody, prefer === 'video' ? 'image' : 'video');
      if (!mediaUrl) {
        throw new Error('Generation completed but no media URL was returned');
      }

      const mediaRes = await fetch(rewriteKubeezMediaCdnUrlForFetch(mediaUrl), { mode: 'cors', signal });
      if (!mediaRes.ok) {
        throw new Error(`Failed to download media (${mediaRes.status})`);
      }
      return mediaRes.blob();
    }
  }

  throw new Error('Media generation timed out. Try again later.');
}

/** @deprecated Prefer `generateKubeezMediaBlob` */
export const generateTextToImageBlob = generateKubeezMediaBlob;

export function extensionFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/quicktime') return 'mov';
  return 'bin';
}
