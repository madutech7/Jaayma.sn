import { getCurrentSellerContext, getSessionToken } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { api } from "@/lib/api";
import OrderDetailView from "./OrderDetailView";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [sellerContext, token, { orderId }] = await Promise.all([
    getCurrentSellerContext(),
    getSessionToken(),
    params,
  ]);
  if (!sellerContext) redirect("/connexion");
  const { shop } = sellerContext;
  if (!shop) redirect("/espace/boutique");

  const order = await api.getOrderById(orderId, token ?? "");
  if (!order || order.shopId !== shop.id) {
    notFound();
  }

  return <OrderDetailView order={order} />;
}
