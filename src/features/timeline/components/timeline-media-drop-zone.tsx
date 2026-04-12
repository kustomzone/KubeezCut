import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { TimelineItem as TimelineItemType } from '@/types/timeline';
import type { MediaMetadata } from '@/types/storage';
import { createLogger } from '@/shared/logging/logger';
import { useTimelineZoomContext } from '../contexts/timeline-zoom-context';
import { useTimelineStore } from '../stores/timeline-store';
import { useCompositionsStore } from '../stores/compositions-store';
import { useNewTrackZonePreviewStore, type NewTrackZoneGhostPreview } from '../stores/new-track-zone-preview-store';
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
import { findNearestAvailableSpace } from '../utils/collision-utils';
import { mapWithConcurrency } from '@/shared/async/async-utils';
import { useCompositionNavigationStore } from '../stores/composition-navigation-store';
import { wouldCreateCompositionCycle } from '../utils/composition-graph';
import {
  createTimelineTemplateItem,
  getDefaultGeneratedLayerDurationInFrames,
  isTimelineTemplateDragData,
} from '../utils/generated-layer-items';
import {
  buildDroppedMediaTimelineItems,
  getDroppedMediaDurationInFrames,
  type DroppableMediaType,
} from '../utils/dropped-media';
import {
  buildDroppedCompositionTimelineItems,
  compositionHasOwnedAudio,
} from '../utils/dropped-composition';
import {
  buildGhostPreviewsFromNewTrackZonePlan,
  planNewTrackZonePlacements,
} from '../utils/new-track-zone-media';
import { preflightFirstTimelineVideoProjectMatch } from '../utils/external-file-project-match';
import { getTimelineScrollContainer } from '../utils/timeline-scroll-container';

const logger = createLogger('TimelineMediaDropZone');

interface TimelineMediaDropZoneProps {
  height: number;
  zone: 'video' | 'audio';
  anchorTrackId: string;
  /** Video: top strip spawns a new lane above existing tracks; bottom is the slack strip under tracks. */
  placement?: 'top' | 'bottom';
}

export type GhostPreviewItem = NewTrackZoneGhostPreview;

interface DragMediaItem {
  mediaId: string;
  mediaType: DroppableMediaType;
  fileName: string;
  duration: number;
}

interface DroppedMediaEntry {
  media: MediaMetadata;
  mediaId: string;
  mediaType: DroppableMediaType;
  label: string;
}

interface PreviewEntry {
  label: string;
  mediaType: DroppableMediaType;
  duration?: number;
  hasLinkedAudio?: boolean;
}

const MULTI_DROP_METADATA_CONCURRENCY = 3;

// Ghost highlight classes removed — replaced by simplified blue zone highlight + ghost transitions.

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

export const TimelineMediaDropZone = memo(function TimelineMediaDropZone({
  height,
  zone,
  anchorTrackId,
  placement = 'bottom',
}: TimelineMediaDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setIsExternalDragOver] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const externalPreviewItemsRef = useRef<PreviewEntry[] | null>(null);
  const externalPreviewSignatureRef = useRef<string | null>(null);
  const externalPreviewPromiseRef = useRef<Promise<void> | null>(null);
  const externalPreviewTokenRef = useRef(0);
  const lastDragFrameRef = useRef(0);
  const rafIdRef = useRef<number>(0);
  const lastComputedFrameRef = useRef<number | null>(null);

  const addItem = useTimelineStore((s) => s.addItem);
  const addItems = useTimelineStore((s) => s.addItems);
  const fps = useTimelineStore((s) => s.fps);
  const allGhostPreviews = useNewTrackZonePreviewStore((s) => s.ghostPreviews);
  const setZoneGhostPreviews = useNewTrackZonePreviewStore((s) => s.setGhostPreviews);
  const clearZoneGhostPreviews = useNewTrackZonePreviewStore((s) => s.clearGhostPreviews);
  const setTopVideoNewLaneDropActive = useNewTrackZonePreviewStore((s) => s.setTopVideoNewLaneDropActive);
  const getMedia = useMediaLibraryStore((s) => s.mediaItems);
  const importHandlesForPlacement = useMediaLibraryStore((s) => s.importHandlesForPlacement);
  const { pixelsToFrame, frameToPixels } = useTimelineZoomContext();
  const ghostPreviews = useMemo(
    () => allGhostPreviews.filter((ghost) => ghost.targetZone === zone),
    [allGhostPreviews, zone]
  );
  const getDropFrame = useCallback((event: React.DragEvent): number | null => {
    const timelineContainer = getTimelineScrollContainer(zoneRef.current);
    if (!timelineContainer) {
      return null;
    }

    const scrollLeft = timelineContainer.scrollLeft || 0;
    const containerRect = timelineContainer.getBoundingClientRect();
    const offsetX = (event.clientX - containerRect.left) + scrollLeft;
    return pixelsToFrame(offsetX);
  }, [pixelsToFrame]);

  const ensureVideoZoneTrack = useCallback((tracks: ReturnType<typeof useTimelineStore.getState>['tracks']) => {
    const preferredTrackHeight = tracks.find((track) => track.id === anchorTrackId)?.height ?? 64;
    const { plannedItems, tracks: nextTracks } = planNewTrackZonePlacements({
      entries: [{
        payload: null,
        label: '__zone__',
        mediaType: 'image',
        durationInFrames: 1,
      }],
      dropFrame: 0,
      tracks,
      existingItems: [],
      anchorTrackId,
      zone: 'video',
      preferredTrackHeight,
    });

    const trackId = plannedItems[0]?.placements[0]?.trackId;
    return trackId
      ? { trackId, tracks: nextTracks }
      : null;
  }, [anchorTrackId]);

  const getCurrentCanvasSize = useCallback(() => {
    const liveProject = useProjectStore.getState().currentProject;
    return {
      width: liveProject?.metadata.width ?? 1920,
      height: liveProject?.metadata.height ?? 1080,
    };
  }, []);

  const resolveTimelineItemsForEntries = useCallback(async (
    entries: DroppedMediaEntry[],
    dropFrame: number
  ): Promise<{ items: TimelineItemType[]; tracks: ReturnType<typeof useTimelineStore.getState>['tracks'] }> => {
    const currentTracks = useTimelineStore.getState().tracks;
    const preferredTrackHeight = currentTracks.find((track) => track.id === anchorTrackId)?.height ?? 64;
    const { plannedItems, tracks: workingTracks } = planNewTrackZonePlacements({
      entries: entries.map((entry) => ({
        payload: entry,
        label: entry.label,
        mediaType: entry.mediaType,
        durationInFrames: getDroppedMediaDurationInFrames(entry.media, entry.mediaType, fps),
        hasLinkedAudio: entry.mediaType === 'video' && !!entry.media.audioCodec,
      })),
      dropFrame,
      tracks: currentTracks,
      existingItems: useTimelineStore.getState().items,
      anchorTrackId,
      zone,
      preferredTrackHeight,
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
  }, [anchorTrackId, fps, getCurrentCanvasSize, zone]);

  const buildGhostPreviewsForEntries = useCallback((entries: PreviewEntry[], dropFrame: number): GhostPreviewItem[] => {
    const currentTracks = useTimelineStore.getState().tracks;
    const preferredTrackHeight = currentTracks.find((track) => track.id === anchorTrackId)?.height ?? 64;
    const { plannedItems } = planNewTrackZonePlacements({
      entries: entries.map((entry) => ({
        payload: entry,
        label: entry.label,
        mediaType: entry.mediaType,
        durationInFrames: getDroppedMediaDurationInFrames(
          { duration: entry.duration ?? 0 } as Pick<MediaMetadata, 'duration'>,
          entry.mediaType,
          fps,
        ),
        hasLinkedAudio: entry.hasLinkedAudio,
      })),
      dropFrame,
      tracks: currentTracks,
      existingItems: useTimelineStore.getState().items,
      anchorTrackId,
      zone,
      preferredTrackHeight,
    });

    return buildGhostPreviewsFromNewTrackZonePlan({
      plannedItems,
      frameToPixels,
    });
  }, [anchorTrackId, fps, frameToPixels, zone]);

  const buildGenericExternalGhostPreviews = useCallback((dropFrame: number, itemCount: number): GhostPreviewItem[] => {
    const previews = buildGhostPreviewsForEntries([
      {
        label: itemCount > 1 ? `${itemCount} files` : 'Drop media',
        mediaType: zone === 'audio' ? 'audio' : 'image',
        duration: 3,
      },
    ], dropFrame);

    return previews.length > 0
      ? [{ ...previews[0]!, type: 'external-file', targetZone: zone }]
      : [];
  }, [buildGhostPreviewsForEntries, zone]);

  const buildGhostPreviewForTemplate = useCallback((template: unknown, dropFrame: number): GhostPreviewItem[] => {
    if (!isTimelineTemplateDragData(template) || zone !== 'video') {
      return [];
    }

    const currentTracks = useTimelineStore.getState().tracks;
    const createdTrack = ensureVideoZoneTrack(currentTracks);
    if (!createdTrack) {
      return [];
    }

    const durationInFrames = getDefaultGeneratedLayerDurationInFrames(fps);
    const finalPosition = findNearestAvailableSpace(
      Math.max(0, dropFrame),
      durationInFrames,
      createdTrack.trackId,
      useTimelineStore.getState().items,
    );
    if (finalPosition === null) {
      return [];
    }

    return [{
      left: frameToPixels(finalPosition),
      width: frameToPixels(durationInFrames),
      label: template.label,
      type: template.itemType,
      targetZone: 'video',
    }];
  }, [ensureVideoZoneTrack, fps, frameToPixels, zone]);

  const buildTimelineTemplateItem = useCallback((template: unknown, dropFrame: number): {
    item: TimelineItemType;
    tracks: ReturnType<typeof useTimelineStore.getState>['tracks'];
  } | null => {
    if (!isTimelineTemplateDragData(template) || zone !== 'video') {
      return null;
    }

    const currentTracks = useTimelineStore.getState().tracks;
    const createdTrack = ensureVideoZoneTrack(currentTracks);
    if (!createdTrack) {
      return null;
    }

    const durationInFrames = getDefaultGeneratedLayerDurationInFrames(fps);
    const finalPosition = findNearestAvailableSpace(
      Math.max(0, dropFrame),
      durationInFrames,
      createdTrack.trackId,
      useTimelineStore.getState().items,
    );
    if (finalPosition === null) {
      return null;
    }

    const canvasSize = getCurrentCanvasSize();

    return {
      item: createTimelineTemplateItem({
        template,
        placement: {
          trackId: createdTrack.trackId,
          from: finalPosition,
          durationInFrames,
          canvasWidth: canvasSize.width,
          canvasHeight: canvasSize.height,
        },
      }),
      tracks: createdTrack.tracks,
    };
  }, [ensureVideoZoneTrack, fps, getCurrentCanvasSize, zone]);

  useEffect(() => {
    if (placement !== 'top' || zone !== 'video') {
      return;
    }
    setTopVideoNewLaneDropActive(isDragOver);
    return () => {
      setTopVideoNewLaneDropActive(false);
    };
  }, [placement, zone, isDragOver, setTopVideoNewLaneDropActive]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== 0) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const clearExternalPreviewSession = useCallback(() => {
    externalPreviewItemsRef.current = null;
    externalPreviewSignatureRef.current = null;
    externalPreviewPromiseRef.current = null;
    externalPreviewTokenRef.current += 1;
  }, []);

  const primeExternalPreviewEntries = useCallback((dataTransfer: DataTransfer) => {
    const signature = `${dataTransfer.items.length}:${Array.from(dataTransfer.items)
      .map((item) => `${item.kind}:${item.type || 'unknown'}`)
      .join('|')}`;

    if (externalPreviewSignatureRef.current === signature && externalPreviewItemsRef.current) {
      return;
    }

    if (externalPreviewSignatureRef.current === signature && externalPreviewPromiseRef.current) {
      return;
    }

    clearExternalPreviewSession();
    externalPreviewSignatureRef.current = signature;
    const token = externalPreviewTokenRef.current;

    const previewPromise = (async () => {
      const { supported, entries } = await extractValidMediaFileEntriesFromDataTransfer(dataTransfer);
      if (!supported || token !== externalPreviewTokenRef.current) {
        return;
      }

      const previewEntries = entries.flatMap((entry) => (
        entry.mediaType === 'video' || entry.mediaType === 'audio' || entry.mediaType === 'image'
          ? [{
            label: entry.file.name,
            mediaType: entry.mediaType,
          }]
          : []
      ));

      externalPreviewItemsRef.current = previewEntries;
      externalPreviewPromiseRef.current = null;

      if (previewEntries.length > 0) {
        setZoneGhostPreviews(buildGhostPreviewsForEntries(previewEntries, lastDragFrameRef.current));
      }
    })().catch((error) => {
      if (token === externalPreviewTokenRef.current) {
        externalPreviewPromiseRef.current = null;
        logger.warn('Failed to build external drag preview:', error);
      }
    });

    externalPreviewPromiseRef.current = previewPromise;
  }, [buildGhostPreviewsForEntries, clearExternalPreviewSession, setZoneGhostPreviews]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const data = getMediaDragData();
    const hasExternalFiles = !data && e.dataTransfer.types.includes('Files');
    if (!data && !hasExternalFiles) {
      setIsExternalDragOver(false);
      setIsDragOver(false);
      clearZoneGhostPreviews();
      return;
    }

    // Synchronous: must call preventDefault + set dropEffect in the event handler
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
    setIsExternalDragOver(hasExternalFiles);

    const dropFrame = getDropFrame(e);
    if (dropFrame === null) {
      clearZoneGhostPreviews();
      return;
    }
    lastDragFrameRef.current = dropFrame;

    // Synchronous: capture data from dataTransfer before React recycles the event
    let capturedExternalFileCount = 0;
    if (hasExternalFiles) {
      if (!externalPreviewItemsRef.current || externalPreviewItemsRef.current.length === 0) {
        capturedExternalFileCount = Array.from(e.dataTransfer.items).filter((item) => item.kind === 'file').length;
        primeExternalPreviewEntries(e.dataTransfer);
      }
    }

    // Synchronous: reject invalid composition drops immediately (cursor feedback)
    if (data?.type === 'composition') {
      const activeCompositionId = useCompositionNavigationStore.getState().activeCompositionId;
      if (
        zone !== 'video'
        || wouldCreateCompositionCycle({
          parentCompositionId: activeCompositionId,
          insertedCompositionId: data.compositionId,
          compositionById: useCompositionsStore.getState().compositionById,
        })
      ) {
        e.dataTransfer.dropEffect = 'none';
        setIsDragOver(false);
        clearZoneGhostPreviews();
        return;
      }

      if (!useCompositionsStore.getState().compositionById[data.compositionId]) {
        e.dataTransfer.dropEffect = 'none';
        setIsDragOver(false);
        clearZoneGhostPreviews();
        return;
      }
    }

    // Synchronous: reject template drops on non-video zones
    if (data?.type === 'timeline-template' && zone !== 'video') {
      e.dataTransfer.dropEffect = 'none';
      clearZoneGhostPreviews();
      return;
    }

    // Throttle: skip expensive preview computation if same frame already computed
    if (dropFrame === lastComputedFrameRef.current) {
      return;
    }

    // Cancel previous pending computation — only one per animation frame
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      lastComputedFrameRef.current = dropFrame;

      if (hasExternalFiles) {
        if (externalPreviewItemsRef.current && externalPreviewItemsRef.current.length > 0) {
          const previews = buildGhostPreviewsForEntries(externalPreviewItemsRef.current, dropFrame);
          if (previews.length === 0) {
            setIsDragOver(false);
            setIsExternalDragOver(false);
          }
          setZoneGhostPreviews(previews);
        } else {
          setZoneGhostPreviews(buildGenericExternalGhostPreviews(dropFrame, Math.max(1, capturedExternalFileCount)));
        }
        return;
      }

      if (!data) {
        clearZoneGhostPreviews();
        return;
      }

      if (data.type === 'composition') {
        const compositionById = useCompositionsStore.getState().compositionById;
        const composition = compositionById[data.compositionId];
        if (!composition) {
          setIsDragOver(false);
          clearZoneGhostPreviews();
          return;
        }

        const currentTracks = useTimelineStore.getState().tracks;
        const preferredTrackHeight = currentTracks.find((candidate) => candidate.id === anchorTrackId)?.height ?? 64;
        const { plannedItems } = planNewTrackZonePlacements({
          entries: [{
            payload: data,
            label: data.name,
            mediaType: 'video',
            durationInFrames: data.durationInFrames,
            hasLinkedAudio: compositionHasOwnedAudio({ composition, compositionById }),
          }],
          dropFrame,
          tracks: currentTracks,
          existingItems: useTimelineStore.getState().items,
          anchorTrackId,
          zone,
          preferredTrackHeight,
        });
        const plannedItem = plannedItems[0];
        const previews = plannedItem
          ? buildGhostPreviewsFromNewTrackZonePlan({
            plannedItems: [plannedItem],
            frameToPixels,
          }).map((preview) => ({
            ...preview,
            label: data.name,
            type: preview.type === 'video' ? 'composition' as const : preview.type,
          }))
          : [];
        if (previews.length === 0) {
          setIsDragOver(false);
        }
        setZoneGhostPreviews(previews);
        return;
      }

      if (data.type === 'timeline-template') {
        const previews = buildGhostPreviewForTemplate(data, dropFrame);
        if (previews.length === 0) {
          setIsDragOver(false);
        }
        setZoneGhostPreviews(previews);
        return;
      }

      if (data.type === 'media-items' && data.items) {
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const validItems = rawItems.filter(isValidDragMediaItem);
        if (validItems.length !== rawItems.length) {
          logger.warn('Skipping invalid media-items preview payload entries', {
            invalidCount: rawItems.length - validItems.length,
          });
        }

        const mediaById = new Map(getMedia.map((media) => [media.id, media]));
        const previews = buildGhostPreviewsForEntries(
          validItems.map((item) => ({
            label: item.fileName,
            mediaType: item.mediaType,
            duration: item.duration,
            hasLinkedAudio: item.mediaType === 'video' && !!mediaById.get(item.mediaId)?.audioCodec,
          })),
          dropFrame,
        );
        if (previews.length === 0) {
          setIsDragOver(false);
        }
        setZoneGhostPreviews(previews);
        return;
      }

      if (data.type === 'media-item' && data.mediaId && data.mediaType && data.fileName) {
        const media = getMedia.find((entry) => entry.id === data.mediaId);
        if (!media || !isDroppableMediaType(data.mediaType)) {
          clearZoneGhostPreviews();
          return;
        }

        const itemDuration = getDroppedMediaDurationInFrames(media, data.mediaType, fps);
        const previews = buildGhostPreviewsForEntries([
          {
            label: data.fileName,
            mediaType: data.mediaType,
            duration: itemDuration / fps,
            hasLinkedAudio: data.mediaType === 'video' && !!media.audioCodec,
          },
        ], dropFrame);
        if (previews.length === 0) {
          setIsDragOver(false);
        }
        setZoneGhostPreviews(previews);
        return;
      }

      clearZoneGhostPreviews();
    });
  }, [
    anchorTrackId,
    buildGenericExternalGhostPreviews,
    buildGhostPreviewForTemplate,
    buildGhostPreviewsForEntries,
    clearZoneGhostPreviews,
    fps,
    frameToPixels,
    getDropFrame,
    getMedia,
    primeExternalPreviewEntries,
    setZoneGhostPreviews,
    zone,
  ]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    lastComputedFrameRef.current = null;
    setIsDragOver(false);
    setIsExternalDragOver(false);
    clearZoneGhostPreviews();
    clearExternalPreviewSession();
  }, [clearExternalPreviewSession, clearZoneGhostPreviews]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    lastComputedFrameRef.current = null;
    setIsDragOver(false);
    setIsExternalDragOver(false);
    clearZoneGhostPreviews();
    clearExternalPreviewSession();

    const dropFrame = getDropFrame(e);
    if (dropFrame === null) {
      return;
    }

    const rawJson = e.dataTransfer.getData('application/json');
    if (rawJson) {
      try {
        const data = JSON.parse(rawJson);

        if (data.type === 'composition') {
          const activeCompositionId = useCompositionNavigationStore.getState().activeCompositionId;
          if (
            zone !== 'video'
            || wouldCreateCompositionCycle({
              parentCompositionId: activeCompositionId,
              insertedCompositionId: data.compositionId,
              compositionById: useCompositionsStore.getState().compositionById,
            })
          ) {
            return;
          }

          const { compositionId, name, durationInFrames } = data as CompositionDragData;
          const currentTracks = useTimelineStore.getState().tracks;
          const preferredTrackHeight = currentTracks.find((track) => track.id === anchorTrackId)?.height ?? 64;
          const compositionById = useCompositionsStore.getState().compositionById;
          const composition = compositionById[compositionId];
          if (!composition) {
            logger.warn('Cannot drop composition into new track zone: compound clip definition not found');
            return;
          }

          const { plannedItems, tracks: nextTracks } = planNewTrackZonePlacements({
            entries: [{
              payload: data,
              label: name,
              mediaType: 'video',
              durationInFrames,
              hasLinkedAudio: compositionHasOwnedAudio({ composition, compositionById }),
            }],
            dropFrame,
            tracks: currentTracks,
            existingItems: useTimelineStore.getState().items,
            anchorTrackId,
            zone,
            preferredTrackHeight,
          });
          const plannedItem = plannedItems[0];
          if (!plannedItem) {
            logger.warn('Cannot drop composition into new track zone: no available space');
            return;
          }

          if (nextTracks !== currentTracks) {
            useTimelineStore.getState().setTracks(nextTracks);
          }

          const droppedItems = buildDroppedCompositionTimelineItems({
            compositionId,
            composition,
            label: name,
            placements: plannedItem.placements,
          });
          if (droppedItems.length === 0) {
            logger.warn('Cannot drop composition into new track zone: failed to build compound clip wrappers');
            return;
          }

          addItems(droppedItems);
          return;
        }

        if (isTimelineTemplateDragData(data)) {
          const templateDrop = buildTimelineTemplateItem(data, dropFrame);
          if (!templateDrop) {
            toast.error('Unable to add dropped timeline item');
            return;
          }

          if (templateDrop.tracks !== useTimelineStore.getState().tracks) {
            useTimelineStore.getState().setTracks(templateDrop.tracks);
          }

          addItem(templateDrop.item);
          return;
        }

        let entries: DroppedMediaEntry[] = [];
        if (data.type === 'media-items') {
          const rawItems = Array.isArray(data.items) ? data.items : [];
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
        } else if (data.type === 'media-item' && data.mediaId && data.mediaType && data.fileName) {
          if (!isDroppableMediaType(data.mediaType)) {
            return;
          }

          const media = getMedia.find((entry) => entry.id === data.mediaId);
          if (!media) {
            logger.error('Media not found:', data.mediaId);
            return;
          }

          entries = [{
            media,
            mediaId: data.mediaId,
            mediaType: data.mediaType,
            label: data.fileName,
          }];
        }

        if (entries.length === 0) {
          return;
        }

        const dropResult = await resolveTimelineItemsForEntries(entries, dropFrame);
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

    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    const { supported, entries, errors } = await extractValidMediaFileEntriesFromDataTransfer(e.dataTransfer);
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

    const dropResult = await resolveTimelineItemsForEntries(droppedEntries, dropFrame);
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
  }, [
    addItem,
    addItems,
    buildTimelineTemplateItem,
    clearZoneGhostPreviews,
    clearExternalPreviewSession,
    ensureVideoZoneTrack,
    getDropFrame,
    getMedia,
    importHandlesForPlacement,
    resolveTimelineItemsForEntries,
    zone,
  ]);

  if (height <= 0) {
    return null;
  }

  const timelineNewZoneAttr =
    zone === 'video'
      ? (placement === 'top' ? 'video-top' : 'video-bottom')
      : 'audio-bottom';

  return (
    <div
      ref={zoneRef}
      className="relative"
      data-timeline-new-zone={timelineNewZoneAttr}
      style={{ height: `${height}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Blue drag line — shows on ALL zones when drag is active */}
      {isDragOver && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[35] h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
          style={{ top: placement === 'top' ? 0 : undefined, bottom: placement !== 'top' ? 0 : undefined }}
          aria-hidden
          data-testid="timeline-new-lane-drop-indicator"
        />
      )}

      {/* Subtle zone highlight during drag */}
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-blue-500/[0.04]" />
      )}

      {/* Ghost preview clips with smooth transitions */}
      {ghostPreviews.map((ghost, index) => (
        <div
          key={`${ghost.label}-${index}`}
          className={`absolute rounded pointer-events-none z-20 flex items-center px-2 border border-dashed transition-[left,width,opacity] duration-150 ease-out ${
            ghost.type === 'composition'
              ? 'border-violet-400/70 bg-violet-600/15'
              : ghost.type === 'external-file'
              ? 'border-primary/70 bg-primary/10'
              : ghost.type === 'video'
              ? 'border-timeline-video/70 bg-timeline-video/15'
              : ghost.type === 'audio'
              ? 'border-timeline-audio/70 bg-timeline-audio/15'
              : ghost.type === 'text'
              ? 'border-timeline-text/70 bg-timeline-text/15'
              : ghost.type === 'shape'
              ? 'border-timeline-shape/70 bg-timeline-shape/15'
              : ghost.type === 'adjustment'
              ? 'border-slate-400/70 bg-slate-400/10'
              : 'border-timeline-image/70 bg-timeline-image/15'
          }`}
          style={{
            left: `${ghost.left}px`,
            width: `${ghost.width}px`,
            top: 2,
            bottom: 2,
          }}
        >
          <span className="truncate text-[10px] font-medium text-foreground/60">{ghost.label}</span>
        </div>
      ))}
    </div>
  );
});
