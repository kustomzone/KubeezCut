/**
 * Interaction Perf Monitor — DEV-only instrumentation for mouse-driven hot paths.
 *
 * Records per-frame work for named interaction scopes (clip-drag, audio-volume-drag, etc.)
 * so slow handlers can be spotted from the console. Values are only recorded in DEV to keep
 * production bundles clean (`measure()` is a no-op when `import.meta.env.DEV === false`).
 *
 * Usage in code:
 *
 *   import { measureInteraction } from '@/shared/logging/interaction-perf-monitor';
 *   const end = measureInteraction('clip-drag');
 *   // ... heavy work ...
 *   end();
 *
 * Usage in the browser console:
 *
 *   __INTERACTION_PERF__.dump()     — table of all recorded scopes (mean / p95 / max / slow)
 *   __INTERACTION_PERF__.dump('clip-drag')  — detail for a single scope
 *   __INTERACTION_PERF__.reset()    — clear accumulated data
 *   __INTERACTION_PERF__.threshold = 8  — change the "slow frame" threshold (ms)
 */

export interface InteractionPerfSample {
  scope: string;
  durationMs: number;
  ts: number;
}

interface ScopeStats {
  count: number;
  slowCount: number;
  totalMs: number;
  maxMs: number;
  recent: number[];
}

const MAX_RECENT_PER_SCOPE = 240;
/** Frames slower than this are counted as "slow" and (optionally) logged to the console. */
const DEFAULT_SLOW_THRESHOLD_MS = 16;
/** Cap on live console warnings per scope to avoid flooding devtools during long drags. */
const MAX_LIVE_WARNINGS_PER_SCOPE = 10;

function createMonitor() {
  const stats = new Map<string, ScopeStats>();
  const liveWarnCount = new Map<string, number>();
  const lastIntervalTs = new Map<string, number>();
  let slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS;
  let logLiveWarnings = true;

  function getOrCreate(scope: string): ScopeStats {
    let s = stats.get(scope);
    if (!s) {
      s = { count: 0, slowCount: 0, totalMs: 0, maxMs: 0, recent: [] };
      stats.set(scope, s);
    }
    return s;
  }

  function record(scope: string, durationMs: number) {
    const s = getOrCreate(scope);
    s.count += 1;
    s.totalMs += durationMs;
    if (durationMs > s.maxMs) s.maxMs = durationMs;
    s.recent.push(durationMs);
    if (s.recent.length > MAX_RECENT_PER_SCOPE) s.recent.shift();

    if (durationMs > slowThresholdMs) {
      s.slowCount += 1;
      if (logLiveWarnings) {
        const warned = liveWarnCount.get(scope) ?? 0;
        if (warned < MAX_LIVE_WARNINGS_PER_SCOPE) {
          liveWarnCount.set(scope, warned + 1);
          console.warn(
            `[perf] %c${scope}%c took %c${durationMs.toFixed(1)}ms%c (> ${slowThresholdMs}ms budget)`,
            'color:#f97316;font-weight:bold',
            'color:inherit',
            'color:#ef4444;font-weight:bold',
            'color:inherit',
          );
        }
      }
    }
  }

  function measure(scope: string): () => void {
    const start = performance.now();
    return () => {
      record(scope, performance.now() - start);
    };
  }

  /**
   * Record the elapsed time since the last `recordInterval(scope)` call for this scope.
   * The first call after a reset primes the timestamp without recording a sample, so the
   * resulting series reflects real gaps between events (e.g. between `mousemove` dispatches).
   */
  function recordInterval(scope: string): void {
    const now = performance.now();
    const last = lastIntervalTs.get(scope);
    lastIntervalTs.set(scope, now);
    if (last !== undefined) {
      record(scope, now - last);
    }
  }

  function resetInterval(scope?: string): void {
    if (scope === undefined) {
      lastIntervalTs.clear();
    } else {
      lastIntervalTs.delete(scope);
    }
  }

  function reset() {
    stats.clear();
    liveWarnCount.clear();
    lastIntervalTs.clear();
  }

  function quantile(sortedAsc: number[], q: number): number {
    if (sortedAsc.length === 0) return 0;
    const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * q));
    return sortedAsc[idx]!;
  }

  function statsRow(scope: string, s: ScopeStats) {
    const sorted = [...s.recent].sort((a, b) => a - b);
    const mean = s.count > 0 ? s.totalMs / s.count : 0;
    return {
      scope,
      samples: s.count,
      'mean (ms)': mean.toFixed(2),
      'p50 (ms)': quantile(sorted, 0.5).toFixed(2),
      'p95 (ms)': quantile(sorted, 0.95).toFixed(2),
      'p99 (ms)': quantile(sorted, 0.99).toFixed(2),
      'max (ms)': s.maxMs.toFixed(2),
      'slow (>budget)': s.slowCount,
      'slow %': s.count > 0 ? ((s.slowCount / s.count) * 100).toFixed(1) + '%' : '-',
    };
  }

  function dump(scope?: string) {
    /* eslint-disable no-console */
    if (scope) {
      const s = stats.get(scope);
      if (!s) {
        console.log(`[perf] no samples recorded for scope "${scope}"`);
        return;
      }
      console.group(`%c${scope}`, 'font-weight:bold;color:#60a5fa');
      console.table(statsRow(scope, s));
      if (s.recent.length > 0) {
        const last = s.recent.slice(-30).map((v) => v.toFixed(2));
        console.log('last 30 durations (ms):', last.join(' | '));
      }
      console.groupEnd();
      return;
    }

    if (stats.size === 0) {
      console.log('[perf] no interaction samples recorded yet — try dragging a clip first');
      return;
    }
    console.group('%cInteraction Perf', 'font-weight:bold;font-size:14px;color:#60a5fa');
    console.log(`Slow-frame threshold: ${slowThresholdMs}ms (change via __INTERACTION_PERF__.threshold = N)`);
    const rows = [...stats.entries()]
      .sort((a, b) => (b[1].totalMs / b[1].count) - (a[1].totalMs / a[1].count))
      .map(([k, s]) => statsRow(k, s));
    console.table(rows);
    console.groupEnd();
    /* eslint-enable no-console */
  }

  return {
    record,
    recordInterval,
    resetInterval,
    measure,
    reset,
    dump,
    get threshold() { return slowThresholdMs; },
    set threshold(v: number) { slowThresholdMs = v; },
    get liveWarnings() { return logLiveWarnings; },
    set liveWarnings(v: boolean) { logLiveWarnings = v; },
    get stats() { return stats; },
  };
}

export type InteractionPerfMonitor = ReturnType<typeof createMonitor>;

let _instance: InteractionPerfMonitor | null = null;

/** Lazy-init singleton. Exposes itself on `window.__INTERACTION_PERF__` for console access. */
export function getInteractionPerfMonitor(): InteractionPerfMonitor {
  if (!_instance) {
    _instance = createMonitor();
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__INTERACTION_PERF__ = _instance;
    }
  }
  return _instance;
}

/**
 * Measure one synchronous unit of interaction work. DEV only — the returned `end` is a no-op
 * in production so bundlers can tree-shake the measure call sites.
 */
export function measureInteraction(scope: string): () => void {
  if (!import.meta.env.DEV) return () => { /* no-op in prod */ };
  return getInteractionPerfMonitor().measure(scope);
}

/**
 * Record the interval since the previous call with the same scope. Use for sampling event
 * cadence (mousemove arrival rate, scroll events, etc.) to catch browser starvation that a
 * handler-duration scope can't see. The first call primes the clock without recording.
 */
export function recordInteractionInterval(scope: string): void {
  if (!import.meta.env.DEV) return;
  getInteractionPerfMonitor().recordInterval(scope);
}

export function resetInteractionInterval(scope?: string): void {
  if (!import.meta.env.DEV) return;
  getInteractionPerfMonitor().resetInterval(scope);
}

/**
 * Measure from the call site until the next rAF fires. Captures React commit / scheduler /
 * layout cost that a synchronous scope misses: start this right after scheduling a state
 * update; the scope closes at the top of the next animation frame.
 */
export function measureInteractionToNextFrame(scope: string): void {
  if (!import.meta.env.DEV) return;
  const end = getInteractionPerfMonitor().measure(scope);
  requestAnimationFrame(end);
}
