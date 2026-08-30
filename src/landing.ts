export function landingHtml(origin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tag Template Engine v3</title>
  <meta name="description" content="Server-side conversion tags for Meta, TikTok, Google Ads, Klaviyo, and Pinterest. Auto-init configs. No terminal needed." />
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #fafafa; color: #111; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 20px 80px; }
    .mark { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; background: #111; color: #fff; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 12px; }
    .row { display: flex; align-items: center; gap: 10px; }
    h1 { font-size: 32px; letter-spacing: -0.04em; margin: 18px 0 8px; }
    p.lead { color: #525252; font-size: 16px; line-height: 1.6; }
    .badge { font-size: 12px; background: #eee; border-radius: 999px; padding: 3px 8px; }
    section { margin-top: 36px; }
    h2 { font-size: 16px; margin: 0 0 10px; }
    pre, code { font-family: ui-monospace, SFMono-Regular, monospace; }
    pre { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 16px; overflow: auto; font-size: 12px; line-height: 1.55; }
    #health { background: #fff; border: 1px solid #ececec; border-radius: 12px; padding: 16px; font-size: 14px; }
    a { color: inherit; }
  </style>
</head>
<body>
  <main>
    <div class="row"><span class="mark">{ }</span><strong>Tag Template Engine</strong><span class="badge">v3</span></div>
    <h1>Auto-init configs. No terminal needed.</h1>
    <p class="lead">Click Deploy to Cloudflare, set your secrets, and it works. Built-in templates fan events out to Meta, TikTok, Google Ads, Klaviyo, and Pinterest. KV and Queue are optional.</p>
    <section>
      <h2>Health</h2>
      <div id="health">Loading…</div>
    </section>
    <section>
      <h2>Send an event</h2>
      <pre>curl -X POST ${origin}/event \\
  -H 'content-type: application/json' \\
  -d '{
    "event_name": "Purchase",
    "email": "buyer@example.com",
    "value": 149,
    "currency": "USD"
  }'</pre>
    </section>
    <section>
      <h2>GitHub</h2>
      <p class="lead"><a href="https://github.com/faisalbhxyz/tag-template-engine">github.com/faisalbhxyz/tag-template-engine</a></p>
    </section>
  </main>
  <script>
    fetch("/health").then((r) => r.json()).then((data) => {
      document.getElementById("health").innerHTML =
        "<div><strong>mode</strong> " + data.mode + "</div>" +
        "<div>kv_bound: " + data.kv_bound + " · queue_bound: " + data.queue_bound + "</div>" +
        "<div>platforms: " + (data.platforms || []).join(", ") + "</div>";
    }).catch(() => {
      document.getElementById("health").textContent = "Health check failed.";
    });
  </script>
</body>
</html>`
}
