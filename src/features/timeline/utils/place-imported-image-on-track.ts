import type { MediaMetadata } from '@/types/storage';
import { findNearestAvailableSpace } from './collision-utils';
import {
  buildDroppedMediaTimelineItem,
  getDroppedMediaDurationInFrames,
} from './dropped-media';
import {
  getMediaType,
  resolveMediaUrl,
} from '@/features/timeline/deps/media-library-resolver';
import { mediaLibraryService } from '@/features/timeline/deps/media-library-service';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { addItem } from '@/features/timeline/stores/actions/item-actions';
import { createLogger } from '@/shared/logging/logger';

const logger = createLogger('PlaceImportedImage');

export interface PlaceImportedImageOnTrackParams {
  trackId: string;
  dropFrame: number;
  media: MediaMetadata;
  fps: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Resolves blob URLs, builds an image or video timeline item at the nearest free slot (same rules as drag-drop),
 * and adds it through the command stack.
 */
export async function placeKubeezGeneratedMediaOnTrack(
  params: PlaceImportedImageOnTrackParams
): Promise<void> {
  const { trackId, dropFrame, media, fps, canvasWidth, canvasHeight } = params;

  const kind = getMediaType(media.mimeType);
  if (kind !== 'image' && kind !== 'video' && kind !== 'audio') {
    throw new Error('Only image, video, or audio generated media can be placed on the timeline.');
  }

  const itemDuration = getDroppedMediaDurationInFrames(media, kind, fps);
  const storeItems = useTimelineStore.getState().items;
  const finalPosition = findNearestAvailableSpace(
    Math.max(0, dropFrame),
    itemDuration,
    trackId,
    storeItems
  );

  if (finalPosition === null) {
    throw new Error('No space on this track for the new clip.');
  }

  const [blobUrl, thumbnailUrl] = await Promise.all([
    resolveMediaUrl(media.id),
    mediaLibraryService.getThumbnailBlobUrl(media.id),
  ]);

  if (!blobUrl) {
    logger.error('Failed to resolve media URL', { mediaId: media.id });
    throw new Error('Could not load the new media from the library.');
  }

  const item = buildDroppedMediaTimelineItem({
    media,
    mediaId: media.id,
    mediaType: kind,
    label: media.fileName,
    timelineFps: fps,
    blobUrl,
    thumbnailUrl,
    canvasWidth,
    canvasHeight,
    placement: {
      trackId,
      from: finalPosition,
      durationInFrames: itemDuration,
    },
  });

  addItem(item);
}

/** @deprecated Use `placeKubeezGeneratedMediaOnTrack` */
export const placeImportedImageOnTrack = placeKubeezGeneratedMediaOnTrack;
