# nginx reconciliation — live box vs repo (2026-08-21)

**Nothing in this document has been applied.** It is read-only analysis of the running server,
prepared for review. No symlink was changed, no config written, no reload run.

## What the target is actually running

Stated before any measurement, because every number below is only meaningful against a named revision:

- **App:** the image built from `origin/main` @ `467b206` (container `shaman-web`, started 2026-08-21 06:00:04Z).
- **nginx:** master process started 2026-07-21 06:00:21, serving `/etc/nginx/sites-enabled/shamanktmweb.conf`, a file last written **2026-05-03**.
- **The box does not run this PR, or any of the open drafts.** Nothing here verifies a fix — it
  describes the current state. Any check that would only pass if #117's script fix were present
  **could not pass on this box**, and its failure would say nothing about the fix.

Each check below was chosen so that both questions have an answer:

| check | what would make it FAIL | what would make it PASS |
|---|---|---|
| disk == memory (is `nginx -T` authoritative?) | enabled file newer than the nginx master process | file older than the process — **this is the case, by 79 days** |
| the reconciliation itself | many divergences | few or none — **it returned two** |
| the 25m ceiling probe | a 413 at the size under test — **40 MB produced one** | the body reaching the app — **26 MB did** |

## Read this first: what a wholesale "make the repo the source of truth" would have destroyed

`deploy/prod/nginx.conf` is the **pre-certbot template**. The live config is that template *plus*
certbot's TLS injection *plus* six weeks of hand edits. Counted directives:

| | live (`sites-enabled`) | box `sites-available` | repo `deploy/prod/nginx.conf` |
|---|---|---|---|
| `listen 443 ssl` | **4** | 4 | **0** |
| `ssl_certificate` / `_key` | **2** | 2 | **0** |
| `ssl_dhparam` | **2** | 2 | **0** |
| `include options-ssl-nginx.conf` | **2** | 2 | **0** |

**Copying the repo file over the live one and reloading would stop nginx listening on 443 at all.**
Every `https://www.shamankathmandu.com` request would fail to connect — a total outage of the
canonical URL, not a degradation. That is the cost of treating the repo as the source of truth here.

**And the narrower move — just restoring the symlink (`sites-enabled` → `sites-available`) — is also
not safe.** It preserves TLS, but it lowers `client_max_body_size` from **25m to 1m**, which is the
one setting the MCP upload feature depends on. See row 2.

## The diff: six weeks of unapplied config amounts to two lines

`sites-available` (2026-07-08) vs `sites-enabled` (2026-05-03, and what nginx actually loaded):

```
+    location = /api/sysuser/products/export { ... proxy_read_timeout 120s; proxy_send_timeout 120s; }
-    client_max_body_size 25m;     (live)
+    client_max_body_size 1m;      (available)
```

That is the whole of it. The delay was six weeks; the content is two changes.

## Decision table

| # | Divergence | live | available | repo | Decision | Why |
|---|---|---|---|---|---|---|
| 1 | TLS server blocks | present | present | **absent** | **KEEP LIVE** | The repo copy predates certbot. Adopting it removes HTTPS entirely. |
| 2 | `location /` `client_max_body_size` | **25m** | 1m | 1m | **KEEP LIVE (25m)** | Measured, not read: a 26,000,103-byte POST to `/api/mcp` reached the app (401); 40 MB was refused by nginx (413, logged at 06:33:52). The MCP `upload_media` base64 path caps at 10 MiB *decoded*, which is ~13.4 MiB on the wire after base64's 4/3 inflation. **1m would break it; 25m leaves 1.87× headroom.** |
| 3 | `location = /api/sysuser/products/export` (120s) | **absent** | present | present | **ADOPT** | This is the fix somebody wrote on 2026-07-08 that has never been in effect. The export currently runs under `location /`'s 30s. Adopting it is the whole of HIVE-84's proxy half. |
| 4 | `location = /api/mcp` (16m, 60s) | absent | absent | present | **ADOPT THE TIMEOUT, NOT THE SIZE** — add the block with `client_max_body_size 25m; proxy_read_timeout 60s;` | 16m would *lower* the ceiling for the only size-constrained path. Keeping 25m explicit also makes `/api/mcp` immune to a future tightening of `location /`. The 60s is headroom, not a fix: no `/api/mcp` timeout has ever been observed. |
| 5 | Header comment block | absent | absent | present | **repo only** | Cosmetic; belongs in the template, not on the box. |

`proxy_read_timeout 30s` / `proxy_send_timeout 30s` on `location /` are identical in all three. No divergence.

## Proposed final config

Take the **live** file (so TLS and 25m survive untouched) and add exactly two location blocks inside
the `www` server, before `location /`:

```nginx
    location = /api/sysuser/products/export {
        proxy_pass         http://shamanktmweb_upstream;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    location = /api/mcp {
        proxy_pass         http://shamanktmweb_upstream;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 25m;
    }
```

Nothing else changes. `location /` keeps 25m and 30s.

## Consequence that must not be missed: this breaks a test on purpose

Adopting row 3 raises the export's proxy budget from 30s to 120s. `lib/cms/product-export.ts`
(PR #118) derives its image-phase deadline from a named `PROXY_BUDGET_MS = 30_000`, and
`test/lib/product-export-deadline.test.ts` **pins that constant to 30_000 precisely so that whoever
reconciles nginx discovers it here rather than leaving the deadline silently pessimistic.**

So: when row 3 is applied, change `PROXY_BUDGET_MS` to `120_000` in the same change. The deadline
tracks the budget, so nothing else needs touching — the test will go green again on its own.

## Method — why this diff can be trusted

`nginx -T` dumps what nginx would load **from disk**; the running server holds what it loaded **into
memory** at its last successful reload, and the whole premise of this card is that reloads have been
failing. Those are only the same thing if nothing has been reloaded since the enabled file changed.
Checked rather than assumed:

- nginx master process started **2026-07-21 06:00:21** (up 31 days)
- `sites-enabled/shamanktmweb.conf` mtime **2026-05-03 14:00:42**

The file predates the process by 79 days, so disk and memory agree and `-T` is authoritative.
Independently corroborated by behaviour rather than by any file: the 26 MB POST that succeeded and
the 40 MB POST that nginx refused both match a 25m ceiling.

## Steps to apply — for the human, not for an agent

```bash
ssh shaman_web
sudo cp /etc/nginx/sites-enabled/shamanktmweb.conf \
        /etc/nginx/sites-enabled/shamanktmweb.conf.bak.$(date +%Y%m%d%H%M%S)
sudo nano /etc/nginx/sites-enabled/shamanktmweb.conf    # add the two blocks above
sudo nginx -t                                            # MUST pass before the next line
sudo systemctl reload nginx                              # reload, never restart
```

Separately, and only after the above is verified: fix the enabled/available split so future edits
take effect. `deploy/prod/setup-nginx.sh` in this PR now refuses rather than silently failing when a
regular file occupies the symlink's place, but reconciling the two copies is still a manual decision.
