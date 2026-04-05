import { useCallback, useRef, useState } from 'react';
import { RectangleHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EDITOR_LAYOUT_CSS_VALUES } from '@/shared/ui/editor-layout';
import { useProjectStore } from '@/features/projects/stores/project-store';
import {
  PREVIEW_ASPECT_PRESETS,
  getPreviewAspectKind,
} from '../constants/preview-aspect-presets';

export function PreviewAspectRatioMenu({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const projectId = useProjectStore((s) => s.currentProject?.id);
  const updateProject = useProjectStore((s) => s.updateProject);
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const blurTrigger = useCallback(() => {
    triggerRef.current?.blur();
  }, []);

  const currentKind = getPreviewAspectKind(width, height);
  const currentPreset = PREVIEW_ASPECT_PRESETS.find((p) => p.id === currentKind);
  const triggerLabel = currentPreset?.label ?? `${width}×${height}`;

  const applyPreset = async (presetWidth: number, presetHeight: number) => {
    if (!projectId || busy) return;
    setBusy(true);
    try {
      await updateProject(projectId, { width: presetWidth, height: presetHeight });
    } finally {
      setBusy(false);
    }
  };

  const disabled = !projectId || busy;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) requestAnimationFrame(blurTrigger);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          disabled={disabled}
          className="flex-shrink-0 gap-1 px-1.5 text-muted-foreground hover:text-foreground"
          style={{ height: EDITOR_LAYOUT_CSS_VALUES.previewControlButtonSize }}
          aria-label={`Frame aspect: ${currentPreset?.label ?? 'custom'} (${width}×${height})`}
          data-tooltip="Frame aspect: horizontal, vertical, or square (social presets)"
          onKeyDown={(e) => {
            if (e.key === ' ' || e.code === 'Space') e.preventDefault();
          }}
        >
          <RectangleHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="max-w-[64px] truncate text-[10px] leading-none">
            {triggerLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[240px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(blurTrigger);
        }}
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {width}×{height}
          {' '}
          <span className="text-muted-foreground/80">
            ({currentPreset ? currentPreset.label : 'Custom aspect'})
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PREVIEW_ASPECT_PRESETS.map((p) => {
          const isActive = currentKind === p.id;
          return (
            <DropdownMenuItem
              key={p.id}
              className="flex flex-col items-start gap-0.5 py-2 text-xs"
              disabled={busy}
              onSelect={() => void applyPreset(p.width, p.height)}
            >
              <span className={isActive ? 'font-semibold' : 'font-medium'}>
                {p.label}
                <span className="font-normal text-muted-foreground"> {p.ratioLabel}</span>
                <span className="ml-1 tabular-nums text-muted-foreground">
                  {p.width}×{p.height}
                </span>
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {p.platforms}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
