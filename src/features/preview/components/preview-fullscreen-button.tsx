import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EDITOR_LAYOUT_CSS_VALUES } from '@/shared/ui/editor-layout';

export function PreviewFullscreenButton({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          style={{
            width: EDITOR_LAYOUT_CSS_VALUES.previewControlButtonSize,
            height: EDITOR_LAYOUT_CSS_VALUES.previewControlButtonSize,
          }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          onClick={onToggle}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen program monitor'}
      </TooltipContent>
    </Tooltip>
  );
}
