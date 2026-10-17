"use server";

import { getCurrentSellerId, getSessionToken } from "@/lib/auth";
import { api } from "@/lib/api";

async function getAuthenticatedSellerToken() {
  const [sellerId, token] = await Promise.all([getCurrentSellerId(), getSessionToken()]);
  return sellerId && token ? token : null;
}

function toPushErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (/internal server error|^API error:\s*5\d\d/i.test(message)) {
    console.error("[push-notifications] Backend request failed:", error);
    return "Le service des alertes rencontre un problème temporaire. Réessayez dans quelques instants.";
  }
  return message || fallback;
}

export async function getPushVapidPublicKey() {
  try {
    return await api.getVapidPublicKey();
  } catch {
    return { publicKey: null };
  }
}

export async function savePushSubscription(subscription: Record<string, unknown>) {
  const token = await getAuthenticatedSellerToken();
  if (!token) return { error: "Votre session a expiré. Reconnectez-vous pour activer les notifications." };

  try {
    await api.savePushSubscription(token, subscription);
    return { success: true as const };
  } catch (error) {
    return { error: toPushErrorMessage(error, "Impossible d’activer les notifications.") };
  }
}

export async function removePushSubscription(endpoint: string) {
  const token = await getAuthenticatedSellerToken();
  if (!token) return { error: "Votre session a expiré. Reconnectez-vous pour modifier les notifications." };

  try {
    await api.removePushSubscription(token, endpoint);
    return { success: true as const };
  } catch (error) {
    return { error: toPushErrorMessage(error, "Impossible de désactiver les notifications.") };
  }
}

export async function sendTestPushNotification(endpoint: string) {
  const token = await getAuthenticatedSellerToken();
  if (!token) return { error: "Votre session a expiré. Reconnectez-vous pour envoyer un test." };

  try {
    await api.sendTestNotification(token, endpoint);
    return { success: true as const };
  } catch (error) {
    return { error: toPushErrorMessage(error, "Impossible d’envoyer la notification test.") };
  }
}
