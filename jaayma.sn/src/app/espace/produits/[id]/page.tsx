import { getCurrentSellerContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ProductForm from "../ProductForm";
import { api } from "@/lib/api";

export const metadata = {
  title: "Modifier le produit - Espace Vendeur",
};

export default async function ModifierProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const [sellerContext, { id }] = await Promise.all([
    getCurrentSellerContext(),
    params,
  ]);
  if (!sellerContext) redirect("/connexion");
  const { shop } = sellerContext;
  if (!shop) redirect("/espace/boutique");

  const product = await api.getProductById(id);
  if (!product || product.shopId !== shop.id) {
    notFound();
  }

  const imageKeys = (product.images ?? [])
    .sort((a, b) => a.position - b.position)
    .map((img) => img.url);

  return <ProductForm product={product} imageKeys={imageKeys} />;
}
