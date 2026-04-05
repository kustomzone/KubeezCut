import { usePlaybackStore } from '@/shared/state/playback';
import { useProjectStore } from '@/features/timeline/deps/projects';
import { useMediaLibraryStore } from '@/features/timeline/deps/media-library-store';
import { mediaLibraryService } from '@/features/timeline/deps/media-library-service';
import { resolveMediaUrl } from '@/features/timeline/deps/media-library-resolver';
import { useTimelineStore } from '../stores/timeline-store';
import { useItemsStore } from '../stores/items-store';
import { useTimelineSettingsStore } from '../stores/timeline-settings-store';
import { useEditorStore } from '@/shared/state/editor';
import { useSelectionStore } from '@/shared/state/selection';
import { getLinkedItems } from './linked-items';
import { getTrackKind } from './classic-tracks';
import { splitItem, addItem, updateItem } from '../stores/actions/item-actions';
import { buildDroppedMediaTimelineItem } from './dropped-media';
import { formatTimecode } from '@/utils/time-utils';
import { toast } from 'sonner';
import type { TimelineItem } from '@/types/timeline';

async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert frame to blob'));
    }, type);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function buildFreezeFileName(frame: number, fps: number): string {
  const safeFrame = Math.max(0, Math.round(frame));
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  const tc = formatTimecode(safeFrame, safeFps).replaceAll(':', '-');
  return `freeze-${tc}-f${safeFrame}.png`;
}

function getItemsToSplitLikeSplitItem(items: TimelineItem[], itemId: string): TimelineItem[] {
  if (useEditorStore.getState().linkedSelectionEnabled) {
    return getLinkedItems(items, itemId);
  }
  const anchor = items.find((item) => item.id === itemId);
  return anchor ? [anchor] : [];
}

function findTopVideoItemAtPlayhead(frame: number): TimelineItem | null {
  const items = useItemsStore.getState().items;
  const tracks = useTimelineStore.getState().tracks;
  const trackOrder = new Map(tracks.map((t) => [t.id, t.order]));
  const trackLocked = new Map(tracks.map((t) => [t.id, t.locked]));

  const candidates = items.filter((i): i is TimelineItem & { type: 'video' } => {
    if (i.type !== 'video') return false;
    const track = tracks.find((t) => t.id === i.trackId);
    if (!track || trackLocked.get(track.id)) return false;
    if (getTrackKind(track) !== 'video') return false;
    return frame > i.from && frame < i.from + i.durationInFrames;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (trackOrder.get(b.trackId) ?? 0) - (trackOrder.get(a.trackId) ?? 0));
  return candidates[0]!;
}

/**
 * Captures the current preview frame, splits the topmost video clip at the playhead,
 * inserts a still image for ~1s (or less if the remainder is short), and shifts the
 * tail of the clip(s) forward on the timeline.
 */
export async function freezeFrameAtPlayhead(): Promise<void> {
  const playback = usePlaybackStore.getState();
  const project = useProjectStore.getState().currentProject;
  const projectId = useMediaLibraryStore.getState().currentProjectId;
  const fps = useTimelineSettingsStore.getState().fps;

  if (!project || !projectId) {
    toast.error('No active project.');
    return;
  }

  if (playback.isPlaying) {
    toast.error('Pause playback before adding a freeze frame.');
    return;
  }

  const frame = Math.round(playback.previewFrame ?? playback.currentFrame);
  const videoItem = findTopVideoItemAtPlayhead(frame);
  if (!videoItem) {
    toast.error('No video clip at the playhead.');
    return;
  }

  const remainderAfterPlayhead =
    videoItem.from + videoItem.durationInFrames - frame;
  if (remainderAfterPlayhead <= 1) {
    toast.error('Not enough room after the playhead for a freeze frame.');
    return;
  }

  const itemsBefore = useItemsStore.getState().items;
  const toSplit = getItemsToSplitLikeSplitItem(itemsBefore, videoItem.id);
  const splitTrackIds = new Set(toSplit.map((i) => i.trackId));

  let frameBlob: Blob | null = null;
  let frameWidth: number | undefined;
  let frameHeight: number | undefined;

  if (playback.captureCanvasSource) {
    const canvasSource = await playback.captureCanvasSource();
    if (canvasSource) {
      frameBlob = await canvasToBlob(canvasSource, 'image/png');
      frameWidth = canvasSource.width;
      frameHeight = canvasSource.height;
    }
  }

  if (!frameBlob && playback.captureFrame) {
    const dataUrl = await playback.captureFrame({
      format: 'image/png',
      quality: 1,
      fullResolution: true,
    });
    if (dataUrl) {
      frameBlob = await dataUrlToBlob(dataUrl);
    }
  }

  if (!frameBlob) {
    toast.error('Failed to capture the current frame.');
    return;
  }

  const splitResult = splitItem(videoItem.id, frame);
  if (!splitResult) {
    toast.error('Could not split the clip at the playhead (edge, transition, or locked).');
    return;
  }

  const fileName = buildFreezeFileName(frame, fps);
  const frameFile = new File([frameBlob], fileName, {
    type: 'image/png',
    lastModified: Date.now(),
  });

  let media: Awaited<ReturnType<typeof mediaLibraryService.importGeneratedImage>>;
  try {
    media = await mediaLibraryService.importGeneratedImage(frameFile, projectId, {
      width: frameWidth,
      height: frameHeight,
      tags: ['freeze-frame'],
      codec: 'png',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Import failed.';
    toast.error(`Could not import freeze frame. ${message}`);
    return;
  }

  useMediaLibraryStore.setState((state) => ({
    mediaItems: [media, ...state.mediaItems],
  }));

  const rightDur = splitResult.rightItem.durationInFrames;
  const oneSecondFrames = Math.max(1, Math.round(fps));
  let freezeDur = Math.min(oneSecondFrames, rightDur);
  if (freezeDur >= rightDur) {
    freezeDur = Math.max(1, rightDur - 1);
  }
  if (freezeDur < 1 || rightDur <= 1) {
    toast.error('Not enough room after the playhead for a freeze frame.');
    return;
  }

  const itemsAfterSplit = useItemsStore.getState().items;
  const rightTails = itemsAfterSplit.filter(
    (i) => i.from === frame && splitTrackIds.has(i.trackId)
  );

  for (const tail of rightTails) {
    updateItem(tail.id, { from: tail.from + freezeDur });
  }

  const canvasWidth = project.metadata.width;
  const canvasHeight = project.metadata.height;

  const [blobUrl, thumbnailUrl] = await Promise.all([
    resolveMediaUrl(media.id),
    mediaLibraryService.getThumbnailBlobUrl(media.id),
  ]);

  if (!blobUrl) {
    toast.error('Could not resolve media URL for the freeze frame.');
    return;
  }

  const imageItem = buildDroppedMediaTimelineItem({
    media,
    mediaId: media.id,
    mediaType: 'image',
    label: media.fileName,
    timelineFps: fps,
    blobUrl,
    thumbnailUrl,
    canvasWidth,
    canvasHeight,
    placement: {
      trackId: videoItem.trackId,
      from: frame,
      durationInFrames: freezeDur,
    },
  });

  addItem(imageItem);
  useSelectionStore.getState().selectItems([imageItem.id]);
  toast.success('Freeze frame added to the timeline.');
}
