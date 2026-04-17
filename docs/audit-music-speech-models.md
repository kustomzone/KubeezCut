# Music + Speech Model Audit — 2026-04-17

## Summary
- Music: 6 models (`suno-lyrics-generation`, `V4`, `V4_5`, `V4_5PLUS`, `V5`, `V5_5`); Speech: 2 models (`auto-caption-universal-3-pro`, `text-to-dialogue-v3`)
- Drift: critical=3, minor=4, new=1, orphan=3
- Live API `capabilities` is `{}` for all music rows and for `auto-caption-universal-3-pro`; only `text-to-dialogue-v3` advertises `prompt_max_chars: 5000`

## Critical mismatches
- Speech models are never fetched from the API — no `fetchModelsForType({ modelType: 'speech' })` call exists; UI only exposes the hardcoded `KUBEEZ_SPEECH_DIALOGUE_MODEL` stub (`src/infrastructure/kubeez/kubeez-models.ts:68-75`, `src/components/kubeez/kubeez-generate-image-dialog.tsx:218`). Both live speech models are invisible to users.
- `suno-tools` card resolves user choice to `suno-add-instrumental` / `suno-add-vocals` / `suno-lyrics-generation`, then POSTs `/v1/generate/music` with that string as `model` (`src/infrastructure/kubeez/model-resolve.ts:106-108` → `src/infrastructure/kubeez/kubeez-audio-generations.ts:600-608`). Server `_normalize_music_model` (KubeezWebsite `server/rest-api/tools/music.py:87-103`) silently defaults unknown values to `V5_5`, so the user selects "lyrics" or "add vocals" and gets a V5_5 full song instead — no surfaced error.
- `suno-add-instrumental` / `suno-add-vocals` are web-only (KubeezWebsite `supabase/migrations/20260328150000_suno_add_models_web_only_mcp_api.sql`) but are presented as selectable tools in the client (`src/infrastructure/kubeez/model-family-registry.ts:151-153,530-534`, `src/infrastructure/kubeez/kubeez-offline-browse-catalog.ts:145-146`) — user-facing dead paths.

## Minor drift
- `FALLBACK_MUSIC_MODELS` raw list omits `suno-lyrics-generation`, which the live API does return and which the offline catalog includes (`src/infrastructure/kubeez/kubeez-models.ts:77-83` vs `src/infrastructure/kubeez/kubeez-offline-browse-catalog.ts:147`). When `musicSource === 'fallback'` users get a narrower list than offline browse.
- Dialogue POST body sends an extra `model: 'text-to-dialogue-v3'` field (`src/infrastructure/kubeez/kubeez-audio-generations.ts:686-694`); server's `DialogueGenerateRequest` has no such field (KubeezWebsite `server/rest-api/routers/v1.py:453-463`) and silently ignores it (no `extra='forbid'` on the Pydantic model). Cosmetic, not broken.
- Live API `text-to-dialogue-v3` advertises `prompt_max_chars: 5000` but the speech stub has no `prompt_max_chars` and the UI hardcodes 5000 (`src/components/kubeez/kubeez-generate-image-dialog.tsx:511`). Matches today by coincidence; brittle if the cap changes.
- Music fallback `prompt_max_chars: 400` is set for all V-engines and all suno-* tool ids (`src/infrastructure/kubeez/kubeez-model-requirements-fallback.ts:135-142`); live API returns `capabilities: {}` for every music row, so the 400-char cap is purely local — documented as "form validation (non-custom prompt cap)" but reflects legacy simple-mode only (`_MAX_LEGACY_PROMPT` in KubeezWebsite `server/rest-api/tools/music.py:70`). OK as a conservative client-side gate; flag for future `custom_mode` support.

## New / missing in client
- `auto-caption-universal-3-pro` (AssemblyAI, speech, 0.7 cr, 60s) is present in the live API with `generation_types: ['text-to-dialogue']` but has no client representation anywhere — no offline catalog row, no registry entry, no UI affordance. Likely a captions / STT capability that KubeezCut could surface alongside its local `media-transcripts` store (`src/infrastructure/storage/indexeddb/connection.ts:165`).

## Orphans
- `suno-add-instrumental` and `suno-add-vocals` — referenced in `src/infrastructure/kubeez/kubeez-offline-browse-catalog.ts:145-146`, `src/infrastructure/kubeez/kubeez-model-requirements-fallback.ts:140-141`, `src/infrastructure/kubeez/model-family-registry.ts:151-153,530-534,619-626`, `src/infrastructure/kubeez/model-resolve.ts:106-108` but absent from live `/v1/models?model_type=music`; per migration `20260328150000_suno_add_models_web_only_mcp_api.sql` they are web-only.
- `suno-tools` base card (`src/infrastructure/kubeez/model-family-registry.ts:146-154`) is unreachable as an effective REST operation: the only tool id the API accepts here is `suno-lyrics-generation`, and even that is not a valid `model` for `POST /v1/generate/music` (no dedicated REST endpoint exists — see KubeezWebsite `server/rest-api/routers/v1.py` has no lyrics route). The whole card should either be removed from KubeezCut or gated behind a "KubeezWebsite-only" flag.
