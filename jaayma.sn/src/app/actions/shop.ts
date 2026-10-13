"use server";

import { getCurrentSellerContext, getCurrentSellerId } from "@/lib/auth";
import { isAvailableSlug, suggestSlug } from "@/lib/slug";
import { normalizePhone } from "@/lib/phone";
import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";

export async function upsertShop(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const sellerId = await getCurrentSellerId();
  if (!sellerId) {
    return { error: "Non autorisé. Veuillez vous connecter." };
  }

  const name = (formData.get("name") as string)?.trim();
  let slug = formData.get("slug") as string;
  const tagline = (formData.get("tagline") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const quartier = (formData.get("quartier") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const rawWhatsapp = formData.get("whatsapp") as string;
  const acceptsCash = formData.get("acceptsCash") === "on";
  const rawDeliveryFee = formData.get("deliveryFee") as string;
  const deliveryNote = (formData.get("deliveryNote") as string)?.trim();
  const isPublished = formData.get("isPublished") === "on";
  const logoKey = formData.has("logoKey")
    ? ((formData.get("logoKey") as string) || null)
    : undefined;
  const coverKey = formData.has("coverKey")
    ? ((formData.get("coverKey") as string) || null)
    : undefined;
  const rawWave = (formData.get("waveNumber") as string) || "";
  const rawOrange = (formData.get("orangeMoneyNumber") as string) || "";

  if (!name) {
    return { error: "Le nom de la boutique est obligatoire." };
  }

  slug = suggestSlug((slug || name).trim());

  if (!isAvailableSlug(slug)) {
    return { error: "Ce lien (slug) est invalide ou réservé. Utilisez 3 à 30 lettres, chiffres ou tirets." };
  }

  const whatsapp = rawWhatsapp ? normalizePhone(rawWhatsapp) : null;
  if (rawWhatsapp && !whatsapp) {
    return { error: "Le numéro WhatsApp n'est pas valide." };
  }

  const deliveryFee = rawDeliveryFee ? parseInt(rawDeliveryFee, 10) : 0;
  if (isNaN(deliveryFee) || deliveryFee < 0) {
    return { error: "Les frais de livraison sont invalides." };
  }

  const waveNumber = rawWave ? normalizePhone(rawWave) : null;
  if (rawWave && !waveNumber) {
    return { error: "Le numéro Wave n'est pas valide." };
  }
  const orangeMoneyNumber = rawOrange ? normalizePhone(rawOrange) : null;
  if (rawOrange && !orangeMoneyNumber) {
    return { error: "Le numéro Orange Money n'est pas valide." };
  }

  try {
    const ctx = await getCurrentSellerContext();
    const existingShop = ctx?.shop ?? (await api.getShopByOwner(sellerId));

    const shopData = {
      ownerId: sellerId,
      name,
      slug,
      headline: tagline || "",
      area: quartier || "",
      description: description || "",
      category: category || null,
      whatsapp,
      acceptsCash,
      deliveryFee,
      deliveryNote: deliveryNote || null,
      status: isPublished ? "ACTIVE" : "DRAFT",
      waveNumber,
      orangeMoneyNumber,
      ...(logoKey !== undefined ? { logoUrl: logoKey } : {}),
      ...(coverKey !== undefined ? { coverUrl: coverKey } : {}),
    };

    if (existingShop) {
      await api.updateShop(existingShop.id, shopData);
    } else {
      await api.createShop(shopData);
    }

    revalidateTag("seller-context");
    revalidatePath("/espace", "layout");
    revalidatePath("/espace/boutique");
    revalidatePath("/explorer");
    revalidatePath(`/${slug}`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la sauvegarde.";
    return { error: msg };
  }
}
