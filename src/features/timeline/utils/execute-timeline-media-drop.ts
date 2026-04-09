import { createLogger } from '@/shared/logging/logger';
import type { TimelineItem as TimelineItemType } from '@/types/timeline';
import type { MediaMetadata } from '@/types/storage';
import { toast } from 'sonner';
import { useTimelineStore } from '../stores/timeline-store';
import { useCompositionsStore } from '../stores/compositions-store';
import { useMediaLibraryStore } from '@/features/timeline/deps/media-library-store';
import { useProjectStore } from '@/features/timeline/deps/projects';
import { mediaLibraryService } from '@/features/timeline/deps/media-library-service';
import {
  resolveMediaUrl,
  getMediaDragData,
  getMediaType,
  extractValidMediaFileEntriesFromDataTransfer,
  type CompositionDragData,
} from '@/features/timeline/deps/media-library-resolver';
import { mapWithConcurrency } from '@/shared/async/async-utils';
import { useCompositionNavigationStore } from '../stores/composition-navigation-store';
import { wouldCreateCompositionCycle } from './composition-graph';
import {
  createTimelineTemplateItem,
  getDefaultGeneratedLayerDurationInFrames,
  isTimelineTemplateDragData,
} from './generated-layer-items';
import { findCompatibleTrackForItemType } from './track-item-compatibility';
import {
  buildDroppedMediaTimelineItems,
  getDroppedMediaDurationInFrames,
  type DroppableMediaType,
} from './dropped-media';
import {
  buildDroppedCompositionTimelineItems,
  compositionHasOwnedAudio,
} from './dropped-composition';
import { planTrackMediaDropPlacements } from './track-media-drop';
import { preflightFirstTimelineVideoProjectMatch } from './external-file-project-match';
import { findNearestAvailableSpace } from './collision-utils';
import { resolveEffectiveTrackStates } from './group-utils';
import { createDefaultClassicTracks } from './classic-tracks';

const logger = createLogger('ExecuteTimelineMediaDrop');

const MULTI_DROP_METADATA_CONCURRENCY = 3;

interface DragMediaItem {
  mediaId: string;
  mediaType: DroppableMediaType;
  fileName: string;
  duration: number;
}

export interface DroppedMediaEntry {
  media: MediaMetadata;
  mediaId: string;
  mediaType: DroppableMediaType;
  label: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDroppableMediaType(value: unknown): value is DroppableMediaType {
  return value === 'video' || value === 'audio' || value === 'image';
}

function isValidDragMediaItem(value: unknown): value is DragMediaItem {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DragMediaItem>;
  return isNonEmptyString(candidate.mediaId)
    && isDroppableMediaType(candidate.mediaType)
    && isNonEmptyString(candidate.fileName)
    && typeof candidate.duration === 'number'
    && Number.isFinite(candidate.duration);
}

function getCurrentCanvasSize() {
  const liveProject = useProjectStore.getState().currentProject;
  return {
    width: liveProject?.metadata.width ?? 1920,
    height: liveProject?.metadata.height ?? 1080,
  };
}

/** Same rules as `TimelineTrack` drop: locked / hidden / muted lanes reject library/file drops. */
export function isTimelineTrackDropDisabled(trackId: string): boolean {
  const track = useTimelineStore.getState().tracks.find((t) => t.id === trackId);
  if (!track) return true;
  const effective = resolveEffectiveTrackStates(useTimelineStore.getState().tracks).find((t) => t.id === trackId);
  if (!effective) return track.locked;
  if (effective.locked) return true;
  const kind = effective.kind;
  if (kind === 'audio') return effective.muted;
  if (kind === 'video') return effective.visible === false;
  return effective.visible === false || effective.muted;
}

export function timelineDragAcceptsMediaTypes(e: React.DragEvent): boolean {
  if (getMediaDragData()) return true;
  const types = e.dataTransfer.types;
  if (types.includes('Files')) return true;
  if (types.includes('application/json')) return true;
  if (types.includes('text/plain')) return true;
  return false;
}

/**
 * Browsers are inconsistent about exposing custom MIME types on `drop`.
 * Prefer DataTransfer, then `text/plain` (often mirrored), then the drag cache set on dragstart.
 */
function getLibraryDragJsonForDrop(dataTransfer: DataTransfer): string | null {
  const json = dataTransfer.getData('application/json');
  if (json && json.trim()) {
    return json;
  }
  const plain = dataTransfer.getData('text/plain');
  if (plain && plain.trim().startsWith('{')) {
    return plain;
  }
  const cached = getMediaDragData();
  if (cached) {
    try {
      return JSON.stringify(cached);
    } catch {
      return null;
    }
  }
  return null;
}

async function resolveTimelineItemsForEntries(
  entries: DroppedMediaEntry[],
  dropFrame: number,
  dropTargetTrackId: string,
  preferNewAudioLane?: boolean,
): Promise<{ items: TimelineItemType[]; tracks: ReturnType<typeof useTimelineStore.getState>['tracks'] }> {
  const fps = useTimelineStore.getState().fps;
  const { plannedItems, tracks: workingTracks } = planTrackMediaDropPlacements({
    entries: entries.map((entry) => ({
      payload: entry,
      label: entry.label,
      mediaType: entry.mediaType,
      durationInFrames: getDroppedMediaDurationInFrames(entry.media, entry.mediaType, fps),
      hasLinkedAudio: entry.mediaType === 'video' && !!entry.media.audioCodec,
    })),
    dropFrame,
    tracks: useTimelineStore.getState().tracks,
    existingItems: useTimelineStore.getState().items,
    dropTargetTrackId,
    preferNewAudioLane,
  });

  if (plannedItems.length === 0) {
    return { items: [], tracks: workingTracks };
  }

  const resolvedTimelineItems = await mapWithConcurrency(
    plannedItems,
    MULTI_DROP_METADATA_CONCURRENCY,
    async (planned): Promise<TimelineItemType[] | null> => {
      const { entry, placements } = planned;
      const droppedEntry = entry.payload;
      const needsThumbnail = entry.mediaType === 'video' || entry.mediaType === 'image';
      const [blobUrl, thumbnailUrl] = await Promise.all([
        resolveMediaUrl(droppedEntry.mediaId),
        needsThumbnail
          ? mediaLibraryService.getThumbnailBlobUrl(droppedEntry.mediaId)
          : Promise.resolve(null),
      ]);

      if (!blobUrl) {
        logger.error('Failed to get media blob URL for', entry.label);
        return null;
      }

      const primaryPlacement = placements.find((placement) => placement.mediaType !== 'audio') ?? placements[0]!;
      const linkedAudioPlacement = placements.find((placement) => placement.mediaType === 'audio');
      const canvasSize = getCurrentCanvasSize();

      return buildDroppedMediaTimelineItems({
        media: droppedEntry.media,
        mediaId: droppedEntry.mediaId,
        mediaType: entry.mediaType,
        label: entry.label,
        timelineFps: fps,
        blobUrl,
        thumbnailUrl,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
        placement: {
          primary: {
            trackId: primaryPlacement.trackId,
            from: primaryPlacement.from,
            durationInFrames: primaryPlacement.durationInFrames,
          },
          linkedAudio: linkedAudioPlacement
            ? {
              trackId: linkedAudioPlacement.trackId,
              from: linkedAudioPlacement.from,
              durationInFrames: linkedAudioPlacement.durationInFrames,
            }
            : undefined,
        },
        linkVideoAudio: planned.linkVideoAudio,
      });
    }
  );

  return {
    items: resolvedTimelineItems.flatMap((timelineItems) => timelineItems ?? []),
    tracks: workingTracks,
  };
}

function buildTimelineTemplateItemForDrop(
  template: unknown,
  dropFrame: number,
  dropTargetTrackId: string,
): TimelineItemType | null {
  if (!isTimelineTemplateDragData(template)) {
    return null;
  }

  const store = useTimelineStore.getState();
  const fps = store.fps;
  const durationInFrames = getDefaultGeneratedLayerDurationInFrames(fps);
  const targetTrack = findCompatibleTrackForItemType({
    tracks: store.tracks,
    items: store.items,
    itemType: template.itemType,
    preferredTrackId: dropTargetTrackId,
    allowPreferredTrackFallback: false,
  });
  if (!targetTrack) {
    return null;
  }

  const finalPosition = findNearestAvailableSpace(
    Math.max(0, dropFrame),
    durationInFrames,
    targetTrack.id,
    store.items,
  );
  if (finalPosition === null) {
    return null;
  }

  const canvasSize = getCurrentCanvasSize();

  return createTimelineTemplateItem({
    template,
    placement: {
      trackId: targetTrack.id,
      from: finalPosition,
      durationInFrames,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    },
  });
}

export interface ExecuteTimelineMediaDropParams {
  dataTransfer: DataTransfer;
  dropFrame: number;
  dropTargetTrackId: string;
  /** From audio lane bottom strip — spawn new row below hovered track. */
  preferNewAudioLane?: boolean;
}

/**
 * Shared implementation for placing media, compositions, templates, and files on the timeline.
 * Used by track lanes, the time ruler, and track headers.
 */
export async function executeTimelineMediaDrop({
  dataTransfer,
  dropFrame,
  dropTargetTrackId: initialDropTargetTrackId,
  preferNewAudioLane = false,
}: ExecuteTimelineMediaDropParams): Promise<void> {
  const { setTracks, tracks: tracksBefore } = useTimelineStore.getState();
  if (tracksBefore.length === 0) {
    setTracks(createDefaultClassicTracks());
  }
  const tracksAfter = useTimelineStore.getState().tracks;
  const dropTargetTrackId = tracksAfter.find((t) => t.id === initialDropTargetTrackId)
    ? initialDropTargetTrackId
    : (tracksAfter[0]?.id ?? initialDropTargetTrackId);

  if (isTimelineTrackDropDisabled(dropTargetTrackId)) {
    return;
  }

  const addItem = useTimelineStore.getState().addItem;
  const addItems = useTimelineStore.getState().addItems;
  const getMedia = useMediaLibraryStore.getState().mediaItems;
  const importHandlesForPlacement = useMediaLibraryStore.getState().importHandlesForPlacement;

  const rawJson = getLibraryDragJsonForDrop(dataTransfer);
  if (rawJson) {
    try {
      const data = JSON.parse(rawJson) as unknown;

      if (typeof data === 'object' && data !== null && (data as { type?: string }).type === 'composition') {
        const activeCompositionId = useCompositionNavigationStore.getState().activeCompositionId;
        const d = data as CompositionDragData;
        if (wouldCreateCompositionCycle({
          parentCompositionId: activeCompositionId,
          insertedCompositionId: d.compositionId,
          compositionById: useCompositionsStore.getState().compositionById,
        })) {
          return;
        }

        const { compositionId, name, durationInFrames } = d;
        const store = useTimelineStore.getState();
        const compositionById = useCompositionsStore.getState().compositionById;
        const composition = compositionById[compositionId];
        if (!composition) {
          logger.warn('Cannot drop composition: compound clip definition not found');
          return;
        }
        const { plannedItems, tracks: nextTracks } = planTrackMediaDropPlacements({
          entries: [{
            payload: data,
            label: name,
            mediaType: 'video',
            durationInFrames,
            hasLinkedAudio: compositionHasOwnedAudio({ composition, compositionById }),
          }],
          dropFrame,
          tracks: store.tracks,
          existingItems: store.items,
          dropTargetTrackId,
        });
        const plannedItem = plannedItems[0];
        if (!plannedItem) {
          logger.warn('Cannot drop composition: no available placement found');
          return;
        }

        if (nextTracks !== store.tracks) {
          useTimelineStore.getState().setTracks(nextTracks);
        }

        const droppedItems = buildDroppedCompositionTimelineItems({
          compositionId,
          composition,
          label: name,
          placements: plannedItem.placements,
        });
        if (droppedItems.length === 0) {
          logger.warn('Cannot drop composition: failed to build compound clip wrappers');
          return;
        }

        addItems(droppedItems);
        return;
      }

      if (isTimelineTemplateDragData(data)) {
        const templateItem = buildTimelineTemplateItemForDrop(data, dropFrame, dropTargetTrackId);
        if (!templateItem) {
          toast.error('Unable to add dropped timeline item');
          return;
        }

        addItem(templateItem);
        return;
      }

      let entries: DroppedMediaEntry[] = [];
      if (typeof data === 'object' && data !== null && (data as { type?: string }).type === 'media-items') {
        const rawItems = Array.isArray((data as { items?: unknown }).items)
          ? (data as { items: unknown[] }).items
          : [];
        const validItems = rawItems.filter(isValidDragMediaItem);
        if (validItems.length !== rawItems.length) {
          logger.warn('Skipping invalid media-items payload entries', {
            invalidCount: rawItems.length - validItems.length,
          });
        }

        const mediaById = new Map(getMedia.map((media) => [media.id, media]));
        entries = validItems.flatMap((dragItem: DragMediaItem) => {
          const media = mediaById.get(dragItem.mediaId);
          if (!media) {
            logger.error('Media not found:', dragItem.mediaId);
            return [];
          }

          return [{
            media,
            mediaId: dragItem.mediaId,
            mediaType: dragItem.mediaType,
            label: dragItem.fileName,
          }];
        });
      } else if (
        typeof data === 'object'
        && data !== null
        && (data as { type?: string }).type === 'media-item'
        && (data as { mediaId?: string }).mediaId
        && (data as { mediaType?: string }).mediaType
        && (data as { fileName?: string }).fileName
      ) {
        const d = data as { mediaId: string; mediaType: string; fileName: string };
        if (!isDroppableMediaType(d.mediaType)) {
          return;
        }

        const media = getMedia.find((entry) => entry.id === d.mediaId);
        if (!media) {
          logger.error('Media not found:', d.mediaId);
          return;
        }

        entries = [{
          media,
          mediaId: d.mediaId,
          mediaType: d.mediaType,
          label: d.fileName,
        }];
      }

      if (entries.length === 0) {
        return;
      }

      const dropResult = await resolveTimelineItemsForEntries(
        entries,
        dropFrame,
        dropTargetTrackId,
        preferNewAudioLane,
      );
      if (dropResult.items.length === 0) {
        toast.error('Unable to add dropped media items');
        return;
      }

      if (dropResult.tracks !== useTimelineStore.getState().tracks) {
        useTimelineStore.getState().setTracks(dropResult.tracks);
      }

      if (dropResult.items.length < entries.length) {
        toast.warning(`Some dropped media items could not be added: ${entries.length - dropResult.items.length} failed`);
      }

      if (dropResult.items.length === 1) {
        addItem(dropResult.items[0]!);
      } else {
        addItems(dropResult.items);
      }
      return;
    } catch (error) {
      logger.warn('Failed to parse drag payload, falling back to file-drop handling', error);
    }
  }

  if (!dataTransfer.types.includes('Files')) {
    return;
  }

  const { supported, entries, errors } = await extractValidMediaFileEntriesFromDataTransfer(dataTransfer);
  if (!supported) {
    toast.warning('Drag-drop not supported in this browser. Use Chrome or Edge.');
    return;
  }

  if (errors.length > 0) {
    toast.error(`Some files were rejected: ${errors.join(', ')}`);
  }

  if (entries.length === 0) {
    return;
  }

  try {
    await preflightFirstTimelineVideoProjectMatch(entries);
  } catch (error) {
    toast.error('Unable to inspect dropped file.', {
      description: error instanceof Error ? error.message : 'Please try again.',
    });
    return;
  }

  const importedMedia = await importHandlesForPlacement(entries.map((entry) => entry.handle));
  if (importedMedia.length === 0) {
    toast.error('Unable to import dropped files');
    return;
  }

  const droppedEntries: DroppedMediaEntry[] = importedMedia.flatMap((media) => {
    const mediaType = getMediaType(media.mimeType);
    if (!isDroppableMediaType(mediaType)) {
      return [];
    }
    return [{
      media,
      mediaId: media.id,
      mediaType,
      label: media.fileName,
    }];
  });

  if (droppedEntries.length === 0) {
    toast.warning('Dropped files were imported, but none could be placed on the timeline.');
    return;
  }

  const dropResult = await resolveTimelineItemsForEntries(
    droppedEntries,
    dropFrame,
    dropTargetTrackId,
    preferNewAudioLane,
  );
  if (dropResult.items.length === 0) {
    toast.error('Unable to add dropped files to the timeline');
    return;
  }

  if (dropResult.tracks !== useTimelineStore.getState().tracks) {
    useTimelineStore.getState().setTracks(dropResult.tracks);
  }

  if (dropResult.items.length < droppedEntries.length) {
    toast.warning(`Some dropped files could not be added: ${droppedEntries.length - dropResult.items.length} failed`);
  }

  if (dropResult.items.length === 1) {
    addItem(dropResult.items[0]!);
  } else {
    addItems(dropResult.items);
  }
}
