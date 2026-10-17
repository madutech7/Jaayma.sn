"use server";

import { getCurrentSellerContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";

export async function checkIsAdmin(): Promise<{ isAdmin: boolean; phone?: string; error?: string }> {
  const [ctx, token] = await Promise.all([getCurrentSellerContext(), getSessionToken()]);
  if (!ctx || !token) return { isAdmin: false, error: "Connectez-vous pour accéder à l’administration." };

  try {
    const access = await api.getAdminAccess(token);
    return { isAdmin: true, phone: access.phone };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Accès non autorisé.";
    const isSessionError = /session|token|reconnectez|401/i.test(message);
    return {
      isAdmin: false,
      phone: ctx.phone,
      error: isSessionError
        ? "Votre ancienne session n’est plus valide pour l’administration. Reconnectez-vous."
        : "Ce compte n’est pas autorisé à accéder au panneau d’administration.",
    };
  }
}

export async function setShopPlan(
  shopId: string,
  plan: "free" | "pro",
  durationDays: number = 30
) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Action non autorisée. Réservé aux administrateurs." };

  try {
    const token = await getSessionToken();
    if (!token) return { error: "Session expirée. Reconnectez-vous." };
    await api.adminUpdateShopPlan(token, shopId, plan, durationDays);

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
    const token = await getSessionToken();
    if (!token) return { error: "Session expirée. Reconnectez-vous." };
    await api.adminUpdateShopStatus(token, shopId, isSuspended ? "SUSPENDED" : "ACTIVE");

    revalidatePath("/admin");
    revalidatePath("/explorer");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la suspension.";
    return { error: msg };
  }
}

export async function sendAdminAnnouncement(_prevState: unknown, formData: FormData) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return { error: "Action non autorisée. Réservé aux administrateurs." };

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const url = String(formData.get("url") || "/espace/commandes").trim();
  if (title.length < 3 || title.length > 60) return { error: "Le titre doit contenir entre 3 et 60 caractères." };
  if (body.length < 3 || body.length > 180) return { error: "Le message doit contenir entre 3 et 180 caractères." };
  if (!url.startsWith("/") || url.startsWith("//") || /\s/.test(url)) return { error: "Choisissez un lien interne valide." };

  try {
    const token = await getSessionToken();
    if (!token) return { error: "Session expirée. Reconnectez-vous." };
    const result = await api.sendAdminNotification(token, { title, body, url });
    revalidatePath("/admin/notifications");
    return {
      success: true as const,
      deliveredCount: result.deliveredCount,
      targetCount: result.targetCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible d’envoyer la notification." };
  }
}
