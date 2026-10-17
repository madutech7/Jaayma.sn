"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setShopPlan, setShopSuspension } from "@/app/actions/admin";
import { Loader2, ExternalLink, Package, ShoppingBag, Ban, CheckCircle2, FileText, Zap } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

interface ShopRowProps {
  shop: {
    id: string;
    name: string;
    slug: string;
    plan: "free" | "pro";
    planExpiresAt: number | null;
    isPublished: boolean;
    isSuspended: boolean;
    isDraft: boolean;
    isExpiredPro: boolean;
    createdAt: number;
    sellerName: string;
    sellerPhone: string;
    productCount: number;
    orderCount: number;
  };
}

export default function AdminShopRow({ shop }: ShopRowProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro">(shop.isExpiredPro ? "free" : shop.plan);
  const [isSuspended, setIsSuspended] = useState(shop.isSuspended);
  const [showSuspendModal, setShowSuspendModal] = useState(false);

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
    setError("");
    setSuccess("");
    const res = await setShopPlan(shop.id, nextPlan, 30);
    if (!res.error) {
      setCurrentPlan(nextPlan);
      setSuccess(nextPlan === "pro" ? "Plan Pro activé pour 30 jours." : "Plan Gratuit activé.");
      router.refresh();
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  async function handleConfirmSuspension() {
    setShowSuspendModal(false);
    const nextSuspended = !isSuspended;
    setLoading(true);
    setError("");
    setSuccess("");
    const res = await setShopSuspension(shop.id, nextSuspended);
    if (!res.error) {
      setIsSuspended(nextSuspended);
      setSuccess(nextSuspended ? "Boutique suspendue." : "Boutique rétablie.");
      router.refresh();
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  return (
    <tr className={`border-t border-white/10 text-sm transition-colors hover:bg-white/[0.03] ${isSuspended ? "bg-hibiscus/[0.06]" : ""}`}>
      {/* Shop Info */}
      <td className="py-4 px-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{shop.name}</span>
            <a
              href={`/${shop.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-ghost/70 transition-colors hover:text-sun"
              title="Visiter la boutique"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="mt-0.5 font-mono text-xs text-ghost/70">/{shop.slug}</p>
        </div>
      </td>

      {/* Seller */}
      <td className="py-4 px-4 text-xs">
        <span className="block font-semibold text-white">{shop.sellerName}</span>
        <span className="mt-0.5 block font-mono text-ghost">{shop.sellerPhone}</span>
        <span className="mt-1 block text-ghost/65">
          Créée le {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(shop.createdAt * 1000))}
        </span>
      </td>

      {/* Products & Orders */}
      <td className="py-4 px-4 text-xs font-medium text-ghost">
        <div className="flex items-center gap-1.5">
          <Package size={13} className="shrink-0 text-ghost/70" />
          <span>{shop.productCount} {shop.productCount === 1 ? "produit" : "produits"}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <ShoppingBag size={13} className="shrink-0 text-ghost/70" />
          <span>{shop.orderCount} {shop.orderCount === 1 ? "commande" : "commandes"}</span>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1 items-start">
          {isSuspended ? (
            <span className="inline-flex -rotate-2 items-center gap-1 rounded border-2 border-hibiscus px-2.5 py-1 text-[11px] font-black text-[#FF9BAF]">
              <span>Suspendue</span>
              <Ban size={12} className="shrink-0" />
            </span>
          ) : shop.isDraft ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black text-ghost">
              <FileText size={12} /> Brouillon
            </span>
          ) : shop.isPublished ? (
            <span className="inline-flex -rotate-2 items-center gap-1 rounded border-2 border-baobab px-2.5 py-1 text-[11px] font-black text-[#64D2B0]">
              <span>En ligne</span>
              <CheckCircle2 size={12} className="shrink-0" />
            </span>
          ) : (
            <span className="inline-flex -rotate-2 items-center gap-1 rounded border-2 border-white/15 px-2.5 py-1 text-[11px] font-black text-ghost">
              <span>Brouillon</span>
              <FileText size={12} className="shrink-0" />
            </span>
          )}

          {shop.isExpiredPro ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F3C65E]/40 bg-[#F3C65E]/10 px-2.5 py-1 text-[10px] font-black text-[#F3C65E]">Pro expiré</span>
          ) : isPro ? (
            <span className="inline-flex items-center gap-1 rounded border-2 border-sun px-2.5 py-1 text-[11px] font-black text-sun">
              <span>Pro</span>
              <Zap size={11} className="shrink-0 fill-sun text-sun" />
              {expiryFormatted ? `(${expiryFormatted})` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-ghost">
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
                <span>{shop.isExpiredPro ? "Renouveler Pro (30j)" : "Activer Pro (30j)"}</span>
              </>
            )}
          </button>

          {/* Suspend Button */}
          <button
            type="button"
            onClick={() => setShowSuspendModal(true)}
            disabled={loading}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border-[2px] border-ink transition-all ${
              isSuspended
                ? "bg-baobab text-white hover:-translate-y-0.5"
                : "bg-white text-hibiscus hover:bg-hibiscus/10"
            }`}
          >
            {isSuspended ? "Rétablir" : "Suspendre"}
          </button>

          <ConfirmModal
            isOpen={showSuspendModal}
            onClose={() => setShowSuspendModal(false)}
            onConfirm={handleConfirmSuspension}
            title={isSuspended ? `Rétablir la boutique ?` : `Suspendre la boutique ?`}
            description={
              isSuspended
                ? `Voulez-vous rétablir la boutique "${shop.name}" ? Elle sera de nouveau accessible aux clients.`
                : `Êtes-vous sûr de vouloir suspendre la boutique "${shop.name}" ? Elle ne sera plus accessible aux clients.`
            }
            confirmLabel={isSuspended ? "Oui, rétablir" : "Oui, suspendre"}
            cancelLabel="Annuler"
            variant={isSuspended ? "primary" : "danger"}
            icon="warning"
            isLoading={loading}
          />
        </div>
        {(error || success) && (
          <p role={error ? "alert" : "status"} className={`mt-2 text-right text-[10px] font-bold ${error ? "text-[#FF9BAF]" : "text-[#64D2B0]"}`}>
            {error || success}
          </p>
        )}
      </td>
    </tr>
  );
}
