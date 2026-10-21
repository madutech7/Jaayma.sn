import { getCurrentSellerContext, getSessionToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectivePlan, getProDaysRemaining, getProUrgency } from "@/lib/plans";
import { api } from "@/lib/api";
import { SubscriptionPaymentNotice } from "./SubscriptionPaymentNotice";
import { SubscriptionPaymentButtons } from "./SubscriptionPaymentButtons";

export const metadata = {
  title: "Mon Abonnement - Espace Vendeur",
};

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string; erreur?: string; retour?: string }>;
}) {
  const sellerContext = await getCurrentSellerContext();
  if (!sellerContext) redirect("/connexion");
  const { shop } = sellerContext;
  if (!shop) redirect("/espace/boutique");

  const params = await searchParams;
  const paymentId = params.paiement?.trim() || "";
  const token = paymentId ? await getSessionToken() : null;
  const payment = token && paymentId
    ? await api.getSubscriptionPayment(token, paymentId).catch(() => null)
    : null;
  const proPrice = await api.getProSubscriptionPrice().catch(() => null);
  const formattedProPrice = proPrice ? new Intl.NumberFormat("fr-FR").format(proPrice.amount) : null;

  const effectivePlan = getEffectivePlan(shop.plan, shop.planExpiresAt);
  const isPro = effectivePlan === "pro";
  const daysRemaining = getProDaysRemaining(shop.plan, shop.planExpiresAt);
  const urgency = getProUrgency(shop.plan, shop.planExpiresAt);

  // Format expiry date for display (Senegal TZ)
  const expiryFormatted = shop.planExpiresAt
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Dakar",
      }).format(
        typeof shop.planExpiresAt === "number"
          ? new Date(shop.planExpiresAt > 1e12 ? shop.planExpiresAt : shop.planExpiresAt * 1000)
          : new Date(shop.planExpiresAt)
      )
    : null;

  // Urgency visual tokens
  const urgencyConfig = {
    ok: {
      dotColor: "#0E7C66",
      badgeBg: "#D9F1E9",
      badgeText: "#075F4D",
      label: "Actif",
      progressColor: "#0E7C66",
    },
    warning: {
      dotColor: "#B4531E",
      badgeBg: "#FEF3D6",
      badgeText: "#8A5A00",
      label: "Expire bientôt",
      progressColor: "#FFC83D",
    },
    critical: {
      dotColor: "#C8265A",
      badgeBg: "#FCE7EC",
      badgeText: "#C8265A",
      label: "Urgent",
      progressColor: "#C8265A",
    },
    expired: {
      dotColor: "#C8265A",
      badgeBg: "#FCE7EC",
      badgeText: "#C8265A",
      label: "Expiré",
      progressColor: "#C8265A",
    },
  } as const;

  const uConfig = urgency ? urgencyConfig[urgency] : null;

  // Reusable Gratuit Card Component
  const GratuitCard = () => (
    <div
      className={`p-6 rounded-3xl border-[2.5px] border-ink flex items-center relative overflow-hidden transition-opacity ${
        isPro ? "bg-[#FFFBF2]/90 opacity-80" : "bg-[#FFFBF2]"
      }`}
    >
      {!isPro && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-sun px-3 py-1 text-xs font-black text-ink shadow-[2px_2px_0_#0F1E3D]">
            Plan actuel
          </span>
        </div>
      )}
      <div className="w-16 h-16 rounded-full border-[2.5px] border-ink flex items-center justify-center bg-white mr-4 shrink-0">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
      <div>
        <h2 className="font-bricolage font-black text-ink text-2xl mb-1">Gratuit</h2>
        <p className="font-bold text-ink/70 text-sm">Jusqu'à 10 produits, idéal pour débuter sans frais.</p>
        {isPro && (
          <p className="mt-1 text-xs font-medium text-[#3F4B69]">
            Votre boutique basculera sur cette formule si vous choisissez de ne pas renouveler.
          </p>
        )}
      </div>
    </div>
  );

  // Reusable Pro Card Component
  const ProCard = () => (
    <div className="p-6 rounded-3xl border-[2.5px] border-ink relative overflow-hidden" style={{ backgroundColor: "#FFC83D" }}>
      {isPro && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-[#0F1E3D] px-3 py-1 text-xs font-black text-[#FFC83D] shadow-[2px_2px_0_#0F1E3D]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Plan Actif
          </span>
        </div>
      )}

      <div className="flex items-center mb-6">
        <div className="w-16 h-16 rounded-full border-[2.5px] border-ink flex items-center justify-center bg-white mr-4 shrink-0">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div>
          <h2 className="font-bricolage font-black text-ink text-2xl mb-1">
            PRO <span className="text-xl opacity-70">{formattedProPrice ? `${formattedProPrice} F` : "Tarif indisponible"}</span>
          </h2>
          <p className="font-bold text-ink/80 text-[13px]">/ mois, sans engagement</p>
        </div>
      </div>
      
      <ul className="space-y-2.5 mb-6">
        <li className="flex items-start gap-2.5 font-bold text-ink text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
          Jusqu'à 200 produits en ligne
        </li>
        <li className="flex items-start gap-2.5 font-bold text-ink text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
          Jusqu'à 4 photos par produit
        </li>
        <li className="flex items-start gap-2.5 font-bold text-ink text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
          Badge Boutique Pro
        </li>
        <li className="flex items-start gap-2.5 font-bold text-ink text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
          Outils marketing : pixels Meta/TikTok et catalogue XML
        </li>
      </ul>

      {/* BLOC STATUT PRO (visible uniquement pour les Pro actifs) */}
      {isPro && uConfig && daysRemaining !== null && expiryFormatted && (
        <div className="mb-6 rounded-2xl border-[2px] border-ink bg-white/95 p-4" style={{ boxShadow: "3px 3px 0 #0F1E3D" }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: uConfig.dotColor }}
              />
              <p className="font-bricolage font-black text-ink text-[15px]">Statut de l'abonnement</p>
            </div>
            <span
              className="text-[10px] font-black px-2.5 py-1 rounded-full border border-ink/20"
              style={{ backgroundColor: uConfig.badgeBg, color: uConfig.badgeText }}
            >
              {uConfig.label}
            </span>
          </div>

          {/* Barre de progression visuelle */}
          <div className="mb-3">
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "#0F1E3D10" }}
              role="progressbar"
              aria-label="Jours restants"
              aria-valuemin={0}
              aria-valuemax={30}
              aria-valuenow={Math.min(daysRemaining, 30)}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.min(100, (daysRemaining / 30) * 100)}%`,
                  backgroundColor: uConfig.progressColor,
                }}
              />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-bricolage font-black text-lg" style={{ color: uConfig.dotColor }}>
                      {daysRemaining}
                    </span>
                    {" "}jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}
                  </>
                ) : (
                  <span style={{ color: "#C8265A" }}>Votre abonnement a expiré</span>
                )}
              </p>
              <p className="text-xs font-medium text-[#3F4B69] mt-0.5">
                {daysRemaining > 0
                  ? `Actif jusqu'au ${expiryFormatted}`
                  : `Expiré le ${expiryFormatted}`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAIEMENT / RENOUVELLEMENT */}
      {!isPro ? (
        <div className="space-y-3">
          <SubscriptionPaymentButtons price={formattedProPrice} />
          <p className="text-center text-xs font-semibold text-ink/75">Paiement sécurisé · Pro activé après confirmation</p>
        </div>
      ) : (
        <div className="pt-2 border-t border-ink/15 space-y-3">
          <div className="rounded-2xl border-2 border-ink bg-white/70 p-3.5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0F1E3D]">
              Prolonger mon abonnement
            </p>
            <p className="mt-1 text-xs font-medium text-[#3F4B69]">
              {daysRemaining !== null && daysRemaining > 0
                ? "Ajoutez 30 jours à votre échéance actuelle. Aucun jour n'est perdu."
                : "Renouvelez pour réactiver votre accès Pro immédiatement."
              }
            </p>
          </div>
          <SubscriptionPaymentButtons price={formattedProPrice} isRenewal />
        </div>
      )}
    </div>
  );

  return (
    <div className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-screen pb-28" style={{ backgroundColor: "#0F1E3D" }}>
      {/*  HEADER  */}
      <div className="mb-8 mt-4">
        <p className="text-sm font-medium mb-1" style={{ color: "#C3CCE6" }}>Ton plan</p>
        <h1 className="font-bricolage font-black leading-none" style={{ color: "#FFC83D", fontSize: "clamp(2rem, 8vw, 2.5rem)", letterSpacing: "-0.02em" }}>
          Abonnement
        </h1>
      </div>

      {params.erreur === "paiement" && (
        <div className="mb-5 rounded-2xl border-2 border-ink bg-[#FFFBF2] p-4" role="alert">
          <p className="font-bricolage font-black text-[#C8265A]">Le paiement n'a pas pu démarrer</p>
          <p className="mt-1 text-sm font-medium text-ink/75">Réessayez dans un instant. Si le problème persiste, le paiement en ligne doit peut-être encore être configuré.</p>
        </div>
      )}

      {paymentId && payment && (
        <SubscriptionPaymentNotice
          paymentId={paymentId}
          initialStatus={payment.status}
          returnedCancelled={params.retour === "annule"}
        />
      )}

      <div className="space-y-5">
        {/* L'ordre des cartes s'adapte automatiquement au plan de l'utilisateur : son plan actif apparaît en premier ! */}
        {isPro ? (
          <>
            <ProCard />
            <GratuitCard />
          </>
        ) : (
          <>
            <GratuitCard />
            <ProCard />
          </>
        )}
      </div>
    </div>
  );
}
