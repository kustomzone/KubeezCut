import { describe, expect, it } from 'vitest';

import { getTimelineWidth, getZoomToFitLevel } from './timeline-layout';

describe('timeline layout helpers', () => {
  it('keeps zoom-to-fit framing unchanged', () => {
    expect(getZoomToFitLevel(1000, 10)).toBeCloseTo(0.95);
  });

  it('caps zoom-to-fit duration so long timelines match the same framing as a 30s window', () => {
    expect(getZoomToFitLevel(1000, 120)).toBeCloseTo(getZoomToFitLevel(1000, 30));
  });

  it('does not add trailing scroll room when content already fits the viewport', () => {
    expect(getTimelineWidth({ contentWidth: 950, viewportWidth: 1000 })).toBe(1000);
  });

  it('preserves the same tail room when content already exceeds the viewport', () => {
    expect(getTimelineWidth({ contentWidth: 1500, viewportWidth: 1000 })).toBe(1850);
  });
});
