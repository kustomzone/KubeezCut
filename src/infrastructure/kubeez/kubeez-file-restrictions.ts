/**
 * Reference upload helpers aligned with KubeezWebsite `fileRestrictions.ts`
 * (`KubeezWebsite/src/components/video/config/fileRestrictions.ts`).
 *
 * Canonical limits live in `kubeez-web-file-restrictions.ts` (synced copy).
 */

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  getMaxFileSizeForModel,
  MAX_INPUT_FILE_SIZE,
} from './kubeez-web-file-restrictions';

export {
  getFileLimitForModel,
  getMaxFileSizeForModel,
  getFileSizeInMB,
  validateFileSize,
  validateFileType,
  validateKlingElementImage,
  validateKlingElementVideo,
  MAX_FILE_SIZE,
  MAX_INPUT_FILE_SIZE,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  KLING_MOTION_MAX_VIDEO_DURATION_SEC,
  KLING_MOTION_MIN_VIDEO_DURATION_SEC,
} from './kubeez-web-file-restrictions';

/** Alias: same MIME list as web `ACCEPTED_IMAGE_TYPES`. */
export const KUBEEZ_ACCEPTED_REFERENCE_IMAGE_TYPES = ACCEPTED_IMAGE_TYPES as readonly string[];

/** Alias: same MIME list as web `ACCEPTED_VIDEO_TYPES`. */
export const KUBEEZ_ACCEPTED_REFERENCE_VIDEO_TYPES = ACCEPTED_VIDEO_TYPES as readonly string[];

/** Pre-compression / picker cap (same as web `MAX_INPUT_FILE_SIZE`). */
export const KUBEEZ_REFERENCE_MAX_INPUT_FILE_SIZE_BYTES = MAX_INPUT_FILE_SIZE;

/** `accept` for `<input type="file">` — image + video MIME list + audio wildcard for music/dialogue refs. */
export const KUBEEZ_REFERENCE_FILE_ACCEPT =
  `${[...KUBEEZ_ACCEPTED_REFERENCE_IMAGE_TYPES, ...KUBEEZ_ACCEPTED_REFERENCE_VIDEO_TYPES].join(',')},audio/*`;

export function isKubeezReferenceMimeTypeStringAllowed(mimeType: string): boolean {
  const t = mimeType.trim();
  if (!t) return true;
  if (t.startsWith('audio/')) return true;
  return (
    (KUBEEZ_ACCEPTED_REFERENCE_IMAGE_TYPES as readonly string[]).includes(t) ||
    (KUBEEZ_ACCEPTED_REFERENCE_VIDEO_TYPES as readonly string[]).includes(t)
  );
}

export function isKubeezReferenceMimeAllowed(file: File): boolean {
  return isKubeezReferenceMimeTypeStringAllowed(file.type);
}

/**
 * Legacy: input cap only. Prefer `isKubeezReferenceFileSizeAllowedForModel` in the generate dialog.
 */
export function isKubeezReferenceFileSizeAllowed(file: File): boolean {
  return file.size <= KUBEEZ_REFERENCE_MAX_INPUT_FILE_SIZE_BYTES;
}

/**
 * Website order: per-model max from `getMaxFileSizeForModel`, then hard pre-upload ceiling
 * (`MAX_INPUT_FILE_SIZE`). Effective limit is the stricter of the two.
 */
export function isKubeezReferenceFileSizeAllowedForModel(file: File, modelId: string): boolean {
  const perModel = getMaxFileSizeForModel(modelId, file.type);
  const cap = Math.min(perModel, MAX_INPUT_FILE_SIZE);
  return file.size <= cap;
}
