import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Video, Music, Volume2, VolumeX, Eye, EyeOff, Lock, Trash2 } from 'lucide-react';
import type { TimelineTrack } from '@/types/timeline';
import { usePlaybackStore } from '@/shared/state/playback';
import { useTrackDrag } from '../hooks/use-track-drag';
import {
  executeTimelineMediaDrop,
  isTimelineTrackDropDisabled,
  timelineDragAcceptsMediaTypes,
} from '../utils/execute-timeline-media-drop';
import { TIMELINE_SIDEBAR_WIDTH } from '../constants';
import { getTrackKind } from '@/features/timeline/utils/classic-tracks';
import { cn } from '@/shared/ui/cn';

interface TrackHeaderProps {
  track: TimelineTrack;
  isActive: boolean;
  isSelected: boolean;
  canDeleteTrack: boolean;
  canDeleteEmptyTracks: boolean;
  onToggleMute: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onAddVideoTrack: () => void;
  onAddAudioTrack: () => void;
  onDeleteTrack: () => void;
  onDeleteEmptyTracks: () => void;
}

function areTrackHeaderPropsEqual(prev: TrackHeaderProps, next: TrackHeaderProps): boolean {
  return (
    prev.track === next.track &&
    prev.isActive === next.isActive &&
    prev.isSelected === next.isSelected &&
    prev.canDeleteTrack === next.canDeleteTrack &&
    prev.canDeleteEmptyTracks === next.canDeleteEmptyTracks
  );
}

/**
 * Track label: name + visibility on video; mute on audio lanes only. Reorder: drag the row.
 */
export const TrackHeader = memo(function TrackHeader({
  track,
  isActive,
  isSelected,
  canDeleteTrack,
  canDeleteEmptyTracks,
  onToggleMute,
  onToggleVisibility,
  onToggleLock,
  onSelect,
  onAddVideoTrack,
  onAddAudioTrack,
  onDeleteTrack,
  onDeleteEmptyTracks,
}: TrackHeaderProps) {
  const [deleteTrackDialogOpen, setDeleteTrackDialogOpen] = useState(false);
  const trackKind = getTrackKind(track);
  const isMuted = track.muted;
  const isHidden = track.visible === false;
  const canDeleteThisTrack = canDeleteTrack && !track.locked;

  const { handleDragStart } = useTrackDrag(track);

  const openDeleteTrackDialog = () => {
    if (canDeleteThisTrack) {
      setDeleteTrackDialogOpen(true);
    }
  };

  const handleHeaderMediaDragOver = (e: React.DragEvent) => {
    if (!timelineDragAcceptsMediaTypes(e)) {
      return;
    }
    if (track.locked || isTimelineTrackDropDisabled(track.id)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleHeaderMediaDrop = async (e: React.DragEvent) => {
    if (!timelineDragAcceptsMediaTypes(e)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (track.locked || isTimelineTrackDropDisabled(track.id)) {
      return;
    }
    const dropFrame = usePlaybackStore.getState().currentFrame;
    await executeTimelineMediaDrop({
      dataTransfer: e.dataTransfer,
      dropFrame,
      dropTargetTrackId: track.id,
    });
  };

  const btnClass = 'h-7 w-7 shrink-0 rounded p-0';

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`
            group flex cursor-grab items-center gap-2 overflow-hidden px-2.5 active:cursor-grabbing
            ${isSelected ? 'bg-primary/10' : 'hover:bg-secondary/50'}
            ${isActive ? 'border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'}
            transition-colors duration-150
          `}
          style={{
            height: `${track.height}px`,
            contentVisibility: 'auto',
            containIntrinsicSize: `${TIMELINE_SIDEBAR_WIDTH}px ${track.height}px`,
          }}
          onClick={onSelect}
          onMouseDown={handleDragStart}
          onDragOver={handleHeaderMediaDragOver}
          onDrop={handleHeaderMediaDrop}
          data-track-id={track.id}
        >
          <span className="min-w-0 flex-1 truncate text-left text-xs font-medium leading-none">
            {track.name}
          </span>

          <div className="flex shrink-0 items-center gap-0.5">
            {trackKind === 'video' && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={btnClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label={isHidden ? 'Show track' : 'Hide track'}
                  data-tooltip={isHidden ? 'Show track' : 'Hide track'}
                >
                  {isHidden ? (
                    <EyeOff className="size-3.5 text-destructive" />
                  ) : (
                    <Eye className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Video className="size-3.5 shrink-0 text-muted-foreground opacity-70" aria-hidden />
              </>
            )}

            {trackKind === 'audio' && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={btnClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label={isMuted ? 'Unmute track' : 'Mute track'}
                  data-tooltip={isMuted ? 'Unmute track' : 'Mute track'}
                >
                  {isMuted ? (
                    <VolumeX className="size-3.5 text-destructive" />
                  ) : (
                    <Volume2 className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Music className="size-3.5 shrink-0 text-muted-foreground opacity-70" aria-hidden />
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                btnClass,
                canDeleteThisTrack
                  ? 'text-destructive hover:bg-destructive/15 hover:text-destructive focus-visible:ring-destructive'
                  : 'text-muted-foreground'
              )}
              disabled={!canDeleteThisTrack}
              onClick={(e) => {
                e.stopPropagation();
                openDeleteTrackDialog();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={canDeleteThisTrack ? 'Delete track' : track.locked ? 'Unlock track to delete it' : 'Cannot delete the only track'}
              data-tooltip={
                !canDeleteTrack
                  ? 'Cannot delete the only track'
                  : track.locked
                    ? 'Unlock track to delete it'
                    : 'Delete track and clips on it'
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onToggleLock}>
          <Lock className="mr-2 size-3.5" />
          {track.locked ? 'Unlock track' : 'Lock track'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onAddVideoTrack}>Add video track</ContextMenuItem>
        <ContextMenuItem onClick={onAddAudioTrack}>Add audio track</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!canDeleteThisTrack}
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            openDeleteTrackDialog();
          }}
        >
          Delete track
        </ContextMenuItem>
        <ContextMenuItem disabled={!canDeleteEmptyTracks} onClick={onDeleteEmptyTracks}>
          Delete empty tracks
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <AlertDialog open={deleteTrackDialogOpen} onOpenChange={setDeleteTrackDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete track &ldquo;{track.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the entire lane and all clips on it (including linked audio/video). You can still undo
            afterward from the Edit menu or with your usual Undo shortcut.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            onClick={() => {
              onDeleteTrack();
            }}
          >
            Delete track
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}, areTrackHeaderPropsEqual);
