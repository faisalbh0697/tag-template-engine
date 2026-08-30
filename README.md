# Tag Template Engine

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/faisalbhxyz/tag-template-engine)

**Just click Deploy to Cloudflare, set your secrets, and it works.**

v3 ships with built-in conversion templates for Meta, TikTok, Google Ads, Klaviyo, and Pinterest. Configs auto-init from code. **No terminal, no `wrangler kv`, no Queue setup required.**

**Optional:** add a KV namespace and a Queue later if you want the admin API and automatic retries.

Repository: [github.com/faisalbhxyz/tag-template-engine](https://github.com/faisalbhxyz/tag-template-engine)

---

## What it does

`POST /event` takes a generic conversion payload, renders each enabled platform template, and forwards the request.

| Mode | Bindings | Behavior |
| --- | --- | --- |
| `minimal` | none | Built-in configs. Failures are logged. No admin API. |
| `partial` | KV only | Admin API + live config edits. No retry queue. |
| `full` | KV + Queue | Admin API + retries. |

---

## 1. Create the GitHub repo

1. Open **[github.com/new](https://github.com/new)**
2. Owner: **`faisalbhxyz`**
3. Repository name: **`tag-template-engine`**
4. Visibility: **Public** (needed for the Deploy to Cloudflare button)
5. Leave README / .gitignore / license **unchecked**
6. Click **Create repository**

Then push this project:

```bash
git remote add github https://github.com/faisalbhxyz/tag-template-engine.git
git branch -M main
git push -u github main
```

If `github` already exists:

```bash
git remote set-url github https://github.com/faisalbhxyz/tag-template-engine.git
git push -u github main
```

---

## 2. Deploy

### One click

Use the **Deploy to Cloudflare** button at the top. Cloudflare clones this repo, reads `wrangler.jsonc`, and publishes a Worker **with zero bindings**.

Then in the Cloudflare dashboard → Worker → Settings → Variables:

| Secret | Used by |
| --- | --- |
| `FB_ACCESS_TOKEN` | Meta CAPI |
| `FB_PIXEL_ID` | Meta CAPI |
| `TIKTOK_ACCESS_TOKEN` | TikTok |
| `TIKTOK_PIXEL_CODE` | TikTok |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads |
| `GOOGLE_ADS_OAUTH_TOKEN` | Google Ads |
| `GOOGLE_ADS_CUSTOMER_ID` | Google Ads |
| `GOOGLE_ADS_CONVERSION_ACTION_ID` | Google Ads |
| `KLAVIYO_API_KEY` | Klaviyo |
| `KLAVIYO_PUBLIC_KEY` | Klaviyo |
| `PINTEREST_ACCESS_TOKEN` | Pinterest |
| `PINTEREST_AD_ACCOUNT_ID` | Pinterest |

Only set the platforms you use. Missing secrets skip that platform’s usefulness but **never crash the Worker**.

### CLI

```bash
npx wrangler login
npm install
npm run deploy
```

### Optional KV + Queue

Uncomment the `kv_namespaces` and `queues` blocks in `wrangler.jsonc`, create the resources in Cloudflare, paste the IDs, and redeploy.

- **KV (`CONFIG`)** — admin API (`/admin/configs`, `/admin/config`, `/admin/toggle`, `/admin/reset`) and live template edits
- **Queue (`RETRY_QUEUE`)** — retry failed platform calls

Without them the Worker stays in `minimal` mode and still sends events from `BUILTIN_CONFIGS`.

---

## 3. Run locally

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
  "ok": true,
  "mode": "minimal",
  "kv_bound": false,
  "queue_bound": false,
  "platforms": ["facebook", "tiktok", "google_ads", "klaviyo", "pinterest"],
  "secrets_configured": { "FB_ACCESS_TOKEN": false }
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

### Admin (KV required)

If KV is not bound, every admin route returns:

```json
{ "error": "KV namespace not bound. Admin API requires KV." }
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
