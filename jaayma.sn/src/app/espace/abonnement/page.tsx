import { getCurrentSellerContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectivePlan } from "@/lib/plans";
import { waLink } from "@/lib/whatsapp";

export const metadata = {
  title: "Mon Abonnement - Espace Vendeur",
};

export default async function AbonnementPage() {
  const sellerContext = await getCurrentSellerContext();
  if (!sellerContext) redirect("/connexion");
  const { shop } = sellerContext;
  if (!shop) redirect("/espace/boutique");

  const effectivePlan = getEffectivePlan(shop.plan, shop.planExpiresAt);
  const isPro = effectivePlan === "pro";

  const supportWhatsapp = process.env.SUPPORT_WHATSAPP || "221770000000";
  const upgradeMessage = `Bonjour Jaaymaa ! \nJe souhaite passer au plan PRO pour ma boutique "${shop.name}" (slug: ${shop.slug}).`;

  return (
    <div className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-screen" style={{ backgroundColor: "#0F1E3D" }}>
      {/*  HEADER  */}
      <div className="mb-8 mt-4">
        <p className="text-sm font-medium mb-1" style={{ color: "#C3CCE6" }}>Ton plan</p>
        <h1 className="font-bricolage font-black leading-none" style={{ color: "#FFC83D", fontSize: "clamp(2rem, 8vw, 2.5rem)", letterSpacing: "-0.02em" }}>
          Abonnement
        </h1>
      </div>

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

          {/* BOUTON ACTION PRO */}
          {!isPro ? (
            <a
              href={waLink(supportWhatsapp, upgradeMessage)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ backgroundColor: "#0E7C66", color: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}
            >
              Passer Pro (1 000 F / mois)
            </a>
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
