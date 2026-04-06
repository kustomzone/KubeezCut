import { describe, expect, it } from 'vitest';
import { getGpuEffect, getGpuEffectDefaultParams } from './index';

describe('GPU effect registry', () => {
  it('registers the dither effect with stable default uniforms', () => {
    const effect = getGpuEffect('gpu-dither');
    if (!effect) throw new Error('missing gpu-dither');
    expect(effect?.category).toBe('stylize');

    const defaults = getGpuEffectDefaultParams('gpu-dither');
    expect(defaults).toEqual({
      pattern: 'bayer4',
      mode: 'image',
      style: 'threshold',
      shape: 'square',
      palette: 'gameboy',
      cellSize: 8,
      angle: 45,
      scale: 100,
      offsetX: 0,
      offsetY: 0,
    });

    expect(Array.from(effect.packUniforms(defaults, 1920, 1080)!)).toEqual([
      8,
      45,
      100,
      1920,
      1080,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
    ]);

    expect(effect.params?.angle?.visibleWhen?.(defaults) ?? false).toBe(false);
    expect(effect.params?.angle?.visibleWhen?.({ ...defaults, mode: 'linear' }) ?? false).toBe(true);
    expect(effect.params?.scale?.visibleWhen?.(defaults) ?? false).toBe(false);
    expect(effect.params?.scale?.visibleWhen?.({ ...defaults, mode: 'radial' }) ?? false).toBe(true);
  });

  it('registers the ascii effect with shader-friendly defaults', () => {
    const effect = getGpuEffect('gpu-ascii');
    if (!effect) throw new Error('missing gpu-ascii');
    expect(effect?.category).toBe('stylize');

    const defaults = getGpuEffectDefaultParams('gpu-ascii');
    expect(defaults).toEqual({
      charSet: 'standard',
      fontSize: 8,
      letterSpacing: 0,
      lineHeight: 1,
      matchSourceColor: true,
      textColor: '#ffffff',
      bgColor: '#0a0a0f',
      colorSaturation: 100,
      asciiOpacity: 100,
      originalOpacity: 0,
      contrast: 100,
      brightness: 0,
      invert: false,
    });

    expect(Array.from(effect.packUniforms(defaults, 1920, 1080)!)).toEqual(Array.from(new Float32Array([
      8,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      1,
      1920,
      1080,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      10 / 255,
      10 / 255,
      15 / 255,
      1,
    ])));

    expect(effect.params?.textColor?.visibleWhen?.(defaults) ?? false).toBe(false);
    expect(effect.params?.textColor?.visibleWhen?.({ ...defaults, matchSourceColor: false }) ?? false).toBe(true);
    expect(effect.params?.colorSaturation?.visibleWhen?.(defaults) ?? false).toBe(true);
    expect(effect.params?.colorSaturation?.visibleWhen?.({ ...defaults, matchSourceColor: false }) ?? false).toBe(false);
  });
});
