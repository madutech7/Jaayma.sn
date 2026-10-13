"use server";

import { getCurrentSellerId } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";

export async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
  const sellerId = await getCurrentSellerId();
  if (!sellerId) return { error: "Non autorisé." };

  try {
    await api.updateOrderStatus(orderId, nextStatus.toUpperCase());
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
  const sellerId = await getCurrentSellerId();
  if (!sellerId) return { error: "Non autorisé." };

  try {
    await api.updateOrderStatus(orderId, undefined, paymentStatus);
    revalidateTag("orders");
    revalidatePath("/espace/commandes");
    revalidatePath("/espace");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Une erreur est survenue.";
    return { error: msg };
  }
}
