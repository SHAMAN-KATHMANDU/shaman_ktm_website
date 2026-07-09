<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- distill:start -->
## Hard-won rules (distilled from real incidents, 2026-07-09)
1. Value off by clean ×10/×100 ⇒ diff docs/MCP descriptions vs code units; `git log -p` the doc line. Prices are whole NPR rupees.
2. Failure at a round time (30s/60s) behind nginx ⇒ grep proxy_read_timeout in deploy/prod/nginx.conf first.
3. Wrong response on a local port ⇒ `lsof -iTCP:3000 -sTCP:LISTEN`; this app silently falls back to :3001.
4. "Backend has it, users can't see it" ⇒ trace schema→DTO→API→component; the break is usually a UI condition.
5. Product field change ⇒ also en.json+ne.json, JSON-LD + feed, seed data, MCP tool descriptions; `pnpm verify` gates.
<!-- distill:end -->
