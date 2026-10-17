# Plan: short-lived photo upload pages for MCP product listing

Status: proposed · 2026-10-17 · base `origin/main` @ `0f1357e`

## Problem

Product creation over MCP works end to end (`create_product`, `upload_media`,
`add_product_images`, `get_product_listing_workflow`). The gap is photos that
live only in a chat: a photo dropped into claude.ai or Claude Desktop is visible
to the model but its bytes can't be forwarded to `upload_media`. Today the SOP
falls back to "send a public link or upload at /sysuser/media", which needs
an admin login and then a second round of matching photos to products by hand.

## Goal

When the assistant creates one or more products from chat, it can hand the user
**one short-lived link**. The page shows **one drop zone per product**, plus one
per **variant**. The user can **add a variant** right there (e.g. "Blue / Large")
and drop photos onto it. Photos land in the media library and are attached to the
right product/variant immediately; the assistant reads the result back over MCP
and continues the listing.

### Non-goals (v1)

- Creating *new products* from the page. Slots are products the assistant
  already created (as drafts). An "unnamed slot → assistant creates the product
  after seeing the photos" mode is a possible v2.
- Editing names, descriptions, prices of the product itself on the page.
- Stock entry. A variant added on the page starts at stock 0; stock goes
  through the ledger (`list_stock` / admin) as today.
- Deleting anything. Removing a wrongly dropped photo uses
  `remove_product_image` (MCP) or the admin UI, same as today.

## What already exists (reuse, don't rebuild)

| Need | Existing piece |
|---|---|
| Browser → S3 direct upload | `signMediaUpload` / `confirmMediaUpload` in `lib/cms/media.ts` (presign PUT, then HEAD-verify before writing the `Media` row). Bytes never pass nginx, so `client_max_body_size` is irrelevant. |
| Type/size limits | `lib/cms/media-guards.ts` |
| Attach to product / variant | `lib/cms/media-attach.ts` (used by `add_product_images`), accepts `variationSku` |
| Per-variant photos | `ProductImage.variationId` (nullable = product gallery) |
| Variants | `ProductVariation` (`sku`, `price` required; `label`, `color`, `size`, `mrp`, `active` optional) |
| Token hygiene pattern | `McpToken` (sha256 hash stored, `expiresAt`, `revokedAt`) |
| Short-lived session pattern | `TelegramSession` (`expiresAt`, JSON state) |
| Rate limiting | `lib/oauth/rate-limit.ts` (in-memory, single container) |
| Audit | `logAction` + `bumpTags` as in `lib/mcp/tools/media.ts` |

## User flow

1. User in chat: "list these 4 bracelets" + pasted photos.
2. Assistant follows the SOP: identifies products from the pasted photos (it
   *can* see them), writes descriptions, gets approval, runs `create_product`
   ×4 as **drafts**, optionally with variants already defined.
3. No link and no file bytes, so the assistant calls
   `create_upload_session { productIds: [...4], expiresInHours?: 24 }` and
   gets back `{ id, url, expiresAt }`. It sends the URL.
4. User opens the link (phone or desktop). They see 4 cards, each with the
   product name, thumbnail if any, a **"Product photos"** drop zone, and one
   drop zone per existing variant. Each card has **"+ Add variant"**.
5. User drops/selects photos (multi-select; camera roll on mobile). Each file
   uploads to S3, is confirmed, and is attached immediately, with a per-file
   progress bar and a ✓.
6. "+ Add variant" opens an inline form: label (required, e.g. "Blue / Large"),
   color, size, price (defaults to the product price), SKU (auto-suggested
   `<product-slug>-<label-slug>`, editable). Saving creates the variation
   server-side; a new drop zone appears for it.
7. User taps **"Done"**. The session is marked `submitted` (still uploadable
   until expiry, in case they forgot one).
8. Back in chat: "done". The assistant calls `get_upload_session { id }`, sees per
   product / per variant the attached image URLs and the variants added, fixes
   order if needed (`reorder_product_images`), and asks whether to publish.

## Data model (one migration)

```prisma
model UploadSession {
  id           String    @id @default(cuid())
  tokenHash    String    @unique // sha256(url token), hex; raw token only in the URL
  productIds   String[]  // ordered slots
  status       String    @default("open") // open | submitted | cancelled
  createdBy    String    // actor name (the MCP token's name)
  mcpTokenId   String?   // revoking the MCP token kills its sessions
  mcpToken     McpToken? @relation(fields: [mcpTokenId], references: [id], onDelete: SetNull)
  note         String?   // optional message shown at the top of the page
  expiresAt    DateTime
  submittedAt  DateTime?
  revokedAt    DateTime?
  uploadCount  Int       @default(0) // cap enforcement
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([expiresAt])
}
```

No per-file table: attached photos are real `ProductImage` rows. To report
"what came in through this session", record `uploadSessionId` in the
`AdminLog` summary/metadata for each attach, and have `get_upload_session`
read the products' current images and variations directly (that is the truth
the assistant needs anyway). If per-session attribution is needed in v2, add
a nullable `uploadSessionId` to `Media`.

Deploy note: new table + `McpToken` back-relation means an additive migration,
additive only, so it is safe whichever way the deploy applies migrations (confirm
the current mechanism in `docker/` before merging).
Verify `pnpm build` with no env vars (see the root-layout env rule).

## MCP tools (`lib/mcp/tools/upload-sessions.ts`, new)

| Tool | Role | Behaviour |
|---|---|---|
| `create_upload_session` | editor | `{ productIds: string[1..20], expiresInHours?: 1..72 = 24, note? }`. Validates every id exists (rejects with `availableOptions` like other tools). Generates 32 random bytes → base64url token; stores sha256. Returns `{ id, url: <SITE_URL>/upload/<token>, expiresAt, slots: [{productId, name, variations:[{sku,label}]}] }`. The raw token is returned **once**. |
| `get_upload_session` | viewer | `{ id }` → status, expiresAt, and per product: images (`url`, `alt`, `variationSku`, `position`), variations (flag those created via this session from the audit log), counts. |
| `cancel_upload_session` | editor | `{ id }` → sets `revokedAt`, status `cancelled`. Not a delete; consistent with the "no delete tools" rule. |

Also update:
- `lib/mcp/server.ts` instructions, the "Media:" paragraph: one line on upload
  sessions for photos that exist only in the chat.
- `lib/mcp/prompts/product-listing.ts` Step 4: new branch *"photos only in this
  chat (no link, no bytes) → create drafts, then `create_upload_session` with
  all product ids → send the link → when the user says done,
  `get_upload_session` → verify/reorder → ask to publish"*. Keep Step 3's
  "Do NOT set images yet". Note the order change: in this path products are
  created **as drafts** before photos are attached, and published after review.
- Register in `lib/mcp/server.ts`.

## HTTP routes (token-authed, outside `/sysuser`)

All under `app/api/upload/[token]/`. Each handler:
`resolveUploadSession(token)` → sha256 lookup → reject if missing / expired /
revoked / `mcpToken.revokedAt` set → 404 (never reveal which). Rate-limited by
token + IP via `rateLimit()`.

| Route | Does |
|---|---|
| `GET /api/upload/[token]` | Session view model: slots with product name, thumbnail, variations (`sku`, `label`, `price`), current image count per slot, `expiresAt`, `note`. **Must not** expose admin-only fields (`costPrice`, `wholesalePrice`, `legacyImsCode`, …). Write an explicit DTO, don't spread the Prisma row. |
| `POST /api/upload/[token]/sign` | `{ productId, filename, contentType, bytes }` → checks `productId ∈ session.productIds`, mime/size via media-guards, `uploadCount < cap` (e.g. 200) → `signMediaUpload` → `{ uploadUrl, publicUrl, key }`. |
| `POST /api/upload/[token]/confirm` | `{ productId, variationSku?, key, publicUrl, alt? }` → re-checks slot membership and that `variationSku` belongs to that product → `confirmMediaUpload` → attach via `media-attach` (append; set thumbnail if the product has none) → `uploadCount++`, `logAction(actor = "upload:" + createdBy)`, `bumpTags`. |
| `POST /api/upload/[token]/variants` | `{ productId, label, color?, size?, price?, sku? }` → creates **one** variation through the new `addVariation` helper (below), stock 0. Returns `{ sku, label }`. Rejects duplicate SKU with a clear message. |
| `POST /api/upload/[token]/submit` | Sets `status=submitted`, `submittedAt`. Idempotent. |

`proxy.ts`: add an explicit branch **before** the generic `/api/` passthrough:
`/api/upload/` → `checkSameOrigin(req)` (the page is same-origin; this blocks
cross-site POSTs riding a leaked link). The `/upload/*` page itself is not
localized; skip `withLocale` and send `X-Robots-Tag: noindex` +
`Referrer-Policy: no-referrer` so the token doesn't leak via Referer.

S3 CORS already allows PUT from the site origin (the admin media page uses
the same presign), so there's no infra change.

### Required refactor: `addVariation`

`updateProduct` (`lib/cms/products.ts`) is **full-replace**: a payload without
the existing variations retires/deletes them, and it `deleteMany`s images.
It must **not** be used to add one variant. Extract the existing
create branch (`productVariation.create` + `newVariationData` +
`initializeOnlineStock`) into

```ts
export async function addVariation(tx, productId, input): Promise<ProductVariation>
```

and call it from both `updateProduct` and the new `/variants` route, so the
ledger invariant (stock materialized by `recordStockMovement`, opening balance
via `initializeOnlineStock`) stays in one place.

## Page (`app/upload/[token]/page.tsx` + client component)

- Server component resolves the session; expired/invalid → a plain "This link
  has expired, ask for a new one" page (HTTP 404/410).
- Client component: card per product in slot order; inside, a "Product photos"
  zone + one zone per active variation + "+ Add variant".
- Uploads: `<input type="file" multiple accept="image/*,video/*" capture>`
  plus drag-and-drop; 3 concurrent uploads; per-file progress; retry on
  failure; client-side size/type pre-check using the same limits as
  media-guards (export them from a shared module).
- Shows the attached thumbnails per zone after confirm (read back from
  `GET`), so a refresh shows the true state.
- Sticky footer: "N photos uploaded · Done". Countdown to expiry.
- Stone Temple Trinity storefront tokens; mobile-first (most uploads will come
  from a phone camera roll). No storefront header/footer chrome.
- No `env.*` at module scope (build-without-env rule).
- i18n: admin-like surface, so English-only is fine for v1 (matches /sysuser).

## Security summary

- Capability URL: 256-bit random token, only the hash stored, default 24h,
  max 72h, revocable via `cancel_upload_session` or by revoking the creating
  MCP token.
- Scope: can only attach media to the listed products and add variants to
  them. It cannot edit product fields, publish, delete, or touch other products.
- Abuse limits: per-session upload cap, per-token+IP rate limit, mime/size
  guards, HEAD-verify before any DB write.
- Every write audit-logged with actor `upload:<mcp token name>`.
- No admin-only fields in the page DTO.

## Tests

- `test/lib/upload-session.test.ts`: token hash lookup; expired / revoked /
  MCP-token-revoked sessions are rejected; productId outside the session
  rejected; `variationSku` from another product rejected; upload cap.
- `addVariation`: stock opening balance goes through the ledger; existing
  variations and images untouched (regression guard against the full-replace path).
- Route-guard lint: extend `test/lib/route-guards.test.ts` (or a sibling) to
  assert every file under `app/api/upload/**` calls `resolveUploadSession`
  before doing anything else.
- MCP tool tests alongside `test/lib/mcp-media-upload.test.ts`.
- DTO test: GET response contains no `costPrice` / `wholesalePrice` /
  `legacyImsCode` keys.
- `pnpm verify` green; `pnpm build` with no env vars.

## Build order (one PR, or two if review prefers)

1. Migration + `UploadSession` model + `resolveUploadSession` + `addVariation` refactor (with tests).
2. API routes + proxy branch + guard test.
3. MCP tools + server instructions + SOP Step 4 update.
4. Page + client uploader.
5. Manual QA on phone: 3 products, add a variant, upload ~10 photos, `get_upload_session` from claude.ai, publish.

Post-merge: no nginx change needed (direct-to-S3). Confirm the claude.ai
connector picks up the new tools (reconnect if the tool list is cached).

## Open questions for Roshan

1. Default expiry 24h, max 72h. OK, or shorter (e.g. 2h)?
2. Should the page allow setting a variant's **price**, or always copy the
   product price and leave pricing to chat/admin?
3. Should the Telegram listing bot also send this link (same tool), or keep
   its direct-file path only?
4. v2: "unnamed slots", meaning user uploads first and the assistant creates products from
   the photos afterwards. Worth it?

---

## DECISIONS (2026-10-17) — this section overrides anything above

Roshan's answers: **expiry 12h** (default 12, allowed 1–12); **variant price
always copies the product price** (no price field on the page); **Telegram hands
out the link too**; **build the "unnamed slots" (draft) mode now**.

### Two session modes

- `mode: "products"` — slots are existing products (assistant created drafts).
  Photo confirm attaches immediately (`ProductImage`, optional `variationSku`).
  "+ Add variant" (label required, color?, size?) creates a real
  `ProductVariation` via the extracted `addVariation` helper: `price =
  product.price`, `stock 0`, SKU auto `<product.sku||product.slug>-<slug(label)>`
  with a `-2`, `-3` suffix if that SKU already exists on the product.
- `mode: "draft"` — slots are not products yet. The page shows N "Product 1…N"
  cards, each with an optional name field, and **"+ Add product"** (cap 30
  slots). "+ Add variant" on a draft slot only records a label
  (`UploadSlot.variantLabels`); photos dropped on it carry `variantLabel`.
  Confirm creates the `Media` row + an `UploadFile` row; nothing touches
  products. The assistant later views the photos via `get_upload_session`
  (image content blocks), writes descriptions, creates products, then calls
  `attach_upload_slot` to move each slot's photos (and variant labels → real
  variations at product price) onto the product.

### Schema (final)

```prisma
model UploadSession {
  id          String       @id @default(cuid())
  tokenHash   String       @unique
  mode        String       // products | draft
  status      String       @default("open") // open | submitted | cancelled
  source      String       @default("mcp")  // mcp | telegram
  createdBy   String       // MCP token name or staff name
  mcpTokenId  String?
  mcpToken    McpToken?    @relation(fields: [mcpTokenId], references: [id], onDelete: SetNull)
  note        String?
  uploadCount Int          @default(0)
  expiresAt   DateTime
  submittedAt DateTime?
  revokedAt   DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  slots       UploadSlot[]
  @@index([expiresAt])
}
model UploadSlot {
  id            String        @id @default(cuid())
  sessionId     String
  session       UploadSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  position      Int
  productId     String?       // set in products mode, and after attach_upload_slot in draft mode
  product       Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)
  hint          String?       // assistant's note, e.g. "the blue turtle bracelet"
  name          String?       // typed by the uploader (draft mode)
  variantLabels String[]      @default([])
  attachedAt    DateTime?
  files         UploadFile[]
  createdAt     DateTime      @default(now())
  @@index([sessionId])
}
model UploadFile {
  id           String     @id @default(cuid())
  slotId       String
  slot         UploadSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  mediaId      String
  media        Media      @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  url          String
  variantLabel String?    // draft mode
  variationSku String?    // products mode / after attach
  position     Int        @default(0)
  createdAt    DateTime   @default(now())
  @@index([slotId])
}
```
(+ back-relations on McpToken, Product, Media.) One additive migration.

### MCP tools (lib/mcp/tools/upload-sessions.ts)

- `create_upload_session` (editor): `{ productIds?: string[1..20] } XOR
  { newProducts?: { count: 1..30, hints?: string[] } }`, `expiresInHours?: 1..12
  = 12`, `note?`. Returns `{ id, url, expiresAt, mode, slots }`; URL =
  `getSiteUrl()` (lib/site-url.ts) + `/upload/<token>`. Raw token returned once.
- `get_upload_session` (viewer): `{ id, includeImages?: boolean = true }` →
  JSON (status, slots with name/hint/variantLabels/files/productId) **plus MCP
  `image` content blocks** (sharp → ≤768px JPEG, max 24 images, each preceded
  by a text block naming slot + variant) so the model can see draft photos.
  Widen `McpToolResult.content` typing to allow image blocks.
- `attach_upload_slot` (editor): `{ sessionId, slotId, productId }` → for each
  distinct `variantLabel` create a variation via `addVariation` (product price,
  stock 0) unless one with that label already exists; append files as
  ProductImages (with variationSku), set thumbnail if none; set
  `slot.productId`, `attachedAt`. Idempotent (re-run doesn't duplicate images).
- `cancel_upload_session` (editor): `{ id }` → revokedAt + status cancelled.
- Update `lib/mcp/server.ts` instructions (Media paragraph) and
  `lib/mcp/prompts/product-listing.ts`: two new branches — (A) photos pasted in
  chat: create drafts → `create_upload_session{productIds}`; (B) user wants to
  upload first / Telegram user has many photos: `create_upload_session
  {newProducts}` → send link → `get_upload_session` → Steps 1–2 from the
  returned images → `create_product` (draft) → `attach_upload_slot` per slot →
  ask to publish. Telegram (Hermes) agents send the link as plain text.

### Telegram (in-repo sales bot)

`/upload [n]` on the sales bot (registered staff only, n default 1, max 30) →
creates a `draft` session (`source: "telegram"`, `createdBy` = staff name,
no mcpTokenId) and replies with the link + expiry. Document in
docs/telegram-bots.md.

### HTTP routes (token-authed; app/api/upload/[token]/…)

`GET` (view model, explicit DTO, no admin-only fields), `POST sign`, `POST
confirm`, `POST variants`, `POST slots` (draft mode: add slot), `PATCH
slots/[slotId]` (draft mode: set name), `POST submit`. All go through
`resolveUploadSession(token)` → 404 for missing/expired/revoked/MCP-token-
revoked (indistinguishable). Rate limit by token+IP. Upload cap 200 files per
session. `proxy.ts`: `/api/upload/` branch with `checkSameOrigin` before the
generic `/api/` passthrough; `/upload/*` page not localized, `noindex`,
`Referrer-Policy: no-referrer`.
