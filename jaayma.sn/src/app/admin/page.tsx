import { checkIsAdmin } from "@/app/actions/admin";
import { api } from "@/lib/api";
import Link from "next/link";
import { Search, AlertOctagon, ArrowLeft } from "lucide-react";
import AdminShopRow from "./AdminShopRow";

export const metadata = {
  title: "Administration | Jaay",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { isAdmin, phone } = await checkIsAdmin();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-nuit flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl border-[2.5px] border-hibiscus/50 bg-hibiscus/10 text-hibiscus flex items-center justify-center mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bricolage font-black text-white mb-2">
          Accès Réservé
        </h1>
        <p className="text-ghost text-sm max-w-sm mb-6">
          Votre compte {phone ? `(${phone})` : ""} n'est pas autorisé à accéder au panneau d'administration.
        </p>
        <Link
          href="/espace"
          className="bg-sun text-ink text-xs font-bold px-5 py-2.5 rounded-full border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D] hover:-translate-y-0.5 transition-transform"
        >
          Retour à mon espace vendeur
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const query = params.q?.trim() || "";

  const allShops = await api.getShops({ q: query });

  const enrichedShops = allShops.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    plan: (s.plan === "pro" ? "pro" : "free") as "free" | "pro",
    planExpiresAt: s.planExpiresAt
      ? typeof s.planExpiresAt === "number"
        ? s.planExpiresAt
        : Math.floor(new Date(s.planExpiresAt).getTime() / 1000)
      : null,
    isPublished: s.isPublished ?? true,
    isSuspended: s.isSuspended ?? false,
    createdAt: s.createdAt
      ? typeof s.createdAt === "number"
        ? s.createdAt
        : Math.floor(new Date(s.createdAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
    sellerPhone: s.whatsapp || "",
    productCount: s.products?.length || 0,
    orderCount: 0,
  }));

  const totalShops = allShops.length;
  const proShops = allShops.filter((s) => s.plan === "pro").length;
  const suspendedShops = allShops.filter((s) => s.isSuspended).length;
  const publishedShops = allShops.filter((s) => s.isPublished).length;

  return (
    <div className="min-h-screen bg-nuit pb-16">
      {/* Top Header */}
      <header className="bg-ink text-white border-b-[2px] border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/espace"
              className="p-2 rounded-xl border-[2px] border-white/15 bg-white/5 hover:bg-white/10 text-ghost transition-colors"
              title="Retour à l'espace vendeur"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <img src="/logo-sombre.svg" alt="Jaay" className="h-6 w-auto" />
              <span className="font-bricolage font-black text-lg text-sun">Admin</span>
            </div>
          </div>
          <div className="text-xs text-ghost">
            Connecté en tant que <span className="font-mono text-white">{phone}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-papier p-4 rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D]">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Boutiques totales
            </span>
            <span className="text-2xl font-bricolage font-black text-ink">
              {totalShops}
            </span>
          </div>

          <div className="bg-papier p-4 rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D]">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Boutiques Pro
            </span>
            <span className="text-2xl font-bricolage font-black text-hibiscus">
              {proShops}
            </span>
          </div>

          <div className="bg-papier p-4 rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D]">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              En ligne
            </span>
            <span className="text-2xl font-bricolage font-black text-baobab">
              {publishedShops}
            </span>
          </div>

          <div className="bg-papier p-4 rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D]">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Suspendues
            </span>
            <span className="text-2xl font-bricolage font-black text-hibiscus">
              {suspendedShops}
            </span>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-[#16264D] p-4 rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D] flex flex-col sm:flex-row items-center justify-between gap-4">
          <form method="GET" action="/admin" className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Rechercher par nom, slug, téléphone..."
              className="w-full bg-papier border-[2px] border-ink rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:border-sun text-ink placeholder:text-muted"
            />
          </form>

          <span className="text-xs font-semibold text-ghost">
            {enrichedShops.length} boutique{enrichedShops.length > 1 ? "s" : ""} affichée(s)
          </span>
        </div>

        {/* SHOPS TABLE */}
        <div className="bg-papier rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0_#0F1E3D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="bg-ink border-b-[2px] border-ink text-[11px] font-bold uppercase tracking-wider text-ghost">
                  <th className="py-3 px-4">Boutique</th>
                  <th className="py-3 px-4">Vendeur</th>
                  <th className="py-3 px-4">Catalogue</th>
                  <th className="py-3 px-4">Statut & Plan</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrichedShops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted">
                      Aucune boutique ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  enrichedShops.map((shop) => (
                    <AdminShopRow key={shop.id} shop={shop} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
