# Tag Template Engine

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/faisalbhxyz/tag-template-engine)

**Click Deploy to Cloudflare, set your secrets, and it works.**

Server-side conversion tags for Meta, TikTok, Google Ads, Klaviyo, and Pinterest. Built-in templates auto-init from code. No terminal, no KV, no Queue required.

Repository: [github.com/faisalbhxyz/tag-template-engine](https://github.com/faisalbhxyz/tag-template-engine)

---

## What it does

`POST /event` takes a generic conversion payload, renders each enabled platform template, and forwards the request.

Empty secrets skip that platform instead of crashing the Worker.

| Mode | Bindings | Behavior |
| --- | --- | --- |
| `minimal` | none | Built-in configs. Failures are logged. No admin API. |
| `partial` | KV only | Admin API + live config edits. No retry queue. |
| `full` | KV + Queue | Admin API + retries. |

---

## Deploy

### One click

Cloudflare clones this repo, reads `wrangler.jsonc`, and publishes a Worker with zero bindings.

Then in the Cloudflare dashboard → Worker → Settings → Variables:

| Variable | Used by |
| --- | --- |
| `FB_ACCESS_TOKEN` | Meta CAPI |
| `TIKTOK_ACCESS_TOKEN` | TikTok |
| `TIKTOK_PIXEL_CODE` | TikTok |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads |
| `GOOGLE_ADS_OAUTH_TOKEN` | Google Ads |
| `KLAVIYO_API_KEY` | Klaviyo |
| `KLAVIYO_PUBLIC_KEY` | Klaviyo |
| `PINTEREST_ACCESS_TOKEN` | Pinterest |

Only set the platforms you use.

### CLI

```bash
npx wrangler login
npm install
npm run deploy
```

### Optional KV + Queue

Add a KV namespace binding named `CONFIG` and a Queue binding named `RETRY_QUEUE` in the Cloudflare dashboard if you want the admin API and automatic retries.

- **KV (`CONFIG`)** — admin API and live template edits
- **Queue (`RETRY_QUEUE`)** — retry failed platform calls

Without them the Worker stays in `minimal` mode and still sends events from built-in templates.

---

## Run locally

```bash
git clone https://github.com/faisalbhxyz/tag-template-engine.git
cd tag-template-engine
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Open [http://127.0.0.1:43181](http://127.0.0.1:43181)

| Script | Purpose |
| --- | --- |
| `npm run dev` | Wrangler dev server on port 43181 |
| `npm test` | Template + config unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run deploy` | Publish the Worker |

---

## API

### `GET /health`

```json
{
  "status": "ok",
  "mode": "minimal",
  "kv_bound": false,
  "queue_bound": false,
  "platforms": ["facebook", "tiktok", "google_ads", "klaviyo", "pinterest"],
  "secrets_configured": {
    "FB_ACCESS_TOKEN": false
  }
}
```

### `POST /event`

```bash
curl -X POST http://127.0.0.1:43181/event \
  -H 'content-type: application/json' \
  -d '{
    "event_name": "Purchase",
    "email": "buyer@example.com",
    "value": 149,
    "currency": "USD"
  }'
```

Empty tokens return `"status": "skipped"` for that platform.

### Admin (KV required)

If KV is not bound, every admin route returns:

```json
{
  "error": "KV namespace not bound. Add a KV namespace binding named 'CONFIG' to use admin API."
}
```

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/configs` | List templates |
| `GET` | `/admin/config?name=facebook` | Read one |
| `POST` | `/admin/config` | `{ "name", "config" }` upsert |
| `POST` | `/admin/toggle` | `{ "name", "enabled?" }` |
| `POST` | `/admin/reset` | Restore built-in templates |

---

## License

Proprietary.
