import { memo, useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { KubeezMediaModelOption } from '@/infrastructure/kubeez/kubeez-models';
import { areModelsEquivalent } from '@/infrastructure/kubeez/model-equivalence';
import {
  defaultModelSettings,
  findRegistryEntryByBaseCardId,
  type KubeezModelSettings,
} from '@/infrastructure/kubeez/model-family-registry';
import { resolveGenerationModelId } from '@/infrastructure/kubeez/model-resolve';
import {
  buildKubeezModelGridItems,
  collectVideoFamilyAxes,
  kubeezModelGridItemContainsModelId,
  parseSelectionFromVideoVariantId,
  pickDefaultVariant,
  resolveVideoFamilySelection,
  type KubeezModelFamilyGridItem,
  type KubeezModelGridItem,
} from '@/infrastructure/kubeez/kubeez-video-model-variants';
import { Link } from '@tanstack/react-router';
import { Check, Clapperboard, ImageIcon, LayoutGrid, Loader2, Mic, Music2, Search } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

export type ModelTab = 'all' | 'image' | 'video' | 'music' | 'speech';

const MODEL_GRID_CLASS =
  'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-3 xl:grid-cols-2';

function modelTabForKind(k: KubeezMediaModelOption['mediaKind']): ModelTab {
  if (k === 'image') return 'image';
  if (k === 'video') return 'video';
  if (k === 'music') return 'music';
  return 'speech';
}

function modelMatchesSearch(m: KubeezMediaModelOption, needle: string): boolean {
  if (!needle) return true;
  const n = needle.toLowerCase();
  const parts = [m.display_name, m.model_id, m.provider ?? ''].join(' ').toLowerCase();
  return parts.includes(n);
}

export interface KubeezGenerateModelsColumnProps {
  missingKey: boolean;
  modelsHint: string | null;
  imageModels: KubeezMediaModelOption[];
  videoModels: KubeezMediaModelOption[];
  musicModels: KubeezMediaModelOption[];
  speechModels: KubeezMediaModelOption[];
  allModelsSorted: KubeezMediaModelOption[];
  allModelsCount: number;
  modelTab: ModelTab;
  onModelTabChange: (tab: ModelTab) => void;
  selectedModelId: string;
  onSelectModelId: (id: string) => void;
  busy: boolean;
  modelsLoading: boolean;
}

function accentForKind(k: KubeezMediaModelOption['mediaKind']) {
  if (k === 'video') return 'video' as const;
  if (k === 'music') return 'music' as const;
  if (k === 'speech') return 'speech' as const;
  return 'image' as const;
}

function kindLabelText(kind: KubeezMediaModelOption['mediaKind']) {
  if (kind === 'video') return 'Video';
  if (kind === 'music') return 'Music';
  if (kind === 'speech') return 'Speech';
  return 'Image';
}

function ModelCardShell(props: {
  accent: 'video' | 'music' | 'speech' | 'image';
  kindLabel: string;
  title: string;
  subtitle: ReactNode;
  selected: boolean;
  footer?: ReactNode;
  onSelect?: () => void;
  disabled: boolean;
  fixedHeight: boolean;
  ariaSelected?: boolean;
}) {
  const {
    accent,
    kindLabel,
    title,
    subtitle,
    selected,
    footer,
    onSelect,
    disabled,
    fixedHeight,
    ariaSelected,
  } = props;
  const isVideo = accent === 'video';
  const isMusic = accent === 'music';
  const isSpeech = accent === 'speech';
  const isImage = accent === 'image';

  const body = (
    <>
      <div
        className={cn(
          'absolute inset-x-0 top-0 z-10 h-[3px] rounded-t-2xl opacity-95',
          isVideo && 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400',
          isMusic && 'bg-gradient-to-r from-primary via-blue-400 to-primary',
          isSpeech && 'bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-400',
          isImage && 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
        )}
        aria-hidden
      />
      {selected && (
        <span
          className={cn(
            'absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-md ring-2 ring-background',
            isVideo && 'bg-violet-600 text-white',
            isMusic && 'bg-amber-600 text-white',
            isSpeech && 'bg-sky-600 text-white',
            isImage && 'bg-primary text-primary-foreground'
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
      <div className="relative z-0 flex min-h-0 flex-1 flex-col px-3.5 pb-2.5 pt-3.5">
        <div className="flex min-h-0 flex-1 gap-2 pr-8">
          <span
            className={cn(
              'h-fit shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
              isVideo && 'border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-200',
              isMusic && 'border-amber-500/25 bg-amber-500/12 text-amber-900 dark:text-amber-100',
              isSpeech && 'border-sky-500/25 bg-sky-500/12 text-sky-900 dark:text-sky-100',
              isImage && 'border-emerald-500/25 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
            )}
          >
            {kindLabel}
          </span>
          <span className="min-h-[2.5rem] min-w-0 text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
            {title}
          </span>
        </div>
        {subtitle ? <div className="mt-0.5 text-[10px] text-muted-foreground/90">{subtitle}</div> : null}
        {footer}
      </div>
    </>
  );

  const frameClass = cn(
    'group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left',
    fixedHeight ? 'h-[9.5rem]' : 'min-h-[9.5rem] py-0.5',
    'border-border/60 bg-gradient-to-b from-card via-card/95 to-muted/25',
    'shadow-[inset_0_1px_0_0_oklch(1_0_0_/0.06),0_10px_36px_-14px_rgba(0,0,0,0.48)]',
    'transition-[transform,box-shadow,border-color,background] duration-200',
    onSelect && 'hover:-translate-y-px hover:border-border/90 hover:shadow-[inset_0_1px_0_0_oklch(1_0_0_/0.07),0_14px_44px_-12px_rgba(0,0,0,0.52)]',
    onSelect &&
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    disabled && 'pointer-events-none opacity-50',
    selected &&
      isVideo &&
      'border-violet-400/50 bg-gradient-to-b from-violet-500/18 via-card to-violet-950/25 shadow-lg shadow-violet-500/20 ring-1 ring-violet-400/35 dark:border-violet-500/45',
    selected &&
      isMusic &&
      'border-amber-400/50 bg-gradient-to-b from-amber-500/18 via-card to-amber-950/20 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/35 dark:border-amber-500/45',
    selected &&
      isSpeech &&
      'border-sky-400/50 bg-gradient-to-b from-sky-500/18 via-card to-sky-950/20 shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/35 dark:border-sky-500/45',
    selected &&
      isImage &&
      'border-primary/50 bg-gradient-to-b from-primary/14 via-card to-primary/5 shadow-lg shadow-primary/20 ring-1 ring-primary/40',
    !selected &&
      isVideo &&
      'border-violet-500/20 bg-gradient-to-b from-violet-500/[0.07] via-card to-transparent dark:border-violet-800/40',
    !selected &&
      isMusic &&
      'border-amber-500/20 bg-gradient-to-b from-amber-500/[0.07] via-card to-transparent dark:border-amber-800/35',
    !selected &&
      isSpeech &&
      'border-sky-500/20 bg-gradient-to-b from-sky-500/[0.07] via-card to-transparent dark:border-sky-800/35',
    !selected && isImage && 'border-border/50'
  );

  if (onSelect) {
    return (
      <button
        type="button"
        role="option"
        aria-selected={ariaSelected ?? selected}
        disabled={disabled}
        onClick={onSelect}
        className={frameClass}
      >
        {body}
      </button>
    );
  }

  return (
    <div role="group" className={frameClass} aria-selected={ariaSelected ?? selected}>
      {body}
    </div>
  );
}

function FamilyModelCard(props: {
  item: KubeezModelFamilyGridItem;
  selectedModelId: string;
  onSelectModelId: (id: string) => void;
  busy: boolean;
  modelsLoading: boolean;
}) {
  const { item, selectedModelId, onSelectModelId, busy, modelsLoading } = props;
  const disabled = busy || modelsLoading;
  const selected = kubeezModelGridItemContainsModelId(item, selectedModelId);
  const costs = item.variants
    .map((v) => v.cost_per_generation)
    .filter((c): c is number => typeof c === 'number');
  const rangeLabel =
    costs.length > 1
      ? `${Math.min(...costs)}–${Math.max(...costs)} cr`
      : costs.length === 1
        ? `${costs[0]} cr`
        : null;

  const accent = accentForKind(item.mediaKind);
  const kindLabel = kindLabelText(item.mediaKind);

  return (
    <ModelCardShell
      accent={accent}
      kindLabel={kindLabel}
      title={item.displayName}
      subtitle={null}
      selected={selected}
      fixedHeight
      ariaSelected={selected}
      onSelect={() => {
        if (!selected) {
          const entry = item.baseCardId ? findRegistryEntryByBaseCardId(item.baseCardId) : null;
          if (entry) {
            const settings = defaultModelSettings(entry);
            onSelectModelId(
              resolveGenerationModelId({
                baseCardId: entry.baseCardId,
                settings,
                variants: item.variants,
              })
            );
          } else {
            onSelectModelId(pickDefaultVariant(item.variants).model_id);
          }
        }
      }}
      disabled={disabled}
      footer={
        (item.provider || rangeLabel) && (
          <div className="mt-auto border-t border-border/40 pt-2">
            <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
              {item.provider && <span>{item.provider}</span>}
              {item.provider && rangeLabel && <span className="text-muted-foreground/40"> · </span>}
              {rangeLabel && (
                <span className="tabular-nums text-foreground/60">~{rangeLabel}</span>
              )}
            </p>
          </div>
        )
      }
    />
  );
}

/** `720p` → `720` for compact quality toggles (API still uses full `model_id`). */
function videoResolutionChipLabel(resolution: string): string {
  return resolution.replace(/p$/i, '');
}

function kindBadgeClass(kind: KubeezMediaModelOption['mediaKind']) {
  return cn(
    'rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
    kind === 'video' && 'bg-violet-500/20 text-violet-800 dark:text-violet-200',
    kind === 'image' && 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200',
    kind === 'music' && 'bg-amber-500/20 text-amber-900 dark:text-amber-100',
    kind === 'speech' && 'bg-sky-500/20 text-sky-900 dark:text-sky-100'
  );
}

export interface KubeezGenerateSelectedModelPanelProps {
  model: KubeezMediaModelOption | null;
  selectedModelId: string;
  onSelectModelId: (id: string) => void;
  modelSettings: KubeezModelSettings;
  onPatchModelSettings: (patch: Partial<KubeezModelSettings>) => void;
  modelFamilyItem: KubeezModelFamilyGridItem | null;
  videoFooterHint: string | null;
  busy: boolean;
  modelsLoading: boolean;
}

export const KubeezGenerateSelectedModelPanel = memo(function KubeezGenerateSelectedModelPanel({
  model,
  selectedModelId,
  onSelectModelId,
  modelSettings,
  onPatchModelSettings,
  modelFamilyItem,
  videoFooterHint,
  busy,
  modelsLoading,
}: KubeezGenerateSelectedModelPanelProps) {
  const disabled = busy || modelsLoading;

  const costLabel =
    model && typeof model.cost_per_generation === 'number' ? `${model.cost_per_generation} cr` : null;

  const videoModes =
    model?.mediaKind === 'video'
      ? [
          model.supportsTextToVideo && 'Text-to-video',
          model.supportsImageToVideo && 'Image-to-video',
        ].filter(Boolean)
      : [];

  const familyVariant = modelFamilyItem
    ? (modelFamilyItem.variants.find((v) => v.model_id === selectedModelId) ??
      pickDefaultVariant(modelFamilyItem.variants))
    : null;
  const axes =
    modelFamilyItem?.mediaKind === 'video' ? collectVideoFamilyAxes(modelFamilyItem.variants) : null;
  const hasVideoAxisUi = Boolean(
    modelFamilyItem?.mediaKind === 'video' &&
      axes &&
      (axes.resolutions.length > 0 ||
        axes.durations.length > 0 ||
        (axes.audioOptions.off && axes.audioOptions.on))
  );
  const parsed =
    familyVariant && axes && hasVideoAxisUi
      ? (parseSelectionFromVideoVariantId(familyVariant.model_id) ?? {
          resolution: axes.resolutions[0] ?? null,
          duration: axes.durations[0] ?? '4s',
          withAudio: false,
        })
      : null;
  const showSoundRow = axes ? axes.audioOptions.off && axes.audioOptions.on : false;

  const selectFamilyWith = modelFamilyItem
    ? (next: { resolution: string | null; duration: string; withAudio: boolean }) => {
        const v = resolveVideoFamilySelection(modelFamilyItem.variants, next);
        onSelectModelId(v.model_id);
      }
    : null;

  const registryDedicatedImageUi =
    modelFamilyItem?.baseCardId === 'nano-banana-2' ||
    modelFamilyItem?.baseCardId === 'nano-banana-pro' ||
    modelFamilyItem?.baseCardId === 'imagen-4' ||
    modelFamilyItem?.baseCardId === 'z-image' ||
    modelFamilyItem?.baseCardId === 'gpt-1.5-image';

  const registryDedicatedCustomVideoUi =
    modelFamilyItem?.baseCardId === 'grok-video' ||
    modelFamilyItem?.baseCardId === 'kling-2-5-i2v' ||
    modelFamilyItem?.baseCardId === 'kling-2-6' ||
    modelFamilyItem?.baseCardId === 'kling-2-6-motion' ||
    modelFamilyItem?.baseCardId === 'kling-3-0' ||
    modelFamilyItem?.baseCardId === 'sora-2' ||
    modelFamilyItem?.baseCardId === 'veo3-1' ||
    modelFamilyItem?.baseCardId === 'wan-2-5';

  const registryDedicatedMusicUi =
    modelFamilyItem?.baseCardId === 'suno-music' ||
    modelFamilyItem?.baseCardId === 'suno-tools';

  const showSimpleVariantRow = Boolean(
    modelFamilyItem &&
      modelFamilyItem.variants.length > 1 &&
      (modelFamilyItem.mediaKind === 'image' ||
        modelFamilyItem.mediaKind === 'music' ||
        !hasVideoAxisUi) &&
      !registryDedicatedImageUi &&
      !registryDedicatedCustomVideoUi &&
      !registryDedicatedMusicUi
  );

  const imageRes = modelSettings.imageResolution ?? '1k';
  const imagenTier = modelSettings.imagenTier ?? 'standard';
  const grokVideoMode = modelSettings.grokVideoMode ?? 'text-to-video';
  const kling26 = modelSettings.kling26 ?? {
    mode: 'text-to-video' as const,
    duration: '5s' as const,
    withAudio: false,
  };
  const kling26MotionRes = modelSettings.kling26MotionResolution ?? '720p';
  const kling30 = modelSettings.kling30 ?? {
    line: 'std' as const,
    motionResolution: '720p' as const,
  };
  const sora2 = modelSettings.sora2 ?? {
    tier: 'base' as const,
    mode: 'text-to-video' as const,
    duration: '10s' as const,
    proQuality: 'standard' as const,
  };
  const zImageTier = modelSettings.zImageTier ?? 'standard';
  const gpt15ImageQuality = modelSettings.gpt15ImageQuality ?? 'medium';
  const kling25Clip = modelSettings.kling25Clip ?? '5s';
  const veo31 = modelSettings.veo31 ?? {
    tier: 'fast' as const,
    mode: 'text-to-video' as const,
  };
  const wan25 = modelSettings.wan25 ?? {
    useSimpleCatalogId: true,
    source: 'text' as const,
    duration: '5s' as const,
    resolution: '1080p' as const,
  };
  const sunoEngine = modelSettings.sunoEngine ?? 'V5_5';
  const sunoTool = modelSettings.sunoTool ?? 'instrumental';
  const sora2ModeRows =
    sora2.tier === 'pro'
      ? ([
          { mode: 'text-to-video' as const, label: 'Text-to-video' },
          { mode: 'image-to-video' as const, label: 'Image-to-video' },
          { mode: 'storyboard' as const, label: 'Storyboard' },
        ] as const)
      : ([
          { mode: 'text-to-video' as const, label: 'Text-to-video' },
          { mode: 'image-to-video' as const, label: 'Image-to-video' },
        ] as const);
  const simpleVariantsSorted = modelFamilyItem
    ? [...modelFamilyItem.variants].sort(
        (a, b) => (a.cost_per_generation ?? Infinity) - (b.cost_per_generation ?? Infinity)
      )
    : [];
  const simpleVariantTitle = (v: KubeezMediaModelOption) => {
    const dup =
      simpleVariantsSorted.filter((s) => s.display_name === v.display_name).length > 1;
    return dup ? `${v.display_name} · ${v.model_id}` : v.display_name;
  };

  if (!model) {
    return null;
  }

  return (
    <div className="shrink-0 space-y-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-3 shadow-inner shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Selected model</p>
          <p className="text-sm font-semibold leading-snug text-foreground">{model.display_name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={kindBadgeClass(model.mediaKind)}>{kindLabelText(model.mediaKind)}</span>
            {(model.provider || costLabel) && (
              <p className="text-[11px] text-muted-foreground">
                {model.provider && <span>{model.provider}</span>}
                {model.provider && costLabel && <span className="text-muted-foreground/40"> · </span>}
                {costLabel && <span className="tabular-nums text-foreground/70">~{costLabel}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {model.prompt_max_chars !== undefined && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Max prompt length:{' '}
          <span className="tabular-nums font-medium text-foreground/80">{model.prompt_max_chars}</span> characters
        </p>
      )}

      {model.mediaKind === 'video' && videoModes.length > 0 && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {videoModes.join(' · ')}
          {model.supports_sound ? ' · Generated audio supported for applicable variants.' : ''}
        </p>
      )}

      {modelFamilyItem?.baseCardId === 'nano-banana-2' || modelFamilyItem?.baseCardId === 'nano-banana-pro' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Resolution</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: '1k' as const, label: '1K' },
                { id: '2k' as const, label: '2K' },
                { id: '4k' as const, label: '4K' },
              ] as const
            ).map(({ id, label }) => {
              const active = imageRes === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ imageResolution: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'imagen-4' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Tier</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'standard' as const, label: 'Standard' },
                { id: 'fast' as const, label: 'Fast' },
                { id: 'ultra' as const, label: 'Ultra' },
              ] as const
            ).map(({ id, label }) => {
              const active = imagenTier === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[4.5rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ imagenTier: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'z-image' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Quality</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'standard' as const, label: 'Standard' },
                { id: 'hd' as const, label: 'HD' },
              ] as const
            ).map(({ id, label }) => {
              const active = zImageTier === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[4.5rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ zImageTier: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'gpt-1.5-image' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Quality</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'medium' as const, label: 'Medium' },
                { id: 'high' as const, label: 'High' },
              ] as const
            ).map(({ id, label }) => {
              const active = gpt15ImageQuality === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[4.5rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ gpt15ImageQuality: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'grok-video' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Generation</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'text-to-video' as const, label: 'Text-to-video' },
                { id: 'image-to-video' as const, label: 'Image-to-video' },
              ] as const
            ).map(({ id, label }) => {
              const active = grokVideoMode === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[7.5rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ grokVideoMode: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Text-to-video uses the 6s catalog entry; image-to-video needs reference media when required.
          </p>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'kling-2-5-i2v' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Clip length</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: '5s' as const, label: '5s' },
                { id: '10s' as const, label: '10s' },
              ] as const
            ).map(({ id, label }) => {
              const active = kling25Clip === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ kling25Clip: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'kling-2-6' ? (
        <div className="space-y-2.5 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'text-to-video' as const, label: 'Text-to-video' },
                  { id: 'image-to-video' as const, label: 'Image-to-video' },
                ] as const
              ).map(({ id, label }) => {
                const active = kling26.mode === id;
                return (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[7.5rem] px-2 text-[11px]"
                    onClick={() => onPatchModelSettings({ kling26: { ...kling26, mode: id } })}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
            <div className="flex flex-wrap gap-1">
              {(['5s', '10s'] as const).map((dur) => {
                const active = kling26.duration === dur;
                return (
                  <Button
                    key={dur}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                    onClick={() => onPatchModelSettings({ kling26: { ...kling26, duration: dur } })}
                  >
                    {dur}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Audio</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: false, label: 'Off' },
                  { id: true, label: 'On' },
                ] as const
              ).map(({ id, label }) => {
                const active = kling26.withAudio === id;
                return (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 px-3 text-[11px]"
                    onClick={() => onPatchModelSettings({ kling26: { ...kling26, withAudio: id } })}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'kling-2-6-motion' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Quality</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: '720p' as const, label: '720' },
                { id: '1080p' as const, label: '1080' },
              ] as const
            ).map(({ id, label }) => {
              const active = kling26MotionRes === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[3.25rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ kling26MotionResolution: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'kling-3-0' ? (
        <div className="space-y-2.5 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Model</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { line: 'std' as const, label: 'Standard' },
                  { line: 'pro' as const, label: 'Pro' },
                  { line: 'motion' as const, label: 'Motion' },
                ] as const
              ).map(({ line, label }) => {
                const active = kling30.line === line;
                return (
                  <Button
                    key={line}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[5.5rem] px-2 text-[11px]"
                    onClick={() =>
                      onPatchModelSettings({
                        kling30: { ...kling30, line, motionResolution: kling30.motionResolution },
                      })
                    }
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
          {kling30.line === 'motion' ? (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Motion quality</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: '720p' as const, label: '720' },
                    { id: '1080p' as const, label: '1080' },
                  ] as const
                ).map(({ id, label }) => {
                  const active = kling30.motionResolution === id;
                  return (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={disabled}
                      className="h-7 min-w-[3.25rem] px-2 text-[11px]"
                      onClick={() => onPatchModelSettings({ kling30: { ...kling30, motionResolution: id } })}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'sora-2' ? (
        <div className="space-y-2.5 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Tier</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  {
                    tier: 'base' as const,
                    label: 'Base',
                    patch: {
                      tier: 'base' as const,
                      mode: sora2.mode === 'storyboard' ? ('text-to-video' as const) : sora2.mode,
                      duration: (sora2.duration === '25s' ? '10s' : sora2.duration) as '10s' | '15s',
                      proQuality: 'standard' as const,
                    },
                  },
                  {
                    tier: 'pro' as const,
                    label: 'Pro',
                    patch: {
                      tier: 'pro' as const,
                      mode: sora2.mode === 'storyboard' ? 'storyboard' : sora2.mode,
                      duration: sora2.duration,
                      proQuality: sora2.proQuality,
                    },
                  },
                ] as const
              ).map(({ tier, label, patch }) => {
                const active = sora2.tier === tier;
                return (
                  <Button
                    key={tier}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[4.5rem] px-2 text-[11px]"
                    onClick={() => onPatchModelSettings({ sora2: { ...sora2, ...patch } })}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
            <div className="flex flex-wrap gap-1">
              {sora2ModeRows.map(({ mode, label }) => {
                const active = sora2.mode === mode;
                return (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[7rem] px-2 text-[11px]"
                    onClick={() => {
                      let duration = sora2.duration;
                      if (mode === 'storyboard') {
                        if (duration !== '10s' && duration !== '15s' && duration !== '25s') {
                          duration = '10s';
                        }
                      } else if (duration === '25s') {
                        duration = '10s';
                      }
                      onPatchModelSettings({ sora2: { ...sora2, mode, duration } });
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
            <div className="flex flex-wrap gap-1">
              {(sora2.mode === 'storyboard'
                ? (['10s', '15s', '25s'] as const)
                : (['10s', '15s'] as const)
              ).map((dur) => {
                const active = sora2.duration === dur;
                return (
                  <Button
                    key={dur}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                    onClick={() => onPatchModelSettings({ sora2: { ...sora2, duration: dur } })}
                  >
                    {dur}
                  </Button>
                );
              })}
            </div>
          </div>
          {sora2.tier === 'pro' && sora2.mode !== 'storyboard' ? (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Quality</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'hd' as const, label: 'HD' },
                    { id: 'standard' as const, label: 'Standard' },
                  ] as const
                ).map(({ id, label }) => {
                  const active = sora2.proQuality === id;
                  return (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={disabled}
                      className="h-7 min-w-[5rem] px-2 text-[11px]"
                      onClick={() => onPatchModelSettings({ sora2: { ...sora2, proQuality: id } })}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'veo3-1' ? (
        <div className="space-y-2.5 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Tier</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { tier: 'fast' as const, label: 'Fast' },
                  { tier: 'quality' as const, label: 'Quality' },
                ] as const
              ).map(({ tier, label }) => {
                const active = veo31.tier === tier;
                return (
                  <Button
                    key={tier}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[4.5rem] px-2 text-[11px]"
                    onClick={() => {
                      let mode = veo31.mode;
                      if (tier === 'quality' && mode === 'reference-to-video') {
                        mode = 'text-to-video';
                      }
                      onPatchModelSettings({ veo31: { ...veo31, tier, mode } });
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Mode</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { mode: 'text-to-video' as const, label: 'Text' },
                  { mode: 'first-and-last-frames' as const, label: 'First & last' },
                ] as const
              ).map(({ mode, label }) => {
                const active = veo31.mode === mode;
                return (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled}
                    className="h-7 min-w-[5rem] px-2 text-[11px]"
                    onClick={() => onPatchModelSettings({ veo31: { ...veo31, mode } })}
                  >
                    {label}
                  </Button>
                );
              })}
              {veo31.tier === 'fast' ? (
                <Button
                  type="button"
                  size="sm"
                  variant={veo31.mode === 'reference-to-video' ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[5rem] px-2 text-[11px]"
                  onClick={() =>
                    onPatchModelSettings({ veo31: { ...veo31, mode: 'reference-to-video' } })
                  }
                >
                  Reference
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'wan-2-5' ? (
        <div className="space-y-2.5 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Variant</p>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant={wan25.useSimpleCatalogId ? 'default' : 'outline'}
                disabled={disabled}
                className="h-7 px-2 text-[11px]"
                onClick={() => onPatchModelSettings({ wan25: { ...wan25, useSimpleCatalogId: true } })}
              >
                Catalog default
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!wan25.useSimpleCatalogId ? 'default' : 'outline'}
                disabled={disabled}
                className="h-7 px-2 text-[11px]"
                onClick={() => onPatchModelSettings({ wan25: { ...wan25, useSimpleCatalogId: false } })}
              >
                Full id
              </Button>
            </div>
          </div>
          {!wan25.useSimpleCatalogId ? (
            <>
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'text' as const, label: 'Text-to-video' },
                      { id: 'image' as const, label: 'Image-to-video' },
                    ] as const
                  ).map(({ id, label }) => {
                    const active = wan25.source === id;
                    return (
                      <Button
                        key={id}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        disabled={disabled}
                        className="h-7 min-w-[7rem] px-2 text-[11px]"
                        onClick={() => onPatchModelSettings({ wan25: { ...wan25, source: id } })}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
                <div className="flex flex-wrap gap-1">
                  {(['5s', '10s'] as const).map((dur) => {
                    const active = wan25.duration === dur;
                    return (
                      <Button
                        key={dur}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        disabled={disabled}
                        className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                        onClick={() => onPatchModelSettings({ wan25: { ...wan25, duration: dur } })}
                      >
                        {dur}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Resolution</p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: '720p' as const, label: '720p' },
                      { id: '1080p' as const, label: '1080p' },
                    ] as const
                  ).map(({ id, label }) => {
                    const active = wan25.resolution === id;
                    return (
                      <Button
                        key={id}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        disabled={disabled}
                        className="h-7 min-w-[3.25rem] px-2 text-[11px]"
                        onClick={() => onPatchModelSettings({ wan25: { ...wan25, resolution: id } })}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-[10px] leading-snug text-muted-foreground">
              Uses the single catalog model id <span className="font-mono text-foreground/80">wan-2-5</span>. Switch
              to Full id for text vs image, duration, and resolution variants.
            </p>
          )}
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'suno-music' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Engine</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'V4' as const, label: 'V4' },
                { id: 'V4_5' as const, label: 'V4.5' },
                { id: 'V4_5PLUS' as const, label: 'V4.5+' },
                { id: 'V5' as const, label: 'V5' },
                { id: 'V5_5' as const, label: 'V5.5' },
              ] as const
            ).map(({ id, label }) => {
              const active = sunoEngine === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ sunoEngine: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem?.baseCardId === 'suno-tools' ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Tool</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: 'instrumental' as const, label: 'Add instrumental' },
                { id: 'vocals' as const, label: 'Add vocals' },
                { id: 'lyrics' as const, label: 'Lyrics' },
              ] as const
            ).map(({ id, label }) => {
              const active = sunoTool === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-7 min-w-[5.5rem] px-2 text-[11px]"
                  onClick={() => onPatchModelSettings({ sunoTool: id })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {modelFamilyItem && hasVideoAxisUi && parsed && selectFamilyWith && axes && (
        <div className="space-y-2.5 border-t border-border/50 pt-3">
          {axes.resolutions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Quality</p>
              <div className="flex flex-wrap gap-1">
                {axes.resolutions.map((r) => {
                  const active = (parsed.resolution ?? null) === r;
                  return (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={disabled}
                      className="h-7 min-w-[3.25rem] px-2 text-[11px]"
                      onClick={() =>
                        selectFamilyWith({ resolution: r, duration: parsed.duration, withAudio: parsed.withAudio })
                      }
                    >
                      {videoResolutionChipLabel(r)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          {axes.durations.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
              <div className="flex flex-wrap gap-1">
                {axes.durations.map((d) => {
                  const active = parsed.duration === d;
                  return (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={disabled}
                      className="h-7 min-w-[2.75rem] px-2 text-[11px]"
                      onClick={() =>
                        selectFamilyWith({
                          resolution: parsed.resolution,
                          duration: d,
                          withAudio: parsed.withAudio,
                        })
                      }
                    >
                      {d}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          {showSoundRow && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Audio</p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: false, label: 'Off' },
                    { id: true, label: 'On' },
                  ] as const
                ).map(({ id, label }) => {
                  const active = parsed.withAudio === id;
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={disabled}
                      className="h-7 px-3 text-[11px]"
                      onClick={() =>
                        selectFamilyWith({
                          resolution: parsed.resolution,
                          duration: parsed.duration,
                          withAudio: id,
                        })
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showSimpleVariantRow && (
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Variant</p>
          <div className="flex flex-wrap gap-1">
            {simpleVariantsSorted.map((v) => {
              const active = v.model_id === selectedModelId || areModelsEquivalent(v.model_id, selectedModelId);
              const vCost = typeof v.cost_per_generation === 'number' ? `~${v.cost_per_generation} cr` : null;
              return (
                <Button
                  key={v.model_id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  disabled={disabled}
                  className="h-auto min-h-7 max-w-full whitespace-normal px-2 py-1 text-left text-[11px] leading-snug"
                  onClick={() => onSelectModelId(v.model_id)}
                >
                  <span className="block font-medium">{simpleVariantTitle(v)}</span>
                  {vCost ? (
                    <span className="block tabular-nums text-[10px] opacity-80">{vCost}</span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {videoFooterHint && (
        <p className="text-xs leading-snug text-violet-600 dark:text-violet-400">{videoFooterHint}</p>
      )}
    </div>
  );
});

function ModelGrid(props: {
  items: KubeezModelGridItem[];
  emptyTitle?: string;
  emptyHint?: string;
  selectedModelId: string;
  onSelectModelId: (id: string) => void;
  busy: boolean;
  modelsLoading: boolean;
}) {
  const { items, emptyTitle, emptyHint, selectedModelId, onSelectModelId, busy, modelsLoading } = props;
  if (items.length === 0) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyTitle ?? 'No models in this tab.'}</p>
        {emptyHint ? (
          <p className="mt-1 max-w-md text-xs text-muted-foreground/85">{emptyHint}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/80">Try another tab or check your API key.</p>
        )}
      </div>
    );
  }
  return (
    <div role="listbox" aria-labelledby="kubeez-model-label" aria-multiselectable={false} className={MODEL_GRID_CLASS}>
      {items.map((entry) => {
        if (entry.kind === 'model-family') {
          return (
            <FamilyModelCard
              key={entry.familyKey}
              item={entry}
              selectedModelId={selectedModelId}
              onSelectModelId={onSelectModelId}
              busy={busy}
              modelsLoading={modelsLoading}
            />
          );
        }

        const m = entry.m;
        const selected = m.model_id === selectedModelId || areModelsEquivalent(m.model_id, selectedModelId);
        const costLabel = typeof m.cost_per_generation === 'number' ? `${m.cost_per_generation} cr` : null;
        const accent = accentForKind(m.mediaKind);
        const kindLabel =
          m.mediaKind === 'video'
            ? 'Video'
            : m.mediaKind === 'music'
              ? 'Music'
              : m.mediaKind === 'speech'
                ? 'Speech'
                : 'Image';

        return (
          <ModelCardShell
            key={m.model_id}
            accent={accent}
            kindLabel={kindLabel}
            title={m.display_name}
            subtitle={null}
            selected={selected}
            fixedHeight
            ariaSelected={selected}
            onSelect={() => onSelectModelId(m.model_id)}
            disabled={busy || modelsLoading}
            footer={
              (m.provider || costLabel) && (
                <div className="mt-auto border-t border-border/40 pt-2">
                  <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                    {m.provider && <span>{m.provider}</span>}
                    {m.provider && costLabel && <span className="text-muted-foreground/40"> · </span>}
                    {costLabel && (
                      <span className="tabular-nums text-foreground/60">~{costLabel}</span>
                    )}
                  </p>
                </div>
              )
            }
          />
        );
      })}
    </div>
  );
}

export const KubeezGenerateModelsColumn = memo(function KubeezGenerateModelsColumn({
  missingKey,
  modelsHint,
  imageModels,
  videoModels,
  musicModels,
  speechModels,
  allModelsSorted,
  allModelsCount,
  modelTab,
  onModelTabChange,
  selectedModelId,
  onSelectModelId,
  busy,
  modelsLoading,
}: KubeezGenerateModelsColumnProps) {
  const [modelSearch, setModelSearch] = useState('');
  const searchNeedle = modelSearch.trim();

  const filteredLists = useMemo(() => {
    const f = (list: KubeezMediaModelOption[]) =>
      searchNeedle ? list.filter((m) => modelMatchesSearch(m, searchNeedle)) : list;
    return {
      all: f(allModelsSorted),
      image: f(imageModels),
      video: f(videoModels),
      music: f(musicModels),
      speech: f(speechModels),
    };
  }, [allModelsSorted, imageModels, videoModels, musicModels, speechModels, searchNeedle]);

  const gridItemsByTab = useMemo(
    () => ({
      all: buildKubeezModelGridItems(filteredLists.all),
      image: buildKubeezModelGridItems(filteredLists.image),
      video: buildKubeezModelGridItems(filteredLists.video),
      music: buildKubeezModelGridItems(filteredLists.music),
      speech: buildKubeezModelGridItems(filteredLists.speech),
    }),
    [filteredLists]
  );

  const filteredGridItems =
    modelTab === 'all'
      ? gridItemsByTab.all
      : modelTab === 'image'
        ? gridItemsByTab.image
        : modelTab === 'video'
          ? gridItemsByTab.video
          : modelTab === 'music'
            ? gridItemsByTab.music
            : gridItemsByTab.speech;

  const selectionVisible = filteredGridItems.some((item) =>
    kubeezModelGridItemContainsModelId(item, selectedModelId)
  );
  const selectedModel =
    [...imageModels, ...videoModels, ...musicModels, ...speechModels].find(
      (m) => m.model_id === selectedModelId
    ) ?? null;
  const selectionNotInTab = Boolean(selectedModel && !selectionVisible);

  return (
    <div className="flex min-h-0 max-h-[min(42vh,320px)] flex-col border-b border-border pb-4 lg:max-h-none lg:min-h-0 lg:w-[min(100%,30rem)] lg:max-w-[38%] lg:flex-none lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
      {missingKey && (
        <p className="mb-2 shrink-0 text-sm text-muted-foreground">
          Add an API key in{' '}
          <Link to="/settings" className="text-primary underline underline-offset-2">
            Settings
          </Link>{' '}
          to load live models and generate.
        </p>
      )}

      {modelsHint && !missingKey && (
        <p className="mb-2 shrink-0 text-xs text-muted-foreground">{modelsHint}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <Label id="kubeez-model-label">Models</Label>
          {modelsLoading && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading…
            </span>
          )}
        </div>

        <Tabs
          value={modelTab}
          onValueChange={(v) => onModelTabChange(v as ModelTab)}
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        >
          <TabsList className="flex h-auto w-full shrink-0 flex-wrap justify-start gap-1 rounded-xl border border-border/50 bg-muted/30 p-1 shadow-inner shadow-black/15 sm:flex-nowrap">
            <TabsTrigger value="all" className="gap-1.5 px-2.5 sm:px-3">
              <LayoutGrid className="h-3.5 w-3.5 opacity-70" />
              All
              <span className="tabular-nums text-muted-foreground">({allModelsCount})</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5 px-2.5 sm:px-3">
              <ImageIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Image
              <span className="tabular-nums text-muted-foreground">({imageModels.length})</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-1.5 px-2.5 sm:px-3">
              <Clapperboard className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              Video
              <span className="tabular-nums text-muted-foreground">({videoModels.length})</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="gap-1.5 px-2.5 sm:px-3">
              <Music2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Music
              <span className="tabular-nums text-muted-foreground">({musicModels.length})</span>
            </TabsTrigger>
            <TabsTrigger value="speech" className="gap-1.5 px-2.5 sm:px-3">
              <Mic className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              Speech
              <span className="tabular-nums text-muted-foreground">({speechModels.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-2 shrink-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search by name, id, or provider…"
              disabled={busy || modelsLoading}
              className="h-9 rounded-lg border-border/60 bg-card/40 pl-9 text-sm shadow-inner shadow-black/5"
              aria-label="Search models"
              autoComplete="off"
            />
            {searchNeedle && (
              <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                {filteredGridItems.length} match{filteredGridItems.length === 1 ? '' : 'es'} in this tab
              </p>
            )}
          </div>

          {selectionNotInTab && selectedModel && (
            <div className="mt-2 flex shrink-0 flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Selected:</span> {selectedModel.display_name}
                <span
                  className={cn(
                    'ml-1.5 rounded px-1 py-px text-[10px] font-semibold uppercase',
                    selectedModel.mediaKind === 'video' &&
                      'bg-violet-500/20 text-violet-800 dark:text-violet-200',
                    selectedModel.mediaKind === 'image' &&
                      'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200',
                    selectedModel.mediaKind === 'music' &&
                      'bg-amber-500/20 text-amber-900 dark:text-amber-100',
                    selectedModel.mediaKind === 'speech' &&
                      'bg-sky-500/20 text-sky-900 dark:text-sky-100'
                  )}
                >
                  {selectedModel.mediaKind === 'video'
                    ? 'Video'
                    : selectedModel.mediaKind === 'music'
                      ? 'Music'
                      : selectedModel.mediaKind === 'speech'
                        ? 'Speech'
                        : 'Image'}
                </span>
                <span className="text-muted-foreground"> — not listed in this tab.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8"
                  onClick={() => onModelTabChange(modelTabForKind(selectedModel.mediaKind))}
                >
                  Open{' '}
                  {selectedModel.mediaKind === 'video'
                    ? 'Video'
                    : selectedModel.mediaKind === 'music'
                      ? 'Music'
                      : selectedModel.mediaKind === 'speech'
                        ? 'Speech'
                        : 'Image'}{' '}
                  tab
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => onModelTabChange('all')}>
                  All models
                </Button>
              </div>
            </div>
          )}

          <TabsContent value="all" className="mt-2 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full max-h-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
              <ModelGrid
                items={gridItemsByTab.all}
                emptyHint={
                  searchNeedle && allModelsSorted.length > 0
                    ? 'No models match your search. Try another term or clear the filter.'
                    : undefined
                }
                selectedModelId={selectedModelId}
                onSelectModelId={onSelectModelId}
                busy={busy}
                modelsLoading={modelsLoading}
              />
            </div>
          </TabsContent>
          <TabsContent value="image" className="mt-2 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full max-h-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
              <ModelGrid
                items={gridItemsByTab.image}
                emptyTitle={searchNeedle && imageModels.length > 0 ? 'No matching models' : undefined}
                emptyHint={
                  searchNeedle && imageModels.length > 0
                    ? 'Try another search term or clear the filter.'
                    : undefined
                }
                selectedModelId={selectedModelId}
                onSelectModelId={onSelectModelId}
                busy={busy}
                modelsLoading={modelsLoading}
              />
            </div>
          </TabsContent>
          <TabsContent value="video" className="mt-2 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full max-h-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
              <ModelGrid
                items={gridItemsByTab.video}
                emptyTitle={searchNeedle && videoModels.length > 0 ? 'No matching models' : undefined}
                emptyHint={
                  searchNeedle && videoModels.length > 0
                    ? 'Try another search term or clear the filter.'
                    : 'No video models from the API, or the catalog failed to load. Image-to-video models need reference uploads.'
                }
                selectedModelId={selectedModelId}
                onSelectModelId={onSelectModelId}
                busy={busy}
                modelsLoading={modelsLoading}
              />
            </div>
          </TabsContent>
          <TabsContent value="music" className="mt-2 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full max-h-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
              <ModelGrid
                items={gridItemsByTab.music}
                emptyHint={
                  searchNeedle && musicModels.length > 0
                    ? 'No models match your search. Try another term or clear the filter.'
                    : 'No music models from the API; built-in Suno engine ids (V5, V4…) are used instead.'
                }
                selectedModelId={selectedModelId}
                onSelectModelId={onSelectModelId}
                busy={busy}
                modelsLoading={modelsLoading}
              />
            </div>
          </TabsContent>
          <TabsContent value="speech" className="mt-2 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full max-h-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
              <ModelGrid
                items={gridItemsByTab.speech}
                emptyTitle={searchNeedle && speechModels.length > 0 ? 'No matching models' : undefined}
                emptyHint={
                  searchNeedle && speechModels.length > 0
                    ? 'Try another search term or clear the filter.'
                    : 'Text-to-speech uses Kubeez dialogue generation (ElevenLabs).'
                }
                selectedModelId={selectedModelId}
                onSelectModelId={onSelectModelId}
                busy={busy}
                modelsLoading={modelsLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

export interface KubeezGeneratePromptFieldProps {
  disabled: boolean;
  maxChars?: number;
  resetKey: number;
  promptRef: MutableRefObject<string>;
  /** Visible label (e.g. Prompt, Music prompt, Script). */
  label?: string;
  placeholder?: string;
  fieldId?: string;
}

/** Local prompt state so parent does not re-render the model grid on every keystroke. */
export function KubeezGeneratePromptField({
  disabled,
  maxChars,
  resetKey,
  promptRef,
  label = 'Prompt',
  placeholder = 'Describe what to generate…',
  fieldId = 'kubeez-prompt',
}: KubeezGeneratePromptFieldProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
    promptRef.current = '';
  }, [resetKey, promptRef]);

  return (
    <div className="shrink-0 space-y-2">
      <Label htmlFor={fieldId} className="text-foreground/90">
        {label}
      </Label>
      <Textarea
        id={fieldId}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          promptRef.current = v;
        }}
        placeholder={placeholder}
        rows={5}
        disabled={disabled}
        className="max-h-52 min-h-[6.75rem] resize-none border-border/70 bg-card/50 shadow-inner shadow-black/10"
      />
      {maxChars !== undefined && (
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {value.length} / {maxChars} characters
        </p>
      )}
    </div>
  );
}
