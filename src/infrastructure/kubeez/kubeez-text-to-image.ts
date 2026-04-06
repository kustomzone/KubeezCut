import {
  KUBEEZ_API_PROXY_PATH_PREFIX,
  rewriteKubeezMediaCdnUrlForFetch,
} from '@/infrastructure/kubeez/kubeez-cdn-fetch-url';
import { extractKubeezPollStatus, isKubeezPlainObject } from '@/infrastructure/kubeez/kubeez-poll-status';
import { createLogger } from '@/shared/logging/logger';

const logger = createLogger('Kubeez');

/** Same-origin proxy (see vite.config + vercel.json). Direct https://api.kubeez.com hits CORS in the browser. */
export const KUBEEZ_BROWSER_PROXY_BASE = KUBEEZ_API_PROXY_PATH_PREFIX;
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

  // Same-origin absolute URLs (e.g. http://localhost:5173/api/kubeez) → relative `/api/kubeez`
  // so dev always goes through the Vite proxy; avoids misconfigured full URLs.
  if (trimmed) {
    try {
      const u = new URL(trimmed, window.location.origin);
      if (u.origin === window.location.origin) {
        const path = u.pathname.replace(/\/$/, '') || '/';
        if (path === proxy || path.startsWith(`${proxy}/`)) {
          return proxy;
        }
      }
    } catch {
      /* ignore */
    }
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
const MEDIA_DOWNLOAD_RETRIES = 10;
const MEDIA_DOWNLOAD_RETRY_MS = 2000;

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

/** POST responses may nest `id` / `generation_id` under `data` or `result`. */
function collectEnvelopeRoots(data: unknown): Record<string, unknown>[] {
  if (!isKubeezPlainObject(data)) return [];
  const roots: Record<string, unknown>[] = [data];
  for (const k of ['data', 'result', 'payload', 'generation', 'job'] as const) {
    const v = data[k];
    if (isKubeezPlainObject(v)) roots.push(v);
  }
  return roots;
}

function extractIdFromRoot(o: Record<string, unknown>): string | null {
  const id = o.generation_id ?? o.id ?? o.generationId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function extractGenerationId(data: unknown): string | null {
  for (const root of collectEnvelopeRoots(data)) {
    const id = extractIdFromRoot(root);
    if (id) return id;
  }
  return null;
}

function mediaTypeMatches(mt: string, prefer: 'video' | 'image'): boolean {
  const m = mt.toLowerCase();
  if (prefer === 'video') return m.startsWith('video');
  return m.startsWith('image') || m === '' || !m;
}

/** Prefer signed / download URLs when the API also exposes a path-only `url` before CDN is ready. */
const OUTPUT_URL_KEYS = [
  'signed_url',
  'download_url',
  'file_url',
  'public_url',
  'media_url',
  'url',
  'optimized_url',
  'href',
  'src',
] as const;

/**
 * Resolves a fetchable URL from an output row. Kubeez may return root-relative CDN paths
 * (e.g. `/images/<id>.jpg`) only in `outputs[].url`; those must be picked so
 * `rewriteKubeezMediaCdnUrlForFetch` can map them to `/api/kubeez-media/...`.
 */
function pickHttpUrlFromRecord(entry: Record<string, unknown>): string | null {
  for (const k of OUTPUT_URL_KEYS) {
    const v = entry[k];
    if (typeof v === 'string' && v.trim().length > 0) {
      const t = v.trim();
      if (t.startsWith('//')) return `https:${t}`;
      if (/^https?:\/\//i.test(t)) return t;
      if (t.startsWith('/') && t.length > 1) return t;
    }
  }
  return null;
}

function collectMediaRoots(data: unknown): Record<string, unknown>[] {
  return collectEnvelopeRoots(data);
}

/** Picks an output URL from completed generation; prefers video or image when requested. */
function firstOutputMediaUrl(data: unknown, prefer: 'video' | 'image'): string | null {
  const roots = collectMediaRoots(data);
  if (roots.length === 0) return null;

  let preferMatch: string | null = null;
  let fallbackUrl: string | null = null;

  const consider = (url: string | undefined, mt: string) => {
    if (!url) return;
    if (!fallbackUrl) fallbackUrl = url;
    if (mediaTypeMatches(mt, prefer)) {
      preferMatch = url;
    }
  };

  for (const o of roots) {
    const outputs = o.outputs ?? o.media_outputs;
    if (Array.isArray(outputs)) {
      for (const entry of outputs) {
        if (!isKubeezPlainObject(entry)) continue;
        const mt = typeof entry.media_type === 'string' ? entry.media_type : '';
        const url = pickHttpUrlFromRecord(entry) ?? undefined;
        consider(url, mt);
        if (preferMatch) return preferMatch;
      }
    }

    const singleOutput = o.output;
    if (isKubeezPlainObject(singleOutput)) {
      const mt = typeof singleOutput.media_type === 'string' ? singleOutput.media_type : '';
      const url = pickHttpUrlFromRecord(singleOutput) ?? undefined;
      consider(url, mt);
    }

    if (preferMatch) return preferMatch;
  }

  if (preferMatch) return preferMatch;
  if (fallbackUrl) return fallbackUrl;

  for (const o of roots) {
    const direct = o.output_url ?? o.image_url ?? o.video_url ?? o.url ?? o.optimized_url;
    if (typeof direct === 'string' && direct.length > 0) return direct;
  }
  return null;
}

/**
 * OpenAPI: GET /v1/generate/media/{id} — `outputs[].optimization_status` may be `failed`
 * while the job is otherwise finished.
 */
function hasFailedOutputOptimization(data: unknown): boolean {
  for (const o of collectMediaRoots(data)) {
    const outputs = o.outputs ?? o.media_outputs;
    if (!Array.isArray(outputs)) continue;
    for (const entry of outputs) {
      if (!isKubeezPlainObject(entry)) continue;
      const os = entry.optimization_status;
      if (typeof os === 'string' && os.toLowerCase() === 'failed') return true;
    }
  }
  return false;
}

/**
 * OpenAPI: `cdn_ready` on the job and/or per output. Do not fetch until not explicitly false.
 * Live API often sets `cdn_ready` on the root object only (see poll JSON).
 */
function outputsAwaitingCdn(data: unknown): boolean {
  for (const o of collectMediaRoots(data)) {
    if (o.cdn_ready === false) return true;
    const outputs = o.outputs ?? o.media_outputs;
    if (!Array.isArray(outputs)) continue;
    for (const entry of outputs) {
      if (!isKubeezPlainObject(entry)) continue;
      if (entry.cdn_ready === false) return true;
    }
  }
  return false;
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
 *
 * Contract (see https://api.kubeez.com/openapi.json — GET /v1/generate/media/{id}):
 * Poll until status is completed and output URLs are non-null (CDN/R2). While CDN upload runs,
 * status may be `processing` with null URLs. Dialogue jobs also use this route (not /generate/music).
 *
 * Why this can fail in the browser while PowerShell works: CLI tools call `https://media.kubeez.com`
 * directly (no CORS). The app must fetch via same-origin `/api/kubeez-media/...` (Vite/Vercel proxy)
 * and may see 404 until the CDN object exists — we wait on `cdn_ready`, retry downloads, and re-poll.
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
      // GET /v1/generate/media/{id} can return 404 until the job is visible; keep polling.
      if (statusRes.status === 404) {
        if (import.meta.env.DEV && attempt % 5 === 0) {
          logger.debug('Kubeez poll 404 — status not yet available', { generationId, attempt });
        }
        continue;
      }
      const msg = extractErrorMessage(statusBody) ?? `Status check failed (${statusRes.status})`;
      throw new Error(msg);
    }

    const status = extractKubeezPollStatus(statusBody);
    if (import.meta.env.DEV && attempt % 5 === 0) {
      logger.debug('Kubeez poll', { generationId, status, attempt });
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(extractErrorMessage(statusBody) ?? 'Media generation failed');
    }

    if (hasFailedOutputOptimization(statusBody)) {
      throw new Error(extractErrorMessage(statusBody) ?? 'Media output optimization failed');
    }

    const terminalComplete =
      status === 'completed' ||
      status === 'complete' ||
      status === 'success' ||
      status === 'succeeded' ||
      status === 'ready' ||
      status === 'done' ||
      status === 'finished';

    if (terminalComplete) {
      if (outputsAwaitingCdn(statusBody)) {
        if (import.meta.env.DEV && attempt % 5 === 0) {
          logger.debug('Kubeez poll — waiting for outputs[].cdn_ready', { generationId, attempt });
        }
        continue;
      }

      const prefer = preferVideoOutput ? 'video' : 'image';
      const mediaUrl = firstOutputMediaUrl(statusBody, prefer) ?? firstOutputMediaUrl(statusBody, prefer === 'video' ? 'image' : 'video');
      if (!mediaUrl) {
        // Docs: URLs may still be null until CDN upload finishes; keep polling.
        if (import.meta.env.DEV && attempt % 5 === 0) {
          logger.debug('Kubeez poll — completed but output URLs not ready yet', { generationId, attempt });
        }
        continue;
      }

      const fetchUrl = rewriteKubeezMediaCdnUrlForFetch(mediaUrl);
      let lastDownloadStatus = 0;
      for (let d = 0; d < MEDIA_DOWNLOAD_RETRIES; d++) {
        const mediaRes = await fetch(fetchUrl, { mode: 'cors', signal });
        lastDownloadStatus = mediaRes.status;
        if (mediaRes.ok) {
          return mediaRes.blob();
        }
        if (mediaRes.status === 404 && d < MEDIA_DOWNLOAD_RETRIES - 1) {
          await sleep(MEDIA_DOWNLOAD_RETRY_MS, signal);
          continue;
        }
        break;
      }

      // CDN can lag behind status; re-poll for updated URLs / cdn_ready instead of failing on first stale path.
      if (lastDownloadStatus === 404) {
        if (import.meta.env.DEV && attempt % 3 === 0) {
          logger.debug('Kubeez download 404 — re-polling generation status', { generationId, attempt });
        }
        continue;
      }

      throw new Error(`Failed to download media (${lastDownloadStatus})`);
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
