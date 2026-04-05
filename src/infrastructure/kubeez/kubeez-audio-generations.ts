import { createLogger } from '@/shared/logging/logger';
import { resolveKubeezApiBaseUrl } from './kubeez-text-to-image';

const logger = createLogger('KubeezAudio');

/** Voice ids accepted by Kubeez `POST /v1/generate/dialogue` (ElevenLabs). */
export const KUBEEZ_DIALOGUE_VOICE_OPTIONS: { id: string; label: string }[] = [
  { id: 'Adam', label: 'Adam' },
  { id: 'Sarah', label: 'Sarah' },
  { id: 'Antoni', label: 'Antoni' },
  { id: 'Arnold', label: 'Arnold' },
  { id: 'Bella', label: 'Bella' },
  { id: 'Domi', label: 'Domi' },
  { id: 'Elli', label: 'Elli' },
  { id: 'Josh', label: 'Josh' },
  { id: 'Sam', label: 'Sam' },
];

export const KUBEEZ_DIALOGUE_LANGUAGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'ro', label: 'Romanian' },
  { id: 'it', label: 'Italian' },
  { id: 'pt', label: 'Portuguese' },
];

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

function isPlainObject(u: unknown): u is Record<string, unknown> {
  return u !== null && typeof u === 'object' && !Array.isArray(u);
}

function extractGenerationId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const id = o.generation_id ?? o.id ?? o.generationId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

const URL_VALUE_KEYS = [
  'url',
  'audio_url',
  'file_url',
  'signed_url',
  'public_url',
  'download_url',
  'media_url',
  'href',
  'src',
  'output_url',
  'stream_url',
] as const;

function isLikelyHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function pickUrlFromObject(obj: Record<string, unknown>): string | null {
  for (const k of URL_VALUE_KEYS) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0 && isLikelyHttpUrl(v)) return v.trim();
  }
  return null;
}

/** Resolves URL on the object or nested file/asset/media/output shapes. */
function pickUrlDeep(obj: Record<string, unknown>): string | null {
  const direct = pickUrlFromObject(obj);
  if (direct) return direct;
  for (const nest of ['file', 'asset', 'media', 'output']) {
    const n = obj[nest];
    if (isPlainObject(n)) {
      const u = pickUrlFromObject(n);
      if (u) return u;
    }
  }
  return null;
}

/** Suno-style `songs[]`: `audio_url` when ready, else `stream_url` (often non-null while `audio_url` is null). */
function pickSongPlaybackUrl(song: Record<string, unknown>): string | null {
  const au = song.audio_url;
  if (typeof au === 'string' && au.length > 0 && isLikelyHttpUrl(au)) return au.trim();
  const su = song.stream_url;
  if (typeof su === 'string' && su.length > 0 && isLikelyHttpUrl(su)) return su.trim();
  return pickUrlDeep(song);
}

function normalizeStatusString(v: unknown): string {
  if (typeof v === 'string') return v.toLowerCase().trim();
  return '';
}

function extractStatus(data: unknown): string {
  if (!isPlainObject(data)) return '';
  const direct =
    normalizeStatusString(data.status) ||
    normalizeStatusString(data.state) ||
    normalizeStatusString(data.job_status) ||
    normalizeStatusString(data.generation_status);
  if (direct) return direct;

  const dataNested = data.data;
  if (isPlainObject(dataNested)) {
    const s =
      normalizeStatusString(dataNested.status) ||
      normalizeStatusString(dataNested.state) ||
      normalizeStatusString(dataNested.job_status);
    if (s) return s;
  }

  const gen = data.generation;
  if (isPlainObject(gen)) {
    const s = normalizeStatusString(gen.status) || normalizeStatusString(gen.state);
    if (s) return s;
  }

  const job = data.job;
  if (isPlainObject(job)) {
    const s = normalizeStatusString(job.status) || normalizeStatusString(job.state);
    if (s) return s;
  }

  return '';
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

function collectCandidateRoots(data: unknown): Record<string, unknown>[] {
  if (!isPlainObject(data)) return [];
  const roots: Record<string, unknown>[] = [data];
  const nestedKeys = ['result', 'data', 'generation', 'job', 'payload'] as const;
  for (const k of nestedKeys) {
    const v = data[k];
    if (isPlainObject(v)) roots.push(v);
  }
  return roots;
}

function urlFromOutputEntry(entry: Record<string, unknown>): { url: string | null; mediaType: string } {
  const mt = typeof entry.media_type === 'string' ? entry.media_type.toLowerCase() : '';
  return { url: pickUrlDeep(entry), mediaType: mt };
}

function extractAudioUrlFromRoots(roots: Record<string, unknown>[]): string | null {
  let audioMatch: string | null = null;
  let anyHttp: string | null = null;

  const consider = (url: string | null, mediaType: string, treatAsAudio: boolean) => {
    if (!url) return;
    if (!anyHttp) anyHttp = url;
    if (treatAsAudio || mediaType.startsWith('audio')) {
      audioMatch = url;
    }
  };

  for (const root of roots) {
    const outputs = root.outputs ?? root.media_outputs;
    if (Array.isArray(outputs)) {
      for (const entry of outputs) {
        if (!isPlainObject(entry)) continue;
        const { url, mediaType } = urlFromOutputEntry(entry);
        consider(url, mediaType, false);
      }
    }

    const songs = root.songs;
    if (Array.isArray(songs)) {
      for (const s of songs) {
        if (!isPlainObject(s)) continue;
        const url = pickSongPlaybackUrl(s);
        consider(url, 'audio/unknown', true);
      }
    }

    if (isPlainObject(root.output)) {
      const url = pickUrlDeep(root.output);
      const mt =
        typeof root.output.media_type === 'string' ? root.output.media_type.toLowerCase() : '';
      consider(url, mt, false);
    }

    const top = pickUrlFromObject(root);
    consider(top, '', false);
  }

  return audioMatch ?? anyHttp;
}

/** First audio URL from Kubeez music / dialogue status or completion payloads. */
export function firstAudioOutputUrl(data: unknown): string | null {
  const roots = collectCandidateRoots(data);
  if (roots.length === 0) return null;
  return extractAudioUrlFromRoots(roots);
}

export function audioExtensionFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'audio/mpeg' || m === 'audio/mp3') return 'mp3';
  if (m === 'audio/wav' || m === 'audio/x-wav') return 'wav';
  if (m === 'audio/ogg' || m === 'audio/opus') return 'ogg';
  if (m === 'audio/aac' || m === 'audio/mp4' || m === 'audio/x-m4a') return 'aac';
  if (m === 'audio/flac') return 'flac';
  return 'mp3';
}

async function downloadAudioUrl(url: string, signal?: AbortSignal): Promise<Blob> {
  const mediaRes = await fetch(url, { mode: 'cors', signal });
  if (!mediaRes.ok) {
    throw new Error(`Failed to download audio (${mediaRes.status})`);
  }
  return mediaRes.blob();
}

type AudioJobKind = 'music' | 'dialogue';

export interface KubeezMusicFileResult {
  blob: Blob;
  suggestedFileName: string;
}

function sanitizeMusicFileBase(title: string, index: number, runTs: number): string {
  const raw = (title || '').trim() || `variant-${index + 1}`;
  const safe = raw
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '');
  return `kubeez-music-${safe || `track-${index + 1}`}-${runTs}-${index + 1}`;
}

/** Collect one entry per `songs[]` row with a playable URL (`audio_url` or `stream_url`). */
function collectMusicSongSpecsFromPayload(data: unknown): { url: string; fileBase: string }[] {
  const runTs = Date.now();
  const roots = collectCandidateRoots(data);
  const out: { url: string; fileBase: string }[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    const songs = root.songs;
    if (!Array.isArray(songs)) continue;
    songs.forEach((s, index) => {
      if (!isPlainObject(s)) return;
      const url = pickSongPlaybackUrl(s);
      if (!url || seen.has(url)) return;
      seen.add(url);
      const title = typeof s.title === 'string' ? s.title : '';
      out.push({ url, fileBase: sanitizeMusicFileBase(title, index, runTs) });
    });
  }
  return out;
}

async function downloadMusicFileResultsFromSpecs(
  specs: { url: string; fileBase: string }[],
  signal?: AbortSignal
): Promise<KubeezMusicFileResult[]> {
  return Promise.all(
    specs.map(async ({ url, fileBase }) => {
      const blob = await downloadAudioUrl(url, signal);
      const ext = audioExtensionFromMime(blob.type || 'audio/mpeg');
      return { blob, suggestedFileName: `${fileBase}.${ext}` };
    })
  );
}

/** When status is complete: download all `songs[]` variants or a single legacy output URL. */
async function tryResolveMusicCompletionPayload(
  body: unknown,
  signal?: AbortSignal
): Promise<KubeezMusicFileResult[] | null> {
  const specs = collectMusicSongSpecsFromPayload(body);
  if (specs.length > 0) {
    return downloadMusicFileResultsFromSpecs(specs, signal);
  }
  const singleUrl = firstAudioOutputUrl(body);
  if (singleUrl) {
    const blob = await downloadAudioUrl(singleUrl, signal);
    const ext = audioExtensionFromMime(blob.type || 'audio/mpeg');
    return [{ blob, suggestedFileName: `kubeez-music-${Date.now()}.${ext}` }];
  }
  return null;
}

function logCompletedAudioMissingUrl(params: {
  kind: AudioJobKind;
  generationId: string;
  /** Last JSON body from the poll endpoint (music, dialogue, or media). */
  responseBody: unknown;
  /** True after we switched music polling to unified `GET /v1/generate/media/{id}`. */
  switchedMusicToMediaPoll: boolean;
}): void {
  if (!import.meta.env.DEV) return;
  const summarize = (label: string, body: unknown) => {
    if (!isPlainObject(body)) return { label, shape: 'non-object' as const };
    const o = body;
    const outs = o.outputs ?? o.media_outputs;
    const songs = o.songs;
    return {
      label,
      topKeys: Object.keys(o),
      outputsLen: Array.isArray(outs) ? outs.length : null,
      songsLen: Array.isArray(songs) ? songs.length : null,
      hasMediaOutputs: 'media_outputs' in o,
      hasOutput: 'output' in o,
      hasSongs: 'songs' in o,
    };
  };
  logger.debug('Kubeez audio completed but no extractable URL', {
    kind: params.kind,
    generationId: params.generationId,
    switchedMusicToMediaPoll: params.switchedMusicToMediaPoll,
    lastPoll: summarize('lastPoll', params.responseBody),
  });
}

async function pollKubeezMusicJob(params: {
  root: string;
  apiKey: string;
  generationId: string;
  signal?: AbortSignal;
}): Promise<KubeezMusicFileResult[]> {
  const { root, apiKey, generationId, signal } = params;
  let pollUrl = `${root}/v1/generate/music/${encodeURIComponent(generationId)}`;
  let switchedMusicToMediaPoll = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS, signal);

    let statusRes = await fetch(pollUrl, {
      headers: { 'X-API-Key': apiKey },
      signal,
    });

    // Kubeez may only expose async status on unified GET /v1/generate/media/{id};
    // the music-specific route can return 404 with body `{ error: "not_found" }` while the job runs fine.
    if (statusRes.status === 404 && pollUrl.includes('/v1/generate/music/')) {
      switchedMusicToMediaPoll = true;
      pollUrl = `${root}/v1/generate/media/${encodeURIComponent(generationId)}`;
      if (import.meta.env.DEV) {
        logger.debug('Kubeez music poll 404 — switching to unified media status', {
          generationId,
          attempt,
        });
      }
      statusRes = await fetch(pollUrl, {
        headers: { 'X-API-Key': apiKey },
        signal,
      });
    }

    const statusBody = await parseJsonResponse(statusRes);

    if (!statusRes.ok) {
      const msg = extractErrorMessage(statusBody) ?? `Status check failed (${statusRes.status})`;
      throw new Error(msg);
    }

    const status = extractStatus(statusBody);
    if (import.meta.env.DEV && attempt % 5 === 0) {
      logger.debug('Kubeez music poll', { generationId, status, attempt, pollTail: pollUrl.slice(-48) });
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(extractErrorMessage(statusBody) ?? 'Music generation failed');
    }

    const terminalOk =
      status === 'completed' ||
      status === 'complete' ||
      status === 'success' ||
      status === 'succeeded' ||
      status === 'streaming';

    if (terminalOk) {
      const resolved = await tryResolveMusicCompletionPayload(statusBody, signal);
      if (resolved && resolved.length > 0) {
        return resolved;
      }

      if (!switchedMusicToMediaPoll && pollUrl.includes('/v1/generate/music/')) {
        switchedMusicToMediaPoll = true;
        pollUrl = `${root}/v1/generate/media/${encodeURIComponent(generationId)}`;
        continue;
      }

      logCompletedAudioMissingUrl({
        kind: 'music',
        generationId,
        responseBody: statusBody,
        switchedMusicToMediaPoll,
      });
      throw new Error(
        switchedMusicToMediaPoll
          ? 'Generation completed but no audio URL was returned (music status and unified media status had no downloadable URL).'
          : 'Generation completed but no audio URL was returned'
      );
    }
  }

  throw new Error('Music generation timed out. Try again later.');
}

async function pollKubeezDialogueJob(params: {
  root: string;
  apiKey: string;
  generationId: string;
  signal?: AbortSignal;
}): Promise<Blob> {
  const { root, apiKey, generationId, signal } = params;
  let pollUrl = `${root}/v1/generate/dialogue/${encodeURIComponent(generationId)}`;
  let triedDialogueMedia404Fallback = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS, signal);

    let statusRes = await fetch(pollUrl, {
      headers: { 'X-API-Key': apiKey },
      signal,
    });
    if (statusRes.status === 404 && !triedDialogueMedia404Fallback) {
      triedDialogueMedia404Fallback = true;
      pollUrl = `${root}/v1/generate/media/${encodeURIComponent(generationId)}`;
      statusRes = await fetch(pollUrl, {
        headers: { 'X-API-Key': apiKey },
        signal,
      });
    }
    const statusBody = await parseJsonResponse(statusRes);

    if (!statusRes.ok) {
      const msg = extractErrorMessage(statusBody) ?? `Status check failed (${statusRes.status})`;
      throw new Error(msg);
    }

    const status = extractStatus(statusBody);
    if (import.meta.env.DEV && attempt % 5 === 0) {
      logger.debug('Kubeez dialogue poll', { generationId, status, attempt, pollTail: pollUrl.slice(-48) });
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(extractErrorMessage(statusBody) ?? 'Audio generation failed');
    }

    const terminalOk =
      status === 'completed' ||
      status === 'complete' ||
      status === 'success' ||
      status === 'succeeded';

    if (terminalOk) {
      const audioUrl = firstAudioOutputUrl(statusBody);
      if (audioUrl) {
        return downloadAudioUrl(audioUrl, signal);
      }

      logCompletedAudioMissingUrl({
        kind: 'dialogue',
        generationId,
        responseBody: statusBody,
        switchedMusicToMediaPoll: triedDialogueMedia404Fallback,
      });
      throw new Error('Generation completed but no audio URL was returned');
    }
  }

  throw new Error('Audio generation timed out. Try again later.');
}

export interface GenerateKubeezMusicParams {
  apiKey: string;
  baseUrl?: string;
  prompt: string;
  instrumental?: boolean;
  /** Kubeez music engine id (e.g. V5, V4) — must match API. */
  model?: string;
  signal?: AbortSignal;
}

/**
 * POST /v1/generate/music, poll until complete, download every `songs[]` variant (or one legacy output).
 */
export async function generateKubeezMusicFiles(
  params: GenerateKubeezMusicParams
): Promise<KubeezMusicFileResult[]> {
  const { apiKey, baseUrl, prompt, instrumental = false, model = 'V5', signal } = params;

  const root = resolveKubeezApiBaseUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  const startRes = await fetch(`${root}/v1/generate/music`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      instrumental,
      model,
    }),
    signal,
  });

  const startBody = await parseJsonResponse(startRes);
  if (!startRes.ok) {
    const msg = extractErrorMessage(startBody) ?? `Kubeez music request failed (${startRes.status})`;
    throw new Error(msg);
  }

  const immediate = await tryResolveMusicCompletionPayload(startBody, signal);
  if (immediate && immediate.length > 0) {
    if (import.meta.env.DEV) {
      logger.debug('Kubeez music completed inline', { count: immediate.length });
    }
    return immediate;
  }

  const generationId = extractGenerationId(startBody);
  if (!generationId) {
    logger.error('Unexpected Kubeez music start response', startBody);
    throw new Error('Kubeez did not return a music generation id');
  }

  if (import.meta.env.DEV) {
    logger.debug('Kubeez music generation started', { generationId });
  }

  return pollKubeezMusicJob({ root, apiKey, generationId, signal });
}

/** @deprecated Prefer `generateKubeezMusicFiles` when the API returns multiple `songs`. */
export async function generateKubeezMusicBlob(params: GenerateKubeezMusicParams): Promise<Blob> {
  const files = await generateKubeezMusicFiles(params);
  const first = files[0];
  if (!first) {
    throw new Error('No music file returned');
  }
  return first.blob;
}

export interface KubeezDialogueLine {
  text: string;
  voice?: string;
}

export interface GenerateKubeezDialogueParams {
  apiKey: string;
  baseUrl?: string;
  dialogue: KubeezDialogueLine[];
  stability?: number;
  language_code?: string;
  signal?: AbortSignal;
}

/**
 * POST /v1/generate/dialogue, poll GET /v1/generate/dialogue/{id} when async.
 * (Public OpenAPI lists only POST; status route follows the same pattern as music.)
 */
export async function generateKubeezDialogueBlob(params: GenerateKubeezDialogueParams): Promise<Blob> {
  const {
    apiKey,
    baseUrl,
    dialogue,
    stability = 0.5,
    language_code = 'auto',
    signal,
  } = params;

  if (!dialogue.length || !dialogue.some((d) => d.text.trim().length > 0)) {
    throw new Error('Add at least one line of dialogue text.');
  }

  const root = resolveKubeezApiBaseUrl(baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  const payload = {
    dialogue: dialogue.map((d) => ({
      text: d.text,
      ...(d.voice !== undefined && d.voice !== '' ? { voice: d.voice } : {}),
    })),
    stability,
    language_code,
  };

  const startRes = await fetch(`${root}/v1/generate/dialogue`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  const startBody = await parseJsonResponse(startRes);
  if (!startRes.ok) {
    const msg = extractErrorMessage(startBody) ?? `Kubeez dialogue request failed (${startRes.status})`;
    throw new Error(msg);
  }

  const immediateUrl = firstAudioOutputUrl(startBody);
  if (immediateUrl) {
    if (import.meta.env.DEV) {
      logger.debug('Kubeez dialogue completed inline', {});
    }
    return downloadAudioUrl(immediateUrl, signal);
  }

  const generationId = extractGenerationId(startBody);
  if (!generationId) {
    logger.error('Unexpected Kubeez dialogue start response', startBody);
    throw new Error('Kubeez did not return a dialogue generation id');
  }

  if (import.meta.env.DEV) {
    logger.debug('Kubeez dialogue generation started', { generationId });
  }

  return pollKubeezDialogueJob({ root, apiKey, generationId, signal });
}
