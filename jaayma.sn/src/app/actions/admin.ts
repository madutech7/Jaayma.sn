"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";

export async function checkIsAdmin(): Promise<{
  isAdmin: boolean;
  phone?: string;
  error?: string;
  denialReason?: "login" | "session" | "not-admin" | "verification-error";
}> {
  const token = await getSessionToken();
  if (!token) {
    return {
      isAdmin: false,
      denialReason: "login",
      error: "Connectez-vous pour accéder à l’administration.",
    };
  }

  try {
    const access = await api.getAdminAccess(token);
    return { isAdmin: true, phone: access.phone };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Accès non autorisé.";
    const isSessionError = /session|token|reconnectez|401/i.test(message);
    const isAccessDenied = /403|accès réservé|forbidden/i.test(message);
    return {
      isAdmin: false,
      denialReason: isSessionError
        ? "session"
        : isAccessDenied
          ? "not-admin"
          : "verification-error",
      error: isSessionError
        ? "Votre ancienne session n’est plus valide pour l’administration. Reconnectez-vous."
        : isAccessDenied
          ? "Ce compte n’est pas autorisé à accéder au panneau d’administration."
          : "Impossible de vérifier l’accès à l’administration. Réessayez dans un instant.",
    };
  }
}

export async function setShopPlan(
  shopId: string,
  plan: "free" | "pro",
  durationDays: number = 30
) {
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
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
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
    await api.adminUpdateShopStatus(token, shopId, isSuspended ? "SUSPENDED" : "ACTIVE");

    revalidatePath("/admin");
    revalidatePath("/explorer");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la suspension.";
    return { error: msg };
  }
}

export async function setExplorerEnabled(enabled: boolean) {
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
    await api.adminSetExplorerEnabled(token, enabled);
    revalidatePath("/admin/reglages");
    revalidatePath("/");
    revalidatePath("/explorer");
    revalidatePath("/sitemap.xml");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible de modifier la visibilité d’Explorer." };
  }
}

export async function setMaintenanceEnabled(enabled: boolean) {
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
    await api.adminSetMaintenanceEnabled(token, enabled);
    revalidatePath("/admin/reglages");
    revalidatePath("/");
    revalidatePath("/maintenance");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible de modifier le mode maintenance." };
  }
}

export async function setProSubscriptionPrice(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000) {
    return { error: "Le prix doit être un montant entier compris entre 1 et 100 000 000 F." };
  }
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
    const result = await api.adminSetProSubscriptionPrice(token, amount);
    revalidatePath("/admin/reglages");
    revalidatePath("/espace/abonnement");
    return { success: true as const, amount: result.proPriceXof };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible de modifier le prix Pro." };
  }
}

export async function setProPlusSubscriptionPrice(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000) {
    return { error: "Le prix doit être un montant entier compris entre 1 et 100 000 000 F." };
  }
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
    const result = await api.adminSetProPlusSubscriptionPrice(token, amount);
    revalidatePath("/admin/reglages");
    revalidatePath("/espace/abonnement");
    return { success: true as const, amount: result.proPlusPriceXof };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible de modifier le prix Pro+." };
  }
}

export async function sendAdminAnnouncement(_prevState: unknown, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const url = String(formData.get("url") || "/espace/commandes").trim();
  if (title.length < 3 || title.length > 60) return { error: "Le titre doit contenir entre 3 et 60 caractères." };
  if (body.length < 3 || body.length > 180) return { error: "Le message doit contenir entre 3 et 180 caractères." };
  if (!url.startsWith("/") || url.startsWith("//") || /\s/.test(url)) return { error: "Choisissez un lien interne valide." };
  const token = await getSessionToken();
  if (!token) return { error: "Session expirée. Reconnectez-vous." };

  try {
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
