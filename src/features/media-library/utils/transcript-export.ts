import type { MediaTranscript, MediaTranscriptSegment } from '@/types/storage';

function formatSrtTimestamp(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/** SubRip subtitles — usable in players, YouTube upload, Premiere, etc. */
export function segmentsToSrt(segments: readonly MediaTranscriptSegment[]): string {
  const lines: string[] = [];
  let n = 1;
  for (const seg of segments) {
    const t = seg.text.trim();
    if (!t || seg.end <= seg.start) continue;
    const start = formatSrtTimestamp(seg.start);
    const end = formatSrtTimestamp(Math.max(seg.start + 0.04, seg.end));
    lines.push(String(n), `${start} --> ${end}`, t, '');
    n += 1;
  }
  return lines.join('\n');
}

export function triggerDownloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function isMediaTranscriptPayload(data: unknown): data is MediaTranscript {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.text === 'string'
    && Array.isArray(o.segments)
    && o.segments.every(
      (s) =>
        s
        && typeof s === 'object'
        && typeof (s as MediaTranscriptSegment).text === 'string'
        && typeof (s as MediaTranscriptSegment).start === 'number'
        && typeof (s as MediaTranscriptSegment).end === 'number'
    )
  );
}

export async function parseMediaTranscriptBlob(blob: Blob): Promise<MediaTranscript | null> {
  try {
    const raw = await blob.text();
    const data = JSON.parse(raw) as unknown;
    return isMediaTranscriptPayload(data) ? data : null;
  } catch {
    return null;
  }
}
