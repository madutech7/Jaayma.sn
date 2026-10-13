import { getCurrentSellerContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import ShopForm from "./ShopForm";
import { getRequestOrigin } from "@/lib/site-url";

export const metadata = {
  title: "Ma Boutique - Espace Vendeur",
};

export default async function BoutiquePage() {
  const [sellerContext, publicOrigin] = await Promise.all([
    getCurrentSellerContext(),
    getRequestOrigin(),
  ]);
  if (!sellerContext) redirect("/connexion");
  const { shop } = sellerContext;

  return <ShopForm shop={shop || null} publicOrigin={publicOrigin} />;
}
