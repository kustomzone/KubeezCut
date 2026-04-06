import type { TimelineItem } from '@/types/timeline';
import type { CropSettings } from '@/types/transform';
import { getSourceDimensions } from '@/features/composition-runtime/utils/transform-resolver';
import { calculateMediaCropLayout } from '@/shared/utils/media-crop';

/**
 * Visible media rectangle inside the layer's local box (same space as transform width/height),
 * matching {@link ContainedMediaLayout} / export crop geometry.
 */
export function getContainedViewportInLayerSpace(
  item: TimelineItem,
  layerWidth: number,
  layerHeight: number,
  crop?: CropSettings,
): { x: number; y: number; width: number; height: number } | null {
  if (item.type !== 'video' && item.type !== 'image') return null;
  const src = getSourceDimensions(item);
  if (!src) return null;
  if (!Number.isFinite(layerWidth) || !Number.isFinite(layerHeight) || layerWidth <= 0 || layerHeight <= 0) {
    return null;
  }
  return calculateMediaCropLayout(
    src.width,
    src.height,
    layerWidth,
    layerHeight,
    crop,
  ).viewportRect;
}
