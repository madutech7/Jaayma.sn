# Performance fixes for jaayma.sn (N+1, parallel queries, batch insert, images, nav split)

Two commits (`ff998ac`, `2cc855b`) address eight performance issues: an N+1 on the orders list, sequential independent queries on the dashboard and explorer pages, a per-item insert loop at checkout, direct R2 Worker roundtrips for every image, and a layout forced into a client boundary. A follow-up commit addresses a `any` cast, a missing `relative` class, and a `NEXT_PUBLIC_APP_URL` → `APP_URL` rename.

**Watch for:** (confirmed) `todayCount` in `commandes/page.tsx` uses `new Date().toDateString()` which is UTC on Cloudflare Workers, diverging from the Dakar-timezone anchor used on the dashboard page — orders placed near midnight will be miscounted. (confirmed) The `activeShopIds IN (...)` clause in `explorer/page.tsx` is built by string-interpolating an unbounded array of IDs into a raw SQL template, which will hit D1's variable limit (~100) once the catalogue grows. (confirmed) `APP_URL` is a server-only env var but the `.env.example` still omits a `NEXT_PUBLIC_APP_URL` entry and any other pages that might need the public URL client-side would silently receive `undefined`.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The N+1 fix on `commandes/page.tsx` is structurally correct: one query for all orders, one `inArray` for all their items, grouped in memory with a `Map`. The empty-array guard prevents passing an empty list to `inArray`, which would generate an invalid SQL clause. Every order gets its items via the `??[]` fallback. The logic is sound for current load.

The `Promise.all` parallelisation on the dashboard (`espace/page.tsx`) correctly identifies three independent queries — today's revenue, pending orders, and visit rows — and fans them out. The dependency on `shop.id` is resolved before the parallel block, so there is no hidden sequencing issue here. The same pattern on `explorer/page.tsx` parallelises the `COUNT` and `SELECT` for the shops list, but these two queries themselves depend on `activeShopIds` from a prior sequential query. That first query is inherently sequential (it's the filter source), so the parallelisation boundary is drawn correctly.

The batch insert in `checkout.ts` maps `verifiedItems` to a single `db.insert(orderItems).values([...])` call. All non-nullable fields (`id`, `orderId`, `name`, `unitPrice`, `quantity`) are populated; nullable fields (`productId`, `optionLabel`) are explicitly set to `null` when absent. The schema confirms this is complete.

`getImageUrl` uses `NEXT_PUBLIC_R2_PUBLIC_URL`, which is correctly prefixed for both server and client components — `ImageUploader` is a client component that also calls it. The dev fallback to `/api/images/<key>` works when the variable is unset. The `.env` file is untouched.

The Server/Client split for `EspaceLayout` is correct: the layout is now a Server Component that imports the `"use client"` `EspaceNav`. `usePathname` lives exclusively in `EspaceNav`, which compiles as a client component. The layout itself no longer carries the `"use client"` boundary, so child pages can remain Server Components.

---

<details>
<summary>Issues (3)</summary>

1. **todayCount timezone mismatch** — `commandes/page.tsx` computes today's order count using `new Date().toDateString()`, which uses the Worker's UTC timezone, while the dashboard page anchors "today" to `Africa/Dakar`. Orders placed after 23:00 UTC (which is midnight Dakar time) will be counted on the wrong day. Apply the same Dakar anchor: `new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Dakar" }))`.

2. **Unbounded IN clause in explorer** — `activeShopIds` is materialized from every active product row in the database, then interpolated into a raw SQL `IN (${sql.join(...)})` template. D1's SQLite variable limit (~100 bindings per statement) means this query will fail silently or hard once there are more than ~100 shops with active products. Replace with a proper subquery join between `products` and `shops` in a single query, or use Drizzle's `inArray` with chunking.

3. **APP_URL visibility on server only** — The fix commit renamed `NEXT_PUBLIC_APP_URL` to `APP_URL` in `espace/page.tsx`. `APP_URL` is a server-only variable, which is fine for that page (Server Component). But the `.env.example` lists `APP_URL` as the canonical variable name, while no `NEXT_PUBLIC_APP_URL` entry exists. If any future client component needs the base URL (e.g. for copy-to-clipboard), it will silently get `undefined`. The existing `robots.ts` and `sitemap.ts` already use `APP_URL` server-side, so the rename is consistent — but the risk of a client-side caller getting an empty value should be documented in `.env.example` with a comment.

</details>

---

<details>
<summary>Details</summary>

### N+1 fix and inArray grouping (`commandes/page.tsx`)

The empty-array guard sits above the `inArray` call — Drizzle's `inArray` with an empty array emits `WHERE orderId IN ()`, invalid SQL in D1, so the guard is necessary and correct.

One scalability note (possible): a seller with more than ~100 orders will exceed D1's documented bound-parameter limit per statement. This is lower severity than the explorer's case because the commandes list is scoped to one shop, but the ceiling exists.

### Parallel queries on the dashboard (`espace/page.tsx`)

`shop` is resolved before the `Promise.all` block; the three parallel queries all reference `shop.id` which is in scope. There are no hidden dependencies between the three.

The `todayRevenue` computation uses `startOfTodayUnix` derived from `Africa/Dakar`-anchored `Date`. The `todayCount` in `commandes/page.tsx` does **not** do this — it uses `new Date().toDateString()` which is UTC on Cloudflare Workers. This is the timezone mismatch flagged above.

### Explorer two-query approach and unbounded IN (`explorer/page.tsx`)

The first query (`activeShopIdsQuery`) fetches all product rows where `isActive = true` and extracts `shopId`. The result is deduplicated with `new Set(...)`. The second block builds an `IN` clause using `sql.join(activeShopIds.map(id => sql\`${id}\`), sql\`, \`)`. Drizzle does parameterise each `sql\`${id}\`` binding, so this is not a SQL injection risk. The risk is the binding count: D1's limit is ~100 bound parameters per statement, and `activeShopIds` could exceed that as the platform grows. A JOIN-based approach (one query, no array materialisation) eliminates this ceiling.

The `Promise.all([countRes, publishedShopsResult])` for the count+page queries is correct because both operate on the same already-computed `whereClause` with no additional I/O dependency between them.

### `getImageUrl` and dev fallback risk (`src/lib/images.ts`)

`NEXT_PUBLIC_R2_PUBLIC_URL` is the correct prefix — it is inlined at build time for both server and client bundles, which matters because `ImageUploader` is a client component that also calls `getImageUrl`. The `.env` file was not touched in either commit.

The `APP_URL` rename introduced in the fix commit does create one gap: `APP_URL` is server-only, so any future client component that reads it will silently get `undefined`. The current callers (`robots.ts`, `sitemap.ts`, `espace/page.tsx`, `[shopSlug]/commande/...`) are all Server Components or static routes, so the rename is safe today. The risk is that `.env.example` no longer documents a `NEXT_PUBLIC_APP_URL` variant for client-side use if that need arises.

### Server Component / Client Component split (`espace/layout.tsx`, `EspaceNav.tsx`)

The old `layout.tsx` had `"use client"` at the top, which would silently suppress any `export const metadata` from child pages. The new layout is a Server Component; `EspaceNav` carries `"use client"` and owns `usePathname`. `logoutSeller` is called via `<form action={logoutSeller}>`, which works from a client component. The split is correct.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `src/app/actions/checkout.ts` | New file: order creation action with batch item insert (FIX 3) |
| `src/app/espace/_components/EspaceNav.tsx` | New file: client-component nav extracted from layout (FIX 7) |
| `src/app/espace/commandes/page.tsx` | N+1 → batch inArray fetch for order items (FIX 1); `any` cast removed; `relative` class added |
| `src/app/espace/layout.tsx` | Became pure Server Component after nav extraction (FIX 7) |
| `src/app/espace/page.tsx` | Sequential queries → `Promise.all` (FIX 2); `NEXT_PUBLIC_APP_URL` → `APP_URL` |
| `src/app/explorer/page.tsx` | Sequential count+fetch → `Promise.all`; `any[]` → `Shop[]` (FIX 4) |
| `src/lib/images.ts` | New utility: `getImageUrl` with R2 public URL + dev proxy fallback (FIX 5) |
| `.env.example` | Documents new env vars (`APP_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL`, etc.) |

Full diff: `git diff 687ba96 HEAD`

</details>
