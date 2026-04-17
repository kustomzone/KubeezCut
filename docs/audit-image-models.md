# Image Model Audit — 2026-04-17

Compares live API (`GET /v1/models?model_type=image`, 32 models) against local fallback code. Inspection sources:

- Live data: `C:\Users\mihai\AppData\Local\Temp\kubeez-audit\image.json` (32 models, `total_count=32`)
- Fallback: `src/infrastructure/kubeez/kubeez-model-requirements-fallback.ts`
- Reference caps: `src/infrastructure/kubeez/kubeez-documented-reference-limits.ts` + `src/infrastructure/kubeez/kubeez-web-file-restrictions.ts`
- Offline catalog: `src/infrastructure/kubeez/kubeez-offline-browse-catalog.ts`
- Family registry: `src/infrastructure/kubeez/model-family-registry.ts`

## Summary

- Live API models: 32
- Drift found: 20 (critical: 7, minor: 13)
- All `prompt_max_chars` match — the recent z-image fix cleaned up the last known prompt drift. No further prompt-length bugs found.

## Critical mismatches (will cause API rejections or 404 on POST)

- **gpt-1.5-image-high**: fallback offers aspects `[1:1,16:9,9:16,4:3,3:4]`, API allows ONLY `[1:1,2:3,3:2]` — user-picked 16:9/9:16/4:3/3:4 will be rejected by API — `kubeez-model-requirements-fallback.ts:91`
- **gpt-1.5-image-medium**: same — fallback allows 4 aspects API rejects — `kubeez-model-requirements-fallback.ts:90`
- **nano-banana**: `max_input_images=0` (text-to-image only per `generation_types`), but web file-restrictions returns `maxFiles: 10` without gating on generation_type — `kubeez-web-file-restrictions.ts:43-48` + `kubeez-documented-reference-limits.ts:41`
- **flux-2-1K**: `max_input_images=0` (text-to-image only), but `LEGACY_REST_EXACT` returns 8 — `kubeez-documented-reference-limits.ts:30`
- **flux-2-2K**: same, `LEGACY_REST_EXACT` returns 8 against API 0 — `kubeez-documented-reference-limits.ts:31`
- **grok-text-to-image**: `max_input_images=0` (text-to-image only), `LEGACY_REST_EXACT` returns 1 — `kubeez-documented-reference-limits.ts:37`
- **qwen-text-to-image**: `max_input_images=0` (text-to-image only), but web file-restrictions (`qwen-text-to-image || qwen-image-to-image`) returns 1 — `kubeez-web-file-restrictions.ts:237-243`

## Minor drift (cosmetic / offline-only — fallback is strict subset of API)

These are cases where the fallback `aspectRatioOptions = DEFAULT_IMAGE_ASPECTS` (`['1:1','16:9','9:16','4:3','3:4']`) hides valid API aspects. In online mode the API list wins; in offline browse mode users see a narrower picker. No API rejection risk.

- **5-lite-image-to-image**: fallback hides `3:2, 2:3, 21:9` — `kubeez-model-requirements-fallback.ts:50`
- **5-lite-text-to-image**: fallback hides `3:2, 2:3, 21:9` — `kubeez-model-requirements-fallback.ts:49`
- **flux-2-1K / flux-2-2K / flux-2-edit-1K / flux-2-edit-2K**: fallback hides `3:2, 2:3, auto` — `kubeez-model-requirements-fallback.ts:54-57` (and prefix `flux-2-` line 162)
- **grok-image-to-image**: fallback offers `[1:1,2:3,3:2]` but API also supports `9:16, 16:9` — `kubeez-model-requirements-fallback.ts:65-69`
- **grok-text-to-image**: same — fallback hides `9:16, 16:9` that API supports — `kubeez-model-requirements-fallback.ts:60-64`
- **logo-maker**: fallback hides `3:2, 2:3, 4:5, 5:4, 1:2, 2:1` (API supports 11 aspects incl. SVG-friendly portrait ratios) — `kubeez-model-requirements-fallback.ts:99`
- **nano-banana / nano-banana-edit**: fallback hides `3:2, 2:3, 21:9, 5:4, 4:5, auto` — `kubeez-model-requirements-fallback.ts:81-82`
- **nano-banana-2 / -2K / -4K**: fallback hides `3:2, 2:3, 21:9, 5:4, 4:5, auto` — `kubeez-model-requirements-fallback.ts:83-85`
- **nano-banana-pro / -2K / -4K**: fallback hides `3:2, 2:3, 21:9, 5:4, 4:5, auto` — `kubeez-model-requirements-fallback.ts:86-88`
- **qwen-image-to-image**: fallback hides `2:3, 3:2, 21:9` — `kubeez-model-requirements-fallback.ts:94`
- **seedream-v4 / v4-edit / v4-5 / v4-5-edit**: fallback hides `3:2, 2:3, 21:9` — `kubeez-model-requirements-fallback.ts:44-47`
- **p-image-edit aspect picker hidden**: intentional (fallback sets `showAspectRatio: false` — comment at line 96 marks it as design choice). Not drift.

## New models missing from offline catalog

- **ad-copy**: in API (provider Kubeez, 50 credits, generation_types `["text-to-image","image-to-image"]`) but `capabilities={}`. Missing from `kubeez-offline-browse-catalog.ts`, no fallback row, no family registry entry, no reference-limit row. If this model is meant to be user-facing, add a row to the offline catalog

## Orphaned models (in code, not in API)

- **seedream-v5-lite**: in offline catalog `kubeez-offline-browse-catalog.ts:134` and EXACT fallback `kubeez-model-requirements-fallback.ts:48` — API returns only `5-lite-text-to-image` / `5-lite-image-to-image`. Picking this card from offline browse will POST an unknown model id
- **flux-2**: in offline catalog `kubeez-offline-browse-catalog.ts:106` and EXACT fallback `kubeez-model-requirements-fallback.ts:53` — API returns only `flux-2-1K`, `flux-2-2K`, `flux-2-edit-1K`, `flux-2-edit-2K`. Also matched by prefix rule at `kubeez-model-requirements-fallback.ts:162`, which is fine, but the bare `flux-2` offline card will 404 on POST

## Models without family-registry entry (informational — non-parameterized single-id cards)

By design, the registry only lists families with multiple variant ids (`parameterized`, `composed`, `toggle`). These standalone ids are NOT in `matchModelId` and that is correct — flagged here only for completeness:

`5-lite-image-to-image`, `5-lite-text-to-image`, `ad-copy`, `flux-2-1K`, `flux-2-2K`, `flux-2-edit-1K`, `flux-2-edit-2K`, `grok-image-to-image`, `grok-text-to-image`, `logo-maker`, `nano-banana`, `nano-banana-edit`, `p-image-edit`, `qwen-image-to-image`, `qwen-text-to-image`, `seedream-v4`, `seedream-v4-5`, `seedream-v4-5-edit`, `seedream-v4-edit`

## Suggested fixes (by priority)

1. **gpt-1.5-image-high/medium aspect list** — change fallback to `['1:1', '2:3', '3:2']` (matches API). Highest impact: offline users and anyone running before the API response arrives will send aspects that 400.
2. **text-to-image reference-file caps** — `nano-banana`, `flux-2-1K`, `flux-2-2K`, `grok-text-to-image`, `qwen-text-to-image` should return `maxFiles: 0` for their `text-to-image` generation_type, OR the fallback should consult `generation_types`/`requires_input_media` from the API row. Currently `getFileLimitForModel` and `LEGACY_REST_EXACT` return caps that assume image-editing variants.
3. **Remove or rename orphans** — `seedream-v5-lite` and bare `flux-2` in the offline catalog and EXACT fallback map. Either drop them, or map them internally to a concrete API id on POST.
4. **ad-copy** — decide whether to surface it in the offline catalog; if yes, add a row (and consider whether its empty capabilities block should get a fallback). If not, ignore.
5. **Aspect-ratio fallback widenings** (minor) — `DEFAULT_IMAGE_ASPECTS` is too narrow for Seedream V4 family, Nano Banana family, Flux 2, Qwen i2i, grok, 5-lite, logo-maker. Either extend the shared constant or add family-specific fallback rows.
