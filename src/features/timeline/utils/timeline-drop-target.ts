/**
 * Find which timeline lane row (track) is under the pointer, for media drops.
 * Prefer hit-testing the canvas area (inside `.timeline-container`); track headers use their own handlers.
 */
export function resolveDropTargetTrackIdFromPoint(clientX: number, clientY: number): string | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!(el instanceof Element)) continue;
    const row = el.closest('[data-track-id]');
    if (!row) continue;
    if (!row.closest('.timeline-container')) continue;
    const id = row.getAttribute('data-track-id');
    if (id) return id;
  }
  return null;
}
