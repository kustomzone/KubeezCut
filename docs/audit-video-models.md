# Video Model Audit — 2026-04-17

Compares live API (`GET /v1/models?model_type=video`, 80 models) against local fallback code. Inspection sources:

- Live data: `C:\Users\mihai\AppData\Local\Temp\kubeez-audit\video.json` (80 models)
- Fallback: `src/infrastructure/kubeez/kubeez-model-requirements-fallback.ts`
- Reference caps: `src/infrastructure/kubeez/kubeez-documented-reference-limits.ts` + `src/infrastructure/kubeez/kubeez-web-file-restrictions.ts`
- Offline catalog: `src/infrastructure/kubeez/kubeez-offline-browse-catalog.ts`
- Family registry: `src/infrastructure/kubeez/model-family-registry.ts`
- Variant-id encoding: `src/infrastructure/kubeez/kubeez-video-model-variants.ts`
- Aspect UI: `src/infrastructure/kubeez/kubeez-video-aspect-ui.ts`

## Summary

- Live API models: 80
- Drift: critical=6, minor=9, new=9, orphan=4
- Families covered by registry: seedance-1-5-pro, v1-pro-fast-i2v, kling-2-6, kling-2-6-motion, kling-3-0, sora-2, veo3-1, wan-2-5, kling-2-5-i2v, grok-video
- Families missing from registry entirely: **seedance-2** (8 ids), **p-video** (1 id)

## Critical mismatches (would cause 400, silent billing errors, or stale caps at first paint)

- **seedance-1-5-pro (all 12 variants)**: fallback `prompt_max_chars=5000` (prefix rule at line 154 + EXACT at 113-114), API returns **2500** for every variant — exact same pattern as the z-image bug. Bites offline-browse and first-paint (before `GET /v1/models` resolves); once the API loads `pickDefined()` prefers API (2500) so no runtime 400. Fix: change prefix to 2500 to keep offline/first-paint honest — `kubeez-model-requirements-fallback.ts:113-114,154`
- **wan-2-5-{text,image}-to-video-{5s,10s}-{720p,1080p} (8 variants)**: `videoModelIdEncodesVariantParams()` regex `^(.+?)-(?:(\d+p)-)?(\d+)s(-audio)?$` requires the id to end in `Ns` or `Ns-audio`; these ids end in `-720p`/`-1080p` (resolution AFTER duration) so the function returns `false`, the dialog shows the duration picker, and the user can POST `duration: "5s"` against `wan-2-5-*-10s-*` (or vice versa) — `kubeez-video-model-variants.ts:10` + `kubeez-generate-image-dialog.tsx:969`
- **sora-2-pro-text-to-video-{10s,15s}-{hd,standard} + sora-2-pro-image-to-video-{10s,15s}-{hd,standard} (8 variants)**: same regex gap — ids end in `-hd`/`-standard`, regex misses them, so dialog shows duration picker. API `duration_options` is a single value (e.g. `["10s"]`) so mismatched duration would 400; saved by the `useEffect` at line 608 that locks the picker to `opts[0]`, but ANY future regression that lets a user override duration would break — `kubeez-video-model-variants.ts:10` + `kubeez-generate-image-dialog.tsx:969`
- **seedance-2 family (seedance-2-480p, -720p, -480p-video-ref, -720p-video-ref, seedance-2-fast-480p, -720p, -480p-video-ref, -720p-video-ref)**: no `matchModelId` in `model-family-registry.ts`, no fallback `prompt_max_chars` row (API returns 2500), no `maxReferenceFiles` docs row (API returns 9 images + 3 videos + 3 audios) — on first paint before API loads, the generate dialog has undefined `prompt_max_chars` and falls back to its hard-coded value; reference limits default to API which may not be loaded yet. Also: offline browse catalog has no Seedance 2 card — no registry match
- **p-video**: same — no registry, no fallback, no docs row. API `prompt_max_chars=2000`, `duration_options=1s..20s`, supports `image`+`audio` input media types (unique in catalog), no offline card
- **v1-pro-fast-i2v-{720p,1080p}-{5s,10s} (all 4)**: API `generation_types` is `["image-to-video"]` only and `requires_input_media: true`, but offline catalog row for `v1-pro-fast-i2v-720p-5s` sets `supportsTextToVideo: true` — in offline browse (pre-API-load) users see a T2V card for a model that rejects T2V requests. Live API overrides, so this only bites before `GET /v1/models` completes — `kubeez-offline-browse-catalog.ts:38-43`

## Minor drift

- **kling-2-6-motion-control-720p / -1080p**: API `aspect_ratio_options=[16:9, 9:16, 1:1]`, `getVideoAspectUi()` returns `null` for `base === 'kling-2-6-motion'` so no aspect picker is shown — missed capability, no rejection — `kubeez-video-aspect-ui.ts:125-127`
- **kling-3-0-motion-control-720p / -1080p**: same — `getVideoAspectUi()` returns `null` for kling-3-0 motion line; API reports no aspect_ratio_options on these two rows (empty absent), matches by coincidence — `kubeez-video-aspect-ui.ts:141-142`
- **kling-3-0-pro / kling-3-0-std**: API `duration_options` is integers 3s..15s (13 options). `videoModelIdEncodesVariantParams("kling-3-0-std")` returns `false` (ends in `-std`/`-pro`, regex wants `Ns` tail), so `showDurationControl` is TRUE and the generic `videoDuration` picker ships `duration: videoDuration` to the API disconnected from the `kling30` settings axis. `useEffect` at line 608 picks `opts[0] = "3s"` as default — the shortest, cheapest value. Users get the minimum duration unless they notice the generic picker. Per-second billing model (21 cr/s pro, 17 cr/s std) × 15 possible values makes the default-silently-3s a real surprise — `kubeez-generate-image-dialog.tsx:608,969` + `model-family-registry.ts:427-429`
- **seedance-1-5-pro (all 12)**: API `aspect_ratio_options` includes `21:9` which `SEEDANCE_15_PRO_ASPECT_RATIOS` does include, but the aspect list does NOT include `adaptive` (no seedance row reports adaptive) — no drift. Listed here only to confirm — `kubeez-video-aspect-ui.ts:13-20`
- **kling-2-6 duration**: registry default `videoAxes: { duration: '4s' }` for composed families at `model-family-registry.ts:468-470`; kling-2-6 overrides with `{ duration: '5s' }` at line 418. For Seedance 1.5 Pro the `4s` default is valid (API: `["4s","8s","12s"]`); for v1-pro-fast-i2v the `4s` default is INVALID (API: `["5s","10s"]`) but duration isn't sent because ids encode it — net OK, but default-inference is inconsistent — `model-family-registry.ts:468-470`
- **sora-2-pro-storyboard-10s / -15s / -25s**: API `generation_types=["text-to-video","image-to-video"]` but `inferGenerationTypeFromConcreteModelId()` returns `undefined` for storyboard ids (line 87) — web file-restrictions returns `maxFiles: 1` unconditionally so no 400, but the `undefined` generation_type path means no explicit mode handling — `kubeez-generate-generation-context.ts:87`
- **kling-2-6 T2V aspect default `1:1`**: `getVideoAspectUi()` returns `defaultValue: '1:1'` for kling-2-6, API lists `[1:1, 16:9, 9:16]` so all three are valid — `1:1` as default is unusual for text-to-video (users expect 16:9); cosmetic — `kubeez-video-aspect-ui.ts:136`
- **sora-2-image-to-video-{10s,15s}**: API `input_media_types: []` on capabilities block (empty!) but top-level `input_media_types: []` and `generation_types: ["image-to-video"]` with `max_input_images: 1` — mildly inconsistent API shape; client treats by generation_types so no bug
- **seedance-1-5-pro-{480p,720p,1080p}-{4s,8s,12s}-audio variants**: API `supports_sound: true` with `video_audio: "toggle_via_sound_param"`, meaning the `-audio` suffix model IS a separate billing tier but the client can ALSO drive audio via the `sound` param on the non-audio variant. Double-encoding: selecting `-8s-audio` AND passing `sound: true` could double-bill. No evidence client does both, but the registry strategy is `composed` (audio axis → `-audio` suffix) so safe — flagged for awareness — `kubeez-video-model-variants.ts:30`

## Confirmed no-drift (inspected, no action)

- **veo3-1-fast-reference-to-video**: API `aspect_ratio_options=["16:9"]`, `getVideoAspectUi()` returns `force16x9: true` — client correctly locks aspect
- **One-direction-only models**: `grok-image-to-video`, `kling-2-6-image-to-video-*` (4), `kling-2-6-text-to-video-*` (4), `kling-2-6-motion-control-*` (2), `kling-3-0-motion-control-*` (2), `sora-2-image-to-video-*` (2), `sora-2-text-to-video-*` (2), `sora-2-pro-image-to-video-*` (4), `sora-2-pro-text-to-video-*` (4), `veo3-1-*-first-and-last-frames` (3), `veo3-1-fast-reference-to-video`, `veo3-1-*-text-to-video` (3), `v1-pro-fast-i2v-*` (4, offline-only flag noted above), `kling-2-5-image-to-video-pro*` (2) — all registry `matchModelId` entries map to the correct unique mode via explicit settings (`veo31.mode`, `kling26.mode`, `sora2.mode`, `grokVideoMode`), so the client cannot flip direction and trigger a `generation_types` rejection
- **Veo 3.1 Lite reference-to-video downgrade**: API does not expose a `veo3-1-lite-reference-to-video` row (only text-to-video and first-and-last-frames); `mapVeo31ToModelId()` at `model-family-registry.ts:562-564` downgrades lite+reference to `text-to-video` defensively — correct
- **Wan 2.5 `supports_sound: false`**: API reports `video_audio: "included"` (bundled audio, no toggle) for every Wan 2.5 row — no `-audio` suffix variants exist; `mapWan25ToModelId()` never appends audio; registry `wan-2-5` entry has no audio axis — correct
- **Kling 2.5 I2V Pro**: API `duration_options: []` and `aspect_ratio_options: absent`; registry uses `toggle` strategy with `kling25Clip: '5s' | '10s'` mapping to the `kling-2-5-image-to-video-pro` (5s) / `kling-2-5-image-to-video-pro-10s` ids — duration is encoded in the id, never sent in body — correct

## New models missing from offline catalog / registry / doc-limits

- **seedance-2-480p**: missing from registry, offline catalog, fallback EXACT/PREFIX, and `kubeez-documented-reference-limits.ts`
- **seedance-2-720p**: same
- **seedance-2-480p-video-ref**: same — also unique per-second pricing (video-ref path)
- **seedance-2-720p-video-ref**: same
- **seedance-2-fast-480p**: same
- **seedance-2-fast-720p**: same
- **seedance-2-fast-480p-video-ref**: same
- **seedance-2-fast-720p-video-ref**: same
- **p-video**: missing everywhere; unique `input_media_types: ["image","audio"]` with `max_input_audios: 1` (only video model accepting audio for lip sync); `prompt_max_chars=2000` (unique value, not in fallback)

## Orphaned models (EXACT entries in code, not in live API)

- **wan-2-5-text-to-video-5s**: in fallback EXACT line 120; live API has only `wan-2-5-text-to-video-5s-720p` and `wan-2-5-text-to-video-5s-1080p` (requires resolution suffix) — `kubeez-model-requirements-fallback.ts:120`
- **wan-2-5-image-to-video-5s**: same — fallback line 121, no suffix-less id in API — `kubeez-model-requirements-fallback.ts:121`
- **sora-2-pro-text-to-video-10s**: fallback line 128, API has only `-10s-hd` / `-10s-standard` — `kubeez-model-requirements-fallback.ts:128`
- **sora-2-pro-image-to-video-10s**: fallback line 129, API has only `-10s-hd` / `-10s-standard` — `kubeez-model-requirements-fallback.ts:129`

## Variant-id encoding gaps (duration/quality double-sent risk)

The `videoModelIdEncodesVariantParams` regex at `kubeez-video-model-variants.ts:10` is `^(.+?)-(?:(\d+p)-)?(\d+)s(-audio)?$` — it requires the id to end in `Ns` or `Ns-audio`. These ids encode duration/quality but do NOT match the regex, so the dialog will happily send a body `duration` that the API may conflict with the id-encoded one:

- **wan-2-5-text-to-video-5s-720p**: id encodes `5s`, duration-then-resolution suffix breaks regex — dialog sends user-chosen duration (`5s` or `10s` from API options) alongside an id that locks to `5s` — billing/model mismatch if user picks `10s`
- **wan-2-5-text-to-video-5s-1080p**: same
- **wan-2-5-text-to-video-10s-720p**: id locks `10s`, user could pick `5s` → mismatch
- **wan-2-5-text-to-video-10s-1080p**: same
- **wan-2-5-image-to-video-5s-720p / -5s-1080p / -10s-720p / -10s-1080p**: same 4 variants for image-to-video
- **sora-2-pro-text-to-video-10s-hd / -10s-standard / -15s-hd / -15s-standard**: id encodes duration + quality, `-hd`/`-standard` tail breaks regex — dialog sends duration but API `duration_options` has a single value so duration picker is locked (safe today by `useEffect` at dialog line 608, fragile otherwise)
- **sora-2-pro-image-to-video-10s-hd / -10s-standard / -15s-hd / -15s-standard**: same 4 variants for image-to-video
- **Suggested fix**: prefer an explicit allowlist of duration-encoded base id patterns (Kling 2.6 T2V/I2V, Kling 2.5 I2V Pro, Sora 2 T2V/I2V, Sora 2 Pro storyboard, Sora 2 Pro T2V/I2V, Wan 2.5 T2V/I2V 8 variants, Seedance 1.5 Pro variants, v1-pro-fast-i2v variants, Grok T2V-6s) over one mega-regex — Wan 2.5 uses `{duration}s-{resolution}` and Sora 2 Pro uses `{duration}s-{hd|standard}`, so a single suffix pattern has to fork per family
