"use server";

import { getSessionToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { redirect } from "next/navigation";

export async function startProSubscriptionPayment(formData: FormData): Promise<never> {
  const token = await getSessionToken();
  if (!token) redirect("/connexion");

  const method = formData.get("method");
  if (method !== "wave" && method !== "orange_money") {
    redirect("/espace/abonnement?erreur=paiement");
  }

  const rawPlan = formData.get("plan");
  const plan = rawPlan === "pro_plus" ? "pro_plus" : "pro";

  let payment: Awaited<ReturnType<typeof api.createSubscriptionPayment>>;
  try {
    payment = await api.createSubscriptionPayment(token, method, plan);
  } catch {
    redirect("/espace/abonnement?erreur=paiement");
  }

  redirect(payment.paymentUrl);
}

export async function readProSubscriptionPayment(id: string) {
  const token = await getSessionToken();
  if (!token || !id || id.length > 40) return null;

  try {
    return await api.getSubscriptionPayment(token, id);
  } catch {
    return null;
  }
}
