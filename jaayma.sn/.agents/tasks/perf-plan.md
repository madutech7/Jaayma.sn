# Implementation Plan — Performance Fixes jaayma.sn

> Ordered by dependency and impact. Each item leaves the codebase in a buildable state.
> Build command: `npm run build`
> Tests: `npm run test` (vitest, covers lib utilities — no integration tests for pages)
> Type-check: `npx tsc --noEmit`

---

## Fix 1 — N+1 queries on `/espace/commandes`

**What:** Replace the `Promise.all` N+1 loop with a single `inArray` query, then group items in memory.

**Current code** (`src/app/espace/commandes/page.tsx` lines 39–47):
```ts
const ordersWithItems = await Promise.all(
  allOrders.map(async (order) => {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .all();
    return { ...order, items };
  })
);
```

**What to change:**
1. Add `inArray` to the import from `"drizzle-orm"` (line 1 currently imports `eq, desc`).
2. After the `allOrders` query, add a guard: if `allOrders.length === 0` skip the items fetch and set `ordersWithItems = []`.
3. Replace the `Promise.all` block with:
   ```ts
   const allItems = await db
     .select()
     .from(orderItems)
     .where(inArray(orderItems.orderId, allOrders.map((o) => o.id)))
     .all();
   const itemsByOrder = new Map<string, typeof allItems>();
   for (const item of allItems) {
     if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
     itemsByOrder.get(item.orderId)!.push(item);
   }
   const ordersWithItems = allOrders.map((order) => ({
     ...order,
     items: itemsByOrder.get(order.id) ?? [],
   }));
   ```

**Files:** `src/app/espace/commandes/page.tsx`

**Verify:** `npx tsc --noEmit` — no TypeScript errors. `npm run build` — build succeeds.

---

## Fix 2 — Sequential D1 queries on `/espace` dashboard

**What:** Parallelize the 3 sequential D1 queries with `Promise.all`, and push the status filter into SQL instead of filtering in JavaScript.

**Current code** (`src/app/espace/page.tsx` lines ~43–70):
```ts
// Three sequential awaits:
const todayRevenueResult = await db.select({ total: sum(...) }).from(orders).where(...).get();

const toPrepareOrders = await db
  .select().from(orders).where(and(eq(orders.shopId, shop.id)))
  .orderBy(desc(orders.createdAt)).all()
  .then((rows) => rows.filter((o) => o.status === "new" || o.status === "preparing"));
  // ↑ fetches ALL shop orders then filters in JS

const visitRows = await db.select().from(shopVisitsDaily).where(...).all();
```

**What to change:**
1. Add `or` to the import from `"drizzle-orm"` (currently `eq, sum, and, gte, desc`).
2. Rewrite the three sequential awaits as a single `Promise.all`:
   ```ts
   const [todayRevenueResult, toPrepareOrders, visitRows] = await Promise.all([
     db.select({ total: sum(orders.total) })
       .from(orders)
       .where(and(eq(orders.shopId, shop.id), eq(orders.paymentStatus, "paid"), gte(orders.createdAt, startOfTodayUnix)))
       .get(),

     db.select()
       .from(orders)
       .where(and(
         eq(orders.shopId, shop.id),
         or(eq(orders.status, "new"), eq(orders.status, "preparing"))
       ))
       .orderBy(desc(orders.createdAt))
       .all(),

     db.select()
       .from(shopVisitsDaily)
       .where(and(
         eq(shopVisitsDaily.shopId, shop.id),
         gte(shopVisitsDaily.day, sevenDaysAgo.toISOString().split("T")[0])
       ))
       .all(),
   ]);
   const todayRevenue = Number(todayRevenueResult?.total ?? 0);
   ```
3. Remove the `.then((rows) => rows.filter(...))` that was on the orders query — the SQL filter replaces it.
4. The `toPrepareOrders` variable is now already filtered, so remove any remaining in-memory filter if present.
5. Move the `sevenDaysAgo` / `sevenDaysAgoUnix` variable declarations above the `Promise.all` block (they're used inside it).

**Files:** `src/app/espace/page.tsx`

**Verify:** `npx tsc --noEmit` — no errors. `npm run build` — build succeeds.

---

## Fix 3 — Batch insert `orderItems` in checkout

**What:** Replace the sequential `for` loop inserting one orderItem per query with a single Drizzle batch insert.

**Current code** (`src/app/actions/checkout.ts` lines ~95–105):
```ts
// 7. Insert items
for (const item of verifiedItems) {
  await db.insert(orderItems).values({
    id: `oi_${ulid()}`,
    orderId,
    productId: item.productId,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    optionLabel: item.optionLabel || null,
  });
}
```

**What to change:**
Replace the entire `for` loop with a single insert call:
```ts
// 7. Insert items (batch — one D1 query instead of N)
await db.insert(orderItems).values(
  verifiedItems.map((item) => ({
    id: `oi_${ulid()}`,
    orderId,
    productId: item.productId,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    optionLabel: item.optionLabel || null,
  }))
);
```

No import changes needed — `ulid`, `orderItems`, `db` are all already imported.

**Files:** `src/app/actions/checkout.ts`

**Verify:** `npx tsc --noEmit` — no errors. `npm run test` — `src/lib/__tests__/orders.test.ts` still passes (the test covers `calculateOrderTotals` and `generateOrderNumber`, not the DB layer, but ensures no regressions in shared utilities). `npm run build` — build succeeds.

---

## Fix 4 — Double count+select on `/explorer`

**What:** Eliminate the separate `COUNT(*)` query. Fetch `ITEMS_PER_PAGE + 1` rows, use the extra row to determine whether a next page exists, and estimate the total for pagination from `offset + results.length` when results < page size.

**Current code** (`src/app/explorer/page.tsx` lines ~55–68):
```ts
const countRes = await db.select({ count: count() }).from(shops).where(whereClause).get();
totalCount = countRes?.count || 0;

publishedShops = await db.select().from(shops).where(whereClause)
  .orderBy(...).limit(ITEMS_PER_PAGE).offset(offset).all();
```

**What to change:**
1. Remove the `count` import from `"drizzle-orm"` (line 1: `import { eq, and, like, or, count, sql }`→ remove `count`).
2. Change the fetch to request `ITEMS_PER_PAGE + 1` rows:
   ```ts
   const rows = await db
     .select()
     .from(shops)
     .where(whereClause)
     .orderBy(sql`CASE WHEN ${shops.plan} = 'pro' THEN 0 ELSE 1 END`, shops.createdAt)
     .limit(ITEMS_PER_PAGE + 1)
     .offset(offset)
     .all();

   const hasNextPage = rows.length > ITEMS_PER_PAGE;
   publishedShops = hasNextPage ? rows.slice(0, ITEMS_PER_PAGE) : rows;
   // Estimate total: if last page, exact; otherwise lower-bound
   totalCount = hasNextPage ? offset + ITEMS_PER_PAGE + 1 : offset + rows.length;
   ```
3. The `totalPages` calculation remains `Math.ceil(totalCount / ITEMS_PER_PAGE)` — it still works correctly:
   - On a partial last page: `offset + rows.length` gives the exact total.
   - On a full page with more: `offset + ITEMS_PER_PAGE + 1` gives at least one more page.
4. Keep `const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)` and the existing pagination UI unchanged.

**Files:** `src/app/explorer/page.tsx`

**Verify:** `npx tsc --noEmit` — no errors. `npm run build` — build succeeds.

---

## Fix 5 — Images: direct R2 URL instead of Worker proxy

**What:** Update `getImageUrl` to return a direct R2 public URL in production (via `NEXT_PUBLIC_R2_PUBLIC_URL`), falling back to the existing API route in dev. Add the env var to `.env.example`.

**Current code** (`src/lib/images.ts`):
```ts
export function getImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/images/${key}`;
}
```

**What to change in `src/lib/images.ts`:**
```ts
/**
 * Returns the URL to serve an image stored in R2.
 * In production, images are served directly from R2 public URL (no Worker roundtrip).
 * In dev (NEXT_PUBLIC_R2_PUBLIC_URL not set), falls back to the /api/images/ proxy route.
 */
export function getImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (base) {
    // Remove trailing slash from base, leading slash from key
    return `${base.replace(/\/$/, "")}/${key}`;
  }
  return `/api/images/${key}`;
}
```

**What to change in `.env.example`:**
Add after the existing entries:
```
# URL publique du bucket R2 pour servir les images produits directement (sans passer par le Worker)
# Ex: https://images.jaayma.sn  ou  https://pub-<hash>.r2.dev
# Laisser vide en dev local (utilise la route /api/images/ comme fallback)
NEXT_PUBLIC_R2_PUBLIC_URL=
```

**Note for implementer:** `NEXT_PUBLIC_R2_PUBLIC_URL` must also be set in the Cloudflare Workers environment (via `wrangler.toml` `[vars]` or the Cloudflare dashboard) before deploying. The API route `/api/images/[...key]/route.ts` is left unchanged — it remains the dev fallback.

**Files:** `src/lib/images.ts`, `.env.example`

**Verify:** `npx tsc --noEmit` — no errors. `npm run build` — build succeeds. Manual check: in dev (no env var set), `getImageUrl("test.jpg")` returns `"/api/images/test.jpg"`. With `NEXT_PUBLIC_R2_PUBLIC_URL=https://images.jaayma.sn`, returns `"https://images.jaayma.sn/test.jpg"`.

---

## Fix 6 — Delete unused Geist font files

**What:** Delete the two woff files that are unused relics of the Next.js scaffold. Confirmed: `layout.tsx` loads only `Bricolage_Grotesque` and `Instrument_Sans` from `next/font/google`; no file in the project references `GeistVF` or `GeistMonoVF` (grep across all source files returns zero matches).

**Files to delete:**
- `src/app/fonts/GeistVF.woff` (66 KB)
- `src/app/fonts/GeistMonoVF.woff` (68 KB)

**Verify:** `npm run build` — build succeeds and build output is ~134 KB smaller in static assets. `npx tsc --noEmit` — no errors.

---

## Fix 7 — Extract nav from `espace/layout.tsx` into a client component

**What:** The layout is `"use client"` solely for `usePathname()`. Extract the navigation (sidebar + bottom nav) into a new `EspaceNav` client component that receives `pathname` as a prop (populated inside it via `usePathname`). The layout itself becomes a Server Component — no `"use client"` directive.

**Current structure** (`src/app/espace/layout.tsx`):
- `"use client"` at top
- Uses `usePathname()` to set active nav state
- Contains full sidebar + mobile topbar + bottom nav markup
- `logoutSeller` Server Action used in a `<form>`

**What to create — `src/app/espace/EspaceNav.tsx`:**
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutSeller } from "../actions/auth";

// NAV array and all nav/sidebar/bottom-nav JSX extracted from layout.tsx
// The component renders the sidebar (desktop), topbar (mobile), and bottom nav (mobile)
// It calls usePathname() internally — no prop needed
export default function EspaceNav() {
  const pathname = usePathname();
  // ... (all existing nav JSX moved here, pathname usage unchanged)
}
```

**What to change in `src/app/espace/layout.tsx`:**
1. Remove `"use client"` directive.
2. Remove `usePathname` import and the `logoutSeller` import (both move to `EspaceNav`).
3. Remove all nav/sidebar/topbar/bottom-nav JSX from the layout.
4. Import `EspaceNav` and place it where the nav was:
   ```tsx
   import { ReactNode } from "react";
   import EspaceNav from "./EspaceNav";

   export default function EspaceLayout({ children }: { children: ReactNode }) {
     return (
       <div className="min-h-screen bg-ink">
         <EspaceNav />
         <main className="lg:pl-64 min-h-screen pb-24 lg:pb-8">
           {children}
         </main>
       </div>
     );
   }
   ```

**Rationale:** Next.js 15 supports Server Component layouts that render Client Component children — only `EspaceNav` is hydrated, not the entire espace subtree. This reduces the client JS bundle for all espace pages.

**Files:** `src/app/espace/layout.tsx` (modify), `src/app/espace/EspaceNav.tsx` (create)

**Verify:** `npx tsc --noEmit` — no errors. `npm run build` — build succeeds. Visual check: sidebar active state still highlights the current route; logout button still works.

---

## Fix 8 — Verify N+1 in `espace/commandes/[orderId]`

**What:** Inspect the order detail page and confirm there is no N+1 issue; if found, fix it.

**Findings from reading the file:**
The page at `src/app/espace/commandes/[orderId]/page.tsx` fetches:
1. `shop` — one query (by `sellerId`)
2. `order` — one query (by `orderId`)
3. `items` — one query (by `orderId`)

This is **3 flat queries**, not N+1. The `items` query (`db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).all()`) fetches all items for the single order in one round-trip. No loop over items that triggers further queries.

**Optimization opportunity (minor):** Queries 2 and 3 are sequential but could be parallelized once the `orderId` is known. However, query 3 depends on `order.shopId !== shop.id` check completing first (authorization guard). Since `order` must be verified before fetching items would be redundant/unsafe to parallelize, the sequential fetch is architecturally correct.

**No code change required.** This item is a verification/audit step only.

**Files:** `src/app/espace/commandes/[orderId]/page.tsx` — no changes

**Verify:** `npx tsc --noEmit` — no errors (baseline, confirms nothing is broken). `npm run test` — all tests pass.

---

## Execution order summary

| # | Fix | Impact | Effort | Depends on |
|---|-----|--------|--------|------------|
| 1 | N+1 on commandes | 🔴 Critical | Low | — |
| 2 | Sequential queries dashboard | 🟠 High | Low | — |
| 3 | Batch insert checkout | 🟡 Medium | Trivial | — |
| 4 | Double count+select explorer | 🟢 Low | Low | — |
| 5 | Images direct R2 URL | 🔴 Critical | Low | — |
| 6 | Delete Geist fonts | 🟡 Medium | Trivial | — |
| 7 | Extract nav from espace/layout | 🟡 Medium | Low | — |
| 8 | Audit [orderId] N+1 | Audit only | None | — |

Fixes 1–7 are all independent of each other and can be implemented in any order within a single pass. Fix 8 requires no code changes.

After all fixes: run `npm run build` and `npm run test` to confirm the full build is green.
