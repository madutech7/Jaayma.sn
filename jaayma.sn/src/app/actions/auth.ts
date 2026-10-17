"use server";

import { normalizePhone } from "@/lib/phone";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { api } from "@/lib/api";
import { redirect } from "next/navigation";

export type AuthResult = {
  error?: string;
  success?: boolean;
};

export async function registerSeller(
  _prevState: unknown,
  formData: FormData
): Promise<AuthResult> {
  const rawPhone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string) || "Vendeur";

  if (!rawPhone || !password) {
    return { error: "Tous les champs sont obligatoires." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { error: "Le numéro de téléphone n'est pas valide." };
  }

  try {
    const res = await api.register({ phone, password, name });
    if (res?.token) {
      await setSessionCookie(res.token);
      return { success: true };
    }
    return { error: "Erreur lors de l'inscription." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de l'inscription.";
    return { error: msg };
  }
}

export async function loginSeller(
  _prevState: unknown,
  formData: FormData
): Promise<AuthResult> {
  const rawPhone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!rawPhone || !password) {
    return { error: "Tous les champs sont obligatoires." };
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { error: "Le numéro de téléphone n'est pas valide." };
  }

  try {
    const res = await api.login({ phone, password });
    if (res?.token) {
      await setSessionCookie(res.token);
      return { success: true };
    }
    return { error: "Identifiants incorrects." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la connexion.";
    return { error: msg };
  }
}

export async function logoutSeller(): Promise<void> {
  await clearSessionCookie();
}

export async function logoutAndRedirectToLogin(): Promise<never> {
  await clearSessionCookie();
  redirect("/connexion");
}
