# Kubeez API Model Gaps Report

**Date:** 2026-04-12
**API snapshot:** `GET /v1/models` from 2026-03-28 (111 models)
**Website reference:** `KubeezWebsite/src/components/video/config/modelCatalog.tsx`
**Prepared by:** KubeezCut editor team

---

## Executive Summary

Cross-referencing the Kubeez REST API (`GET /v1/models`) against the KubeezWebsite model catalog reveals **several concrete model IDs that the website expects but the API does not return**. The most impactful gap is the Veo 3.1 Lite tier. Additionally, the API is missing resolution tiers for Seedream models that the website's UI supports.

---

## 1. CRITICAL: Veo 3.1 Lite Tier Models Missing

**Impact:** Users cannot select Veo 3.1 Lite in KubeezCut. The website UI references these model IDs but the API never returns them.

| Expected model_id | Status in API | Website behavior |
|---|---|---|
| `veo3-1-lite-text-to-video` | **MISSING** | Website checks `isModelEnabled()` and hides the Lite button when absent |
| `veo3-1-lite-first-and-last-frames` | **MISSING** | Same — Lite tier never shows if these are disabled |

**What exists:**
- `veo3-1-fast-text-to-video` (99 cr)
- `veo3-1-fast-first-and-last-frames` (99 cr)
- `veo3-1-fast-reference-to-video` (99 cr)
- `veo3-1-text-to-video` (390 cr, quality tier)
- `veo3-1-first-and-last-frames` (390 cr, quality tier)

**Action needed:** Add `veo3-1-lite-text-to-video` and `veo3-1-lite-first-and-last-frames` to `GET /v1/models` with appropriate `cost_per_generation`. The website's `getActualModel()` already maps Lite tier to these IDs.

---

## 2. CLARIFICATION: Seedream Quality Is a POST Parameter (Not Model ID Variants)

**Status:** NOT a gap — quality is sent as a `quality` field in the POST body.

Seedream V4.5 and 5 Lite support resolution tiers via a `quality` parameter:

| Model | `quality: 'basic'` | `quality: 'high'` |
|---|---|---|
| `seedream-v4-5` | 2K resolution | 4K resolution |
| `5-lite-text-to-image` | 2K resolution | 3K resolution |

This is documented in the REST API model requirements. The KubeezCut editor now supports this via a Quality selector in the generate dialog.

---

## 4. NAMING INCONSISTENCY: Logo-maker

| API returns | Website expects |
|---|---|
| `Logo-maker` (capital L) | `logo-maker` (lowercase) |

**Impact:** Case-sensitive `model_id` matching may fail. The API should normalize to lowercase `logo-maker` or the website needs to handle both.

---

## 5. NAMING INCONSISTENCY: Z-Image

| API returns | Website references |
|---|---|
| `z-image` | `replicate-z-image` |
| `z-image-hd` | `replicate-z-image-hd` |

**Impact:** The website uses the `replicate-` prefix internally. The migration in `useModelConfiguration.ts` maps `z-image` to `replicate-z-image`. This works but is fragile. Recommend aligning on a single naming convention.

---

## 6. INFORMATIONAL: Models in API Not Surfaced in Website

These models exist in the API but the website catalog doesn't display them (by design):

| model_id | model_type | Notes |
|---|---|---|
| `auto-caption` | other | Internal tool, not generative |
| `mvsep-40` | separation | Audio stem separation |
| `text-to-dialogue-v3` | speech | Exposed via separate dialogue UI, not the model catalog |
| `V4`, `V4_5`, `V4_5PLUS`, `V5`, `V5_5` | music | Exposed via music model picker, not the main catalog |
| `suno-add-instrumental`, `suno-add-vocals`, `suno-lyrics-generation` | music | Exposed via music tools UI |

These are intentionally separate — no action needed.

---

## 7. INFORMATIONAL: Website-Only Container Models

These model IDs exist in the website catalog as **UI containers** that map to concrete API variants. They are NOT expected to exist in `GET /v1/models`:

| Container model_id | Maps to |
|---|---|
| `flux-2` | `flux-2-1K` (default) |
| `flux-2-edit` | `flux-2-edit-1K` (default) |
| `grok` | `grok-text-to-video-6s` or `grok-image-to-video` |
| `sora-2` | `sora-2-text-to-video-10s` (default) |
| `sora-2-pro` | `sora-2-pro-text-to-video-10s-standard` (default) |
| `sora-2-pro-storyboard` | `sora-2-pro-storyboard-10s` (default) |
| `seedance-1-5-pro` | `seedance-1-5-pro-720p-8s` (default) |
| `v1-pro-fast-i2v` | `v1-pro-fast-i2v-720p-5s` (default) |
| `veo3-1-fast` | `veo3-1-fast-text-to-video` (default) |
| `veo3-1` | `veo3-1-text-to-video` (quality default) |
| `veo3-1-lite` | `veo3-1-lite-text-to-video` (**MISSING from API**) |
| `wan-nsfw`, `wan-nsfw-video`, `wan-nsfw-i2v` | Internal models — not in public API |

No action needed for containers — these are UI grouping mechanisms.

---

## Summary of Required API Changes

### Priority 1 (Blocking)
1. **Add `veo3-1-lite-text-to-video`** to `GET /v1/models`
2. **Add `veo3-1-lite-first-and-last-frames`** to `GET /v1/models`

### Priority 2 (Feature gap)
3. **Add Seedream V4.5 resolution tiers** (`seedream-v4-5-2K`, `seedream-v4-5-4K`) if the provider supports them
4. **Add Seedream V4 resolution tiers** (`seedream-v4-2K`, `seedream-v4-4K`, `seedream-v4-edit-2K`, `seedream-v4-edit-4K`) if supported

### Priority 3 (Cleanup)
5. **Normalize `Logo-maker` to `logo-maker`** (lowercase) for consistency
6. **Align Z-Image naming** — decide on `z-image` vs `replicate-z-image`
