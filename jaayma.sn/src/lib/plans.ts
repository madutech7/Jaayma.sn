/**
 * Plan limits and helpers for Jaay.
 * Free plan: 10 active products, 1 photo per product.
 * Pro plan: 200 active products, 4 photos per product.
 */

export type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    maxActiveProducts: 10,
    maxPhotosPerProduct: 1,
  },
  pro: {
    maxActiveProducts: 200,
    maxPhotosPerProduct: 4,
  },
} as const satisfies Record<Plan, { maxActiveProducts: number; maxPhotosPerProduct: number }>;

/** Returns the effective plan, considering expiry. */
export function getEffectivePlan(
  plan?: string | null,
  planExpiresAt?: number | string | Date | null
): Plan {
  if (plan === "pro") {
    const now = Math.floor(Date.now() / 1000);
    const expiresUnix =
      typeof planExpiresAt === "number"
        ? planExpiresAt
        : planExpiresAt
          ? Math.floor(new Date(planExpiresAt).getTime() / 1000)
          : null;
    if (expiresUnix && expiresUnix < now) {
      return "free"; // Pro expired
    }
    return "pro";
  }
  return "free";
}

/** Returns true if the shop can activate more products. */
export function canActivateProduct(
  effectivePlan: Plan,
  currentActiveCount: number
): boolean {
  return currentActiveCount < PLAN_LIMITS[effectivePlan].maxActiveProducts;
}

/** Returns true if the shop can add another photo to a product. */
export function canAddPhoto(
  effectivePlan: Plan,
  currentPhotoCount: number
): boolean {
  return currentPhotoCount < PLAN_LIMITS[effectivePlan].maxPhotosPerProduct;
}

/** Returns the product limit for a given plan. */
export function getProductLimit(effectivePlan: Plan): number {
  return PLAN_LIMITS[effectivePlan].maxActiveProducts;
}

/** Returns the photo limit for a given plan. */
export function getPhotoLimit(effectivePlan: Plan): number {
  return PLAN_LIMITS[effectivePlan].maxPhotosPerProduct;
}
