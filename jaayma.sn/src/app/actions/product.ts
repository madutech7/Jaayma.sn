"use server";

import { getCurrentSellerContext, getCurrentSellerId } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { canActivateProduct, getEffectivePlan } from "@/lib/plans";
import { parseFcfa } from "@/lib/money";
import { parseImageKeys } from "@/lib/product-images";
import { api } from "@/lib/api";

export async function createProduct(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const sellerId = await getCurrentSellerId();
  if (!sellerId) return { error: "Non autorisé." };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const rawPrice = formData.get("price") as string;
  const rawStock = formData.get("stock") as string;
  const isActive = formData.get("isActive") === "on";

  if (!name || !rawPrice) {
    return { error: "Le nom et le prix sont obligatoires." };
  }

  const price = parseFcfa(rawPrice);
  if (price === null) {
    return { error: "Le prix n'est pas valide." };
  }

  const stock = rawStock ? parseInt(rawStock, 10) : 0;
  if (isNaN(stock) || stock < 0) {
    return { error: "La quantité en stock doit être un nombre positif ou nul." };
  }

  try {
    const ctx = await getCurrentSellerContext();
    const shop = ctx?.shop ?? (await api.getShopByOwner(sellerId));
    if (!shop) {
      return { error: "Vous devez d'abord configurer votre boutique." };
    }

    // Check plan limits if making active
    if (isActive) {
      const activeProducts = (await api.getProductsByShop(shop.id)).filter((p) => p.isActive);
      const effectivePlan = getEffectivePlan(shop.plan, shop.planExpiresAt);
      if (!canActivateProduct(effectivePlan, activeProducts.length)) {
        return { error: "Limite de produits actifs atteinte pour votre plan actuel." };
      }
    }

    const imageKeys = parseImageKeys(formData);
    const images = imageKeys.map((key, idx) => ({
      url: key,
      alt: name,
      position: idx,
    }));

    const optionsJson = (formData.get("optionsJson") as string) || null;

    await api.createProduct(shop.id, {
      name,
      description: description || "",
      price,
      stock,
      status: isActive ? "ACTIVE" : "DRAFT",
      optionsJson,
      images,
    });

    revalidateTag("products");
    revalidatePath("/espace", "layout");
    revalidatePath("/espace/produits");
    revalidatePath("/explorer");
    revalidatePath(`/${shop.slug}`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la création.";
    return { error: msg };
  }
}

export async function updateProduct(
  id: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const sellerId = await getCurrentSellerId();
  if (!sellerId) return { error: "Non autorisé." };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const rawPrice = formData.get("price") as string;
  const rawStock = formData.get("stock") as string;
  const isActive = formData.get("isActive") === "on";

  if (!name || !rawPrice) {
    return { error: "Le nom et le prix sont obligatoires." };
  }

  const price = parseFcfa(rawPrice);
  if (price === null) {
    return { error: "Le prix n'est pas valide." };
  }

  const stock = rawStock !== undefined && rawStock !== "" ? parseInt(rawStock, 10) : undefined;
  if (stock !== undefined && (isNaN(stock) || stock < 0)) {
    return { error: "La quantité en stock doit être un nombre positif ou nul." };
  }

  try {
    const ctx = await getCurrentSellerContext();
    const shop = ctx?.shop ?? (await api.getShopByOwner(sellerId));
    if (!shop) return { error: "Boutique introuvable." };

    const imageKeys = parseImageKeys(formData);
    const images = imageKeys.map((key, idx) => ({
      url: key,
      alt: name,
      position: idx,
    }));

    const optionsJson = (formData.get("optionsJson") as string) || null;

    await api.updateProduct(id, {
      name,
      description: description || "",
      price,
      ...(stock !== undefined ? { stock } : {}),
      status: isActive ? "ACTIVE" : "DRAFT",
      optionsJson,
      ...(imageKeys.length > 0 ? { images } : {}),
    });

    revalidateTag("products");
    revalidatePath("/espace", "layout");
    revalidatePath("/espace/produits");
    revalidatePath("/explorer");
    revalidatePath(`/${shop.slug}`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la modification.";
    return { error: msg };
  }
}

export async function deleteProduct(id: string) {
  const sellerId = await getCurrentSellerId();
  if (!sellerId) return { error: "Non autorisé." };

  try {
    const ctx = await getCurrentSellerContext();
    const shop = ctx?.shop ?? (await api.getShopByOwner(sellerId));

    await api.deleteProduct(id);

    revalidateTag("products");
    revalidatePath("/espace", "layout");
    revalidatePath("/espace/produits");
    revalidatePath("/explorer");
    if (shop?.slug) revalidatePath(`/${shop.slug}`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la suppression.";
    return { error: msg };
  }
}
