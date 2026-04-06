/**
 * Shared poll-status parsing for Kubeez GET /v1/generate/* responses.
 * APIs may nest `status` under `data`, `generation`, `job`, etc.
 */

function normalizeStatusString(v: unknown): string {
  if (typeof v === 'string') return v.toLowerCase().trim();
  return '';
}

export function isKubeezPlainObject(u: unknown): u is Record<string, unknown> {
  return u !== null && typeof u === 'object' && !Array.isArray(u);
}

/**
 * Resolves `status` / `state` from typical Kubeez async job envelopes.
 */
export function extractKubeezPollStatus(data: unknown): string {
  if (!isKubeezPlainObject(data)) return '';
  const direct =
    normalizeStatusString(data.status) ||
    normalizeStatusString(data.state) ||
    normalizeStatusString(data.job_status) ||
    normalizeStatusString(data.generation_status);
  if (direct) return direct;

  const nestedKeys = ['data', 'result', 'payload', 'generation', 'job'] as const;
  for (const k of nestedKeys) {
    const n = data[k];
    if (isKubeezPlainObject(n)) {
      const s =
        normalizeStatusString(n.status) ||
        normalizeStatusString(n.state) ||
        normalizeStatusString(n.job_status) ||
        normalizeStatusString(n.generation_status);
      if (s) return s;
    }
  }

  return '';
}
