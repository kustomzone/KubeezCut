import type { KubeezMediaModelOption } from './kubeez-models';

const STORAGE_KEY = 'kubeezcut:kubeez-grouped-models:v1';

/** Models cache is considered fresh for 5 minutes — skip live API fetch. */
const MODELS_CACHE_FRESH_MS = 5 * 60 * 1000;
/** After 30 minutes the cache is too stale to serve at all while waiting for API. */
const MODELS_CACHE_MAX_AGE_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// ETA cache — estimated generation times per model, cached for 24 hours.
// ---------------------------------------------------------------------------

const ETA_STORAGE_KEY = 'kubeezcut:model-eta:v1';
const ETA_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface EtaCachePayload {
  /** model_id → estimatedTimeSeconds */
  byModel: Record<string, number>;
  savedAt: number;
}

export function readModelEtaCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ETA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as EtaCachePayload;
    if (Date.now() - parsed.savedAt > ETA_MAX_AGE_MS) return {};
    return parsed.byModel ?? {};
  } catch { return {}; }
}

export function writeModelEtaCache(models: KubeezMediaModelOption[]): void {
  try {
    const byModel: Record<string, number> = { ...readModelEtaCache() };
    for (const m of models) {
      if (typeof m.estimatedTimeSeconds === 'number' && m.estimatedTimeSeconds > 0) {
        byModel[m.model_id] = m.estimatedTimeSeconds;
      }
    }
    const payload: EtaCachePayload = { byModel, savedAt: Date.now() };
    localStorage.setItem(ETA_STORAGE_KEY, JSON.stringify(payload));
  } catch { /* quota / private mode */ }
}

export function getModelEta(modelId: string): number | undefined {
  return readModelEtaCache()[modelId];
}

export type KubeezGroupedModelsCachePayload = {
  imageModels: KubeezMediaModelOption[];
  videoModels: KubeezMediaModelOption[];
  musicModels: KubeezMediaModelOption[];
  savedAt: number;
};

function parsePayload(raw: unknown): KubeezGroupedModelsCachePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const imageModels = o.imageModels;
  const videoModels = o.videoModels;
  const musicModels = o.musicModels;
  const savedAt = o.savedAt;
  if (!Array.isArray(imageModels) || !Array.isArray(videoModels) || !Array.isArray(musicModels)) {
    return null;
  }
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null;
  return {
    imageModels: imageModels as KubeezMediaModelOption[],
    videoModels: videoModels as KubeezMediaModelOption[],
    musicModels: musicModels as KubeezMediaModelOption[],
    savedAt,
  };
}

/** Last grouped snapshot from a successful Kubeez sync (browser localStorage). */
export function readKubeezGroupedModelsCache(): KubeezGroupedModelsCachePayload | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    return parsePayload(JSON.parse(s) as unknown);
  } catch {
    return null;
  }
}

export function writeKubeezGroupedModelsCache(payload: {
  imageModels: KubeezMediaModelOption[];
  videoModels: KubeezMediaModelOption[];
  musicModels: KubeezMediaModelOption[];
}): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const data: KubeezGroupedModelsCachePayload = { ...payload, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Union by `model_id`: API/live rows win on clash; cache-only ids are kept so the grid
 * stays stable when the API omits rows temporarily or failed last time.
 */
/** True if cache exists and is younger than MODELS_CACHE_FRESH_MS (no API call needed). */
export function isModelsCacheFresh(): boolean {
  const cached = readKubeezGroupedModelsCache();
  if (!cached) return false;
  return Date.now() - cached.savedAt < MODELS_CACHE_FRESH_MS;
}

/** True if cache exists and is younger than MODELS_CACHE_MAX_AGE_MS (safe to serve while revalidating). */
export function isModelsCacheUsable(): boolean {
  const cached = readKubeezGroupedModelsCache();
  if (!cached) return false;
  return Date.now() - cached.savedAt < MODELS_CACHE_MAX_AGE_MS;
}

export function mergeModelListsById(
  apiList: KubeezMediaModelOption[],
  cacheList: KubeezMediaModelOption[] | undefined
): KubeezMediaModelOption[] {
  if (!cacheList?.length) return apiList;
  const byId = new Map<string, KubeezMediaModelOption>();
  for (const m of cacheList) {
    if (m?.model_id) byId.set(m.model_id, m);
  }
  for (const m of apiList) {
    if (m?.model_id) byId.set(m.model_id, m);
  }
  return [...byId.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
  );
}

export function mergeWithCacheAugment(
  apiList: KubeezMediaModelOption[],
  cacheList: KubeezMediaModelOption[] | undefined
): { list: KubeezMediaModelOption[]; addedFromCache: boolean } {
  if (!cacheList?.length) return { list: apiList, addedFromCache: false };
  const apiIds = new Set(apiList.map((m) => m.model_id));
  const merged = mergeModelListsById(apiList, cacheList);
  const addedFromCache = merged.some((m) => !apiIds.has(m.model_id));
  return { list: merged, addedFromCache };
}
