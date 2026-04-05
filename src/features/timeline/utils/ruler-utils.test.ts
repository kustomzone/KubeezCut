import { describe, expect, it } from 'vitest';
import { formatRulerLabel, getRulerConfig, isRulerThirdGridTick, shouldShowLabel } from './ruler-utils';

describe('ruler-utils', () => {
  it('formats second boundaries as MM:SS (and H:MM:SS from 1h)', () => {
    expect(formatRulerLabel({ timeInSeconds: 0, fps: 30 })).toBe('00:00');
    expect(formatRulerLabel({ timeInSeconds: 5, fps: 30 })).toBe('00:05');
    expect(formatRulerLabel({ timeInSeconds: 65, fps: 30 })).toBe('01:05');
    expect(formatRulerLabel({ timeInSeconds: 3600, fps: 30 })).toBe('1:00:00');
  });

  it('formats sub-second label times as Nf', () => {
    expect(formatRulerLabel({ timeInSeconds: 2 / 30, fps: 30 })).toBe('2f');
    expect(formatRulerLabel({ timeInSeconds: 10 / 30, fps: 30 })).toBe('10f');
  });

  it('shouldShowLabel is true on label interval multiples', () => {
    expect(shouldShowLabel({ time: 0, labelIntervalSeconds: 0.5 })).toBe(true);
    expect(shouldShowLabel({ time: 0.5, labelIntervalSeconds: 0.5 })).toBe(true);
    expect(shouldShowLabel({ time: 0.25, labelIntervalSeconds: 0.5 })).toBe(false);
  });

  it('getRulerConfig returns positive intervals; tick divides label in frame space', () => {
    const fps = 30;
    const a = getRulerConfig({ pixelsPerSecond: 200, fps });
    expect(a.labelIntervalSeconds).toBeGreaterThan(0);
    expect(a.tickIntervalSeconds).toBeGreaterThan(0);
    const labelFrames = Math.round(a.labelIntervalSeconds * fps);
    const tickFrames = Math.round(a.tickIntervalSeconds * fps);
    expect(tickFrames).toBeGreaterThan(0);
    expect(labelFrames % tickFrames).toBe(0);
  });

  it('prefers whole-second label steps when zoom allows (timecode-style)', () => {
    const fps = 24;
    const a = getRulerConfig({ pixelsPerSecond: 45, fps });
    expect(a.labelIntervalSeconds).toBe(3);
  });

  it('isRulerThirdGridTick marks 1/3 and 2/3 between majors when label interval is 3s+', () => {
    expect(isRulerThirdGridTick(1, 3)).toBe(true);
    expect(isRulerThirdGridTick(2, 3)).toBe(true);
    expect(isRulerThirdGridTick(0, 3)).toBe(false);
    expect(isRulerThirdGridTick(3, 3)).toBe(false);
    expect(isRulerThirdGridTick(1.5, 3)).toBe(false);
  });
});
