import { getCurrentSellerContext, getSessionToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectivePlan } from "@/lib/plans";
import { api } from "@/lib/api";
import { startProSubscriptionPayment } from "@/app/actions/subscription";
import { SubscriptionPaymentNotice } from "./SubscriptionPaymentNotice";

export const metadata = {
  title: "Mon Abonnement - Espace Vendeur",
};

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string; erreur?: string }>;
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

  const effectivePlan = getEffectivePlan(shop.plan, shop.planExpiresAt);
  const isPro = effectivePlan === "pro";

  return (
    <div className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-screen" style={{ backgroundColor: "#0F1E3D" }}>
      {/*  HEADER  */}
      <div className="mb-8 mt-4">
        <p className="text-sm font-medium mb-1" style={{ color: "#C3CCE6" }}>Ton plan</p>
        <h1 className="font-bricolage font-black leading-none" style={{ color: "#FFC83D", fontSize: "clamp(2rem, 8vw, 2.5rem)", letterSpacing: "-0.02em" }}>
          Abonnement
        </h1>
      </div>

      {params.erreur === "paiement" && (
        <div className="mb-5 rounded-2xl border-2 border-ink bg-[#FFFBF2] p-4" role="alert">
          <p className="font-bricolage font-black text-[#C8265A]">Le paiement n’a pas pu démarrer</p>
          <p className="mt-1 text-sm font-medium text-ink/75">Réessayez dans un instant. Si le problème persiste, le paiement en ligne doit peut-être encore être configuré.</p>
        </div>
      )}

      {paymentId && payment && (
        <SubscriptionPaymentNotice paymentId={paymentId} initialStatus={payment.status} />
      )}

      <div className="space-y-4">
        {/* CARTE GRATUIT */}
        <div className="p-6 rounded-3xl border-[2.5px] border-ink flex items-center relative overflow-hidden" style={{ backgroundColor: "#FFFBF2" }}>
          {!isPro && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-[2.5px] border-ink bg-sun flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
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
          </div>
        </div>

        {/* CARTE PRO */}
        <div className="p-6 rounded-3xl border-[2.5px] border-ink relative overflow-hidden" style={{ backgroundColor: "#FFC83D" }}>
          {isPro && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-[2.5px] border-ink bg-white flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 rounded-full border-[2.5px] border-ink flex items-center justify-center bg-white mr-4 shrink-0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div>
              <h2 className="font-bricolage font-black text-ink text-2xl mb-1">PRO <span className="text-xl opacity-70">1 000 F</span></h2>
              <p className="font-bold text-ink/80 text-[13px]">/ mois, sans engagement</p>
            </div>
          </div>
          
          <ul className="space-y-2.5 mb-8">
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
          </ul>

          {/* PAIEMENT DE L'ABONNEMENT */}
          {!isPro ? (
            <div className="space-y-3">
              <form action={startProSubscriptionPayment}>
                <input type="hidden" name="method" value="wave" />
                <button
                  type="submit"
                  className="w-full py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{ backgroundColor: "#0F1E3D", color: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}
                >
                  Payer avec Wave · 1 000 F
                </button>
              </form>
              <form action={startProSubscriptionPayment}>
                <input type="hidden" name="method" value="orange_money" />
                <button
                  type="submit"
                  className="w-full py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{ backgroundColor: "#FFFBF2", color: "#0F1E3D", boxShadow: "4px 4px 0 #0F1E3D" }}
                >
                  Payer avec Orange Money · 1 000 F
                </button>
              </form>
              <p className="text-center text-xs font-medium text-[#C3CCE6]">Paiement sécurisé · Pro activé après confirmation</p>
            </div>
          ) : (
            <div
              className="w-full py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2"
              style={{ backgroundColor: "#0F1E3D", color: "#FFC83D" }}
            >
              Plan Pro Actif 
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
