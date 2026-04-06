/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  isKubeezReferenceFileSizeAllowed,
  isKubeezReferenceFileSizeAllowedForModel,
  isKubeezReferenceMimeAllowed,
  KUBEEZ_REFERENCE_MAX_INPUT_FILE_SIZE_BYTES,
} from './kubeez-file-restrictions';

describe('kubeez-file-restrictions', () => {
  it('allows jpeg/png/webp and common video types', () => {
    expect(isKubeezReferenceMimeAllowed({ type: 'image/jpeg' } as File)).toBe(true);
    expect(isKubeezReferenceMimeAllowed({ type: 'video/mp4' } as File)).toBe(true);
    expect(isKubeezReferenceMimeAllowed({ type: 'audio/wav' } as File)).toBe(true);
  });

  it('rejects unknown image subtype', () => {
    expect(isKubeezReferenceMimeAllowed({ type: 'image/gif' } as File)).toBe(false);
  });

  it('enforces max input size', () => {
    const ok = { size: KUBEEZ_REFERENCE_MAX_INPUT_FILE_SIZE_BYTES } as File;
    const big = { size: KUBEEZ_REFERENCE_MAX_INPUT_FILE_SIZE_BYTES + 1 } as File;
    expect(isKubeezReferenceFileSizeAllowed(ok)).toBe(true);
    expect(isKubeezReferenceFileSizeAllowed(big)).toBe(false);
  });

  it('per-model size caps motion video at min(100MB, 50MB) pre-upload', () => {
    const f = { size: 51 * 1024 * 1024, type: 'video/mp4' } as File;
    expect(isKubeezReferenceFileSizeAllowedForModel(f, 'kling-3-0-motion-control-720p')).toBe(false);
    const ok = { size: 50 * 1024 * 1024, type: 'video/mp4' } as File;
    expect(isKubeezReferenceFileSizeAllowedForModel(ok, 'kling-3-0-motion-control-720p')).toBe(true);
  });
});
