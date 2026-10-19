"use server";

import { getCurrentSellerId, getSessionToken } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";

export async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
  const [sellerId, token] = await Promise.all([getCurrentSellerId(), getSessionToken()]);
  if (!sellerId || !token) return { error: "Non autorisé." };

  try {
    await api.updateOrderStatus(orderId, token, nextStatus.toUpperCase());
    revalidateTag("orders");
    revalidatePath("/espace/commandes");
    revalidatePath("/espace");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Une erreur est survenue.";
    return { error: msg };
  }
}

export async function updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  const [sellerId, token] = await Promise.all([getCurrentSellerId(), getSessionToken()]);
  if (!sellerId || !token) return { error: "Non autorisé." };

  try {
    await api.updateOrderStatus(orderId, token, undefined, paymentStatus);
    revalidateTag("orders");
    revalidatePath("/espace/commandes");
    revalidatePath("/espace");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Une erreur est survenue.";
    return { error: msg };
  }
}
