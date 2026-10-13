"use client";

import { useState } from "react";
import { setShopPlan, setShopSuspension } from "@/app/actions/admin";
import { Loader2, ExternalLink, Package, ShoppingBag, Ban, CheckCircle2, FileText, Zap } from "lucide-react";

interface ShopRowProps {
  shop: {
    id: string;
    name: string;
    slug: string;
    plan: "free" | "pro";
    planExpiresAt: number | null;
    isPublished: boolean;
    isSuspended: boolean;
    createdAt: number;
    sellerPhone: string;
    productCount: number;
    orderCount: number;
  };
}

export default function AdminShopRow({ shop }: ShopRowProps) {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro">(shop.plan);
  const [isSuspended, setIsSuspended] = useState(shop.isSuspended);

  const isPro = currentPlan === "pro";

  let expiryFormatted = "";
  if (shop.planExpiresAt) {
    expiryFormatted = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(shop.planExpiresAt * 1000));
  }

  async function handleTogglePlan() {
    const nextPlan = isPro ? "free" : "pro";
    setLoading(true);
    const res = await setShopPlan(shop.id, nextPlan, 30);
    if (!res.error) {
      setCurrentPlan(nextPlan);
    } else {
      alert(res.error);
    }
    setLoading(false);
  }

  async function handleToggleSuspension() {
    const nextSuspended = !isSuspended;
    const confirmMsg = nextSuspended
      ? `Êtes-vous sûr de vouloir suspendre la boutique "${shop.name}" ? Elle ne sera plus accessible aux clients.`
      : `Rétablir la boutique "${shop.name}" ?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    const res = await setShopSuspension(shop.id, nextSuspended);
    if (!res.error) {
      setIsSuspended(nextSuspended);
    } else {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <tr className={`border-b border-ink/15 hover:bg-white/55 transition-colors text-sm ${isSuspended ? "bg-hibiscus/10" : ""}`}>
      {/* Shop Info */}
      <td className="py-4 px-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">{shop.name}</span>
            <a
              href={`/${shop.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-hibiscus transition-colors"
              title="Visiter la boutique"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="font-mono text-xs text-muted mt-0.5">/{shop.slug}</p>
        </div>
      </td>

      {/* Seller */}
      <td className="py-4 px-4 text-xs">
        <span className="font-mono text-ink block">{shop.sellerPhone}</span>
        <span className="text-muted">
          Créée le {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(shop.createdAt * 1000))}
        </span>
      </td>

      {/* Products & Orders */}
      <td className="py-4 px-4 text-xs font-medium text-muted">
        <div className="flex items-center gap-1.5">
          <Package size={13} className="text-muted shrink-0" />
          <span>{shop.productCount} produit(s)</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <ShoppingBag size={13} className="text-muted shrink-0" />
          <span>{shop.orderCount} commande(s)</span>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1 items-start">
          {isSuspended ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded border-[2px] border-hibiscus text-hibiscus -rotate-2">
              <span>Suspendue</span>
              <Ban size={12} className="shrink-0" />
            </span>
          ) : shop.isPublished ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded border-[2px] border-baobab text-baobab -rotate-2">
              <span>En ligne</span>
              <CheckCircle2 size={12} className="shrink-0" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded border-[2px] border-muted text-muted -rotate-2">
              <span>Brouillon</span>
              <FileText size={12} className="shrink-0" />
            </span>
          )}

          {isPro ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded border-[2px] border-sun text-ink">
              <span>Pro</span>
              <Zap size={11} className="shrink-0 fill-[#0F1E3D] text-[#0F1E3D]" />
              {expiryFormatted ? `(${expiryFormatted})` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border border-ink/20 text-muted">
              Gratuit
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Plan Pro Button */}
          <button
            type="button"
            onClick={handleTogglePlan}
            disabled={loading}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border-[2px] border-ink transition-all inline-flex items-center gap-1.5 ${
              isPro
                ? "bg-papier hover:bg-white text-ink"
                : "bg-sun hover:-translate-y-0.5 text-ink shadow-[2px_2px_0_#0F1E3D]"
            }`}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPro ? (
              "Passer en Gratuit"
            ) : (
              <>
                <Zap size={12} className="fill-[#0F1E3D] text-[#0F1E3D] shrink-0" />
                <span>Activer Pro (30j)</span>
              </>
            )}
          </button>

          {/* Suspend Button */}
          <button
            type="button"
            onClick={handleToggleSuspension}
            disabled={loading}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border-[2px] border-ink transition-all ${
              isSuspended
                ? "bg-baobab text-white hover:-translate-y-0.5"
                : "bg-white text-hibiscus hover:bg-hibiscus/10"
            }`}
          >
            {isSuspended ? "Rétablir" : "Suspendre"}
          </button>
        </div>
      </td>
    </tr>
  );
}
