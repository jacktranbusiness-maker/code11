# Gommo API quick reference (ommi-story)

## Create video

**Proxy:** `POST /api/gommo`

```json
{
  "endpoint": "create-video",
  "access_token": "<token>",
  "domain": "79ai.net",
  "model": "seedance_20_pro_edit",
  "mode": "business_fast",
  "privacy": "PRIVATE",
  "prompt": "your prompt",
  "translate_to_en": "false",
  "ratio": "16:9",
  "resolution": "720p",
  "duration": "5"
}
```

## Check video status

```json
{
  "endpoint": "check-video",
  "access_token": "<token>",
  "domain": "79ai.net",
  "videoId": "<id_base from create>"
}
```

Expect `status` and `download_url` when complete.

## Token source

https://79ai.net/pages/account/apikeys
