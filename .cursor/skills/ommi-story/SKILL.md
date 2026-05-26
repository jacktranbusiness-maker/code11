---
name: ommi-story
description: Seedance 2.0 Omni (ommi-story) queue manager on 79ai.net via Gommo API. Use when working on this repo, Seedance video generation, 79ai.net tokens, bulk prompts, Next.js proxy at pages/api/gommo.js, or queue/poll logic in pages/index.js.
paths:
  - "**/*"
---

# Ommi Story — Seedance Queue Manager

Antivity project for auto-queuing **Seedance 2.0 Omni** video jobs on **79ai.net** through the **Gommo** API (`api.gommo.net`). The app keeps the user's concurrent slot full by polling active jobs and submitting from a prompt queue.

## Stack

- **Next.js 14** (Pages Router): `pages/index.js`, `pages/api/gommo.js`, `pages/_app.js`
- **Tailwind CSS** — dark zinc/emerald UI in `styles/globals.css`
- **Deploy**: Vercel (no server env vars; `access_token` entered in UI)

## Hardcoded API defaults

| Setting | Value |
|--------|--------|
| Domain | `79ai.net` |
| Model | `seedance_20_pro_edit` (Seedance 2.0 Omni) |
| Mode | `business_fast` (Face Support; only active mode) |
| Resolution | `720p` (Pro plan) |
| Poll interval | 8000 ms |

Do not change model/mode/resolution without explicit user request — they match 79ai Pro plan limits.

## Gommo proxy (`pages/api/gommo.js`)

Browser calls `POST /api/gommo` with JSON `{ endpoint, ...fields }`. Allowed endpoints:

| `endpoint` key | Gommo path |
|----------------|------------|
| `create-video` | `/ai/create-video` |
| `check-video` | `/ai/video` |
| `list-videos` | `/ai/videos` |
| `list-models` | `/ai/models` |

Upstream: `POST https://api.gommo.net{path}` with `application/x-www-form-urlencoded` body. All request fields (including `access_token`, `domain`, `prompt`, etc.) are forwarded as form fields.

## Client queue flow (`pages/index.js`)

1. User sets `access_token` from https://79ai.net/pages/account/apikeys
2. Prompts live in `queue`; up to `maxC` jobs in `active` (default 4 for Pro)
3. Every `POLL_MS`: poll each active job via `check-video` + `videoId`
4. On success: move to `done` with `download_url`
5. On fail: move to `failed`; user can retry single or all
6. Fill empty slots by calling `create-video` for next queue items

### Status constants (`ST`)

- `MEDIA_GENERATION_STATUS_PENDING` / `ACTIVE` / `PROCESSING` / `SUCCESSFUL` / `FAILED`
- Done only when status is successful **and** `download_url` is present (otherwise log warning and keep polling)

### `create-video` payload (from UI)

`access_token`, `domain`, `model`, `mode`, `privacy`, `prompt`, `translate_to_en` (`'true'`/`'false'`), `ratio`, `resolution`, `duration`

Response success: `data.videoInfo.id_base` becomes job id.

## Prompt best practices (Gommo / Seedance)

- **Chinese prompts** often produce more accurate results
- Reference assets: `@image1`, `@video1`, `@audio1` (max 3 images, 1 video, 1 audio)
- No real-person photos; avoid copyrighted character names

## Local development

```bash
npm install
npm run dev
# http://localhost:3000
```

## When modifying

- Keep CORS workaround: all Gommo calls go through `/api/gommo`, never direct browser → `api.gommo.net`
- Preserve refs pattern (`qRef`, `aRef`, `runRef`, `cfgRef`) so interval `tick` sees latest state
- UI copy and logs use Vietnamese locale for timestamps (`vi-VN`)
- Match existing Tailwind patterns (zinc-900 cards, emerald accents)

## Security

- Never commit real `access_token` values
- Do not log full tokens in server or client code

## Related names

- Repo / folder: `ommi-story`, package name `seedance-queue-manager`
- Product: Seedance 2.0 Omni on 79ai.net
