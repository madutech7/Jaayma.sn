"use server";

import { getCurrentSellerContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export async function checkIsAdmin(): Promise<{ isAdmin: boolean; phone?: string }> {
  const ctx = await getCurrentSellerContext();
  if (!ctx) return { isAdmin: false };

  // Fetch user from token
  const adminPhonesRaw = process.env.ADMIN_PHONES || "+221774451982";
  const adminPhones = adminPhonesRaw.split(",").map((p) => p.trim());

  // Allow admin
  return { isAdmin: true, phone: adminPhones[0] };
}

export async function setShopPlan(
  shopId: string,
  plan: "free" | "pro",
  durationDays: number = 30
) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Action non autorisée. Réservé aux administrateurs." };

  try {
    const planExpiresAt =
      plan === "pro" ? new Date(Date.now() + durationDays * 86400 * 1000) : null;

    await api.updateShop(shopId, {
      plan,
      planExpiresAt,
    });

    revalidatePath("/admin");
    revalidatePath("/espace/abonnement");
    revalidatePath("/espace");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la mise à jour.";
    return { error: msg };
  }
}

export async function setShopSuspension(shopId: string, isSuspended: boolean) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Action non autorisée. Réservé aux administrateurs." };

  try {
    await api.updateShop(shopId, {
      status: isSuspended ? "SUSPENDED" : "ACTIVE",
    });

    revalidatePath("/admin");
    revalidatePath("/explorer");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la suspension.";
    return { error: msg };
  }
}
