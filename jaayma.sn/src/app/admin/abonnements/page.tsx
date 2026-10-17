import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Zap } from "lucide-react";
import { getSessionToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminError, AdminPageTitle, AdminPagination, adminPanelClass } from "../AdminUI";
import AdminFilterForm from "../AdminFilterForm";
import AdminShopRow from "../AdminShopRow";

export const metadata = { title: "Abonnements Pro · Administration Jaayma" };
type SearchParams = Promise<{ q?: string; plan?: string; page?: string }>;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = await getSessionToken();
  if (!token) return <AdminError message="Votre session a expiré. Reconnectez-vous." />;
  const query = params.q?.trim() || "";
  const plan = params.plan || "pro";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  try {
    const overview = await api.getAdminSubscriptions(token, { q: query, plan, page });
    const makeHref = (nextPage: number) => {
      const search = new URLSearchParams();
      if (query) search.set("q", query);
      if (plan) search.set("plan", plan);
      search.set("page", String(nextPage));
      return `/admin/abonnements?${search}`;
    };
    return (
      <>
        <AdminPageTitle eyebrow="Offre commerciale" title="Abonnements Pro" description="Suivez les plans gratuits, Pro actifs et expirés. Activez ou renouvelez un accès Pro directement depuis la fiche boutique." action={<span className="rounded-xl border-2 border-ink bg-papier px-3 py-2 text-xs font-black text-ink"><CreditCard size={14} className="mr-1.5 inline" />Suivi des plans</span>} />

        <section className="mb-5 grid grid-cols-3 gap-3">
          <SubscriptionStat label="Pro actifs" value={overview.metrics.proShops} icon={<CheckCircle2 size={16} className="text-baobab" />} />
          <SubscriptionStat label="Pro expirés" value={overview.metrics.expiredProShops} icon={<AlertTriangle size={16} className="text-[#8A5A00]" />} />
          <SubscriptionStat label="Gratuit / expiré" value={Math.max(0, overview.metrics.totalShops - overview.metrics.proShops)} icon={<Zap size={16} className="text-muted" />} />
        </section>

        <section className={`${adminPanelClass()} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <PlanTab href="/admin/abonnements?plan=pro" active={plan === "pro"}>Pro actifs</PlanTab>
              <PlanTab href="/admin/abonnements?plan=expired" active={plan === "expired"}>Expirés</PlanTab>
              <PlanTab href="/admin/abonnements?plan=free" active={plan === "free"}>Gratuits</PlanTab>
            </div>
            <AdminFilterForm action="/admin/abonnements" className="flex w-full gap-2 sm:w-auto">
              <input type="hidden" name="plan" value={plan} />
              <input name="q" defaultValue={query} placeholder="Rechercher une boutique…" className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-[#FFFBF2] px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-sun sm:w-64" />
              <button className="rounded-lg border-2 border-ink bg-sun px-4 text-xs font-black text-ink">Rechercher</button>
            </AdminFilterForm>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[870px] border-collapse text-left"><thead><tr className="bg-[#F0EDE8] text-[10px] font-black uppercase tracking-[0.13em] text-muted"><th className="px-4 py-3.5 sm:px-5">Boutique</th><th className="px-4 py-3.5">Vendeur</th><th className="px-4 py-3.5">Activité</th><th className="px-4 py-3.5">Abonnement</th><th className="px-4 py-3.5 text-right">Action</th></tr></thead><tbody>
            {overview.shops.items.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted">Aucune boutique dans cette catégorie.</td></tr> : overview.shops.items.map((shop) => {
              const isExpiredPro = shop.plan === "pro" && Boolean(shop.planExpiresAt) && new Date(shop.planExpiresAt!).getTime() < Date.now();
              return <AdminShopRow key={shop.id} shop={{ id: shop.id, name: shop.name, slug: shop.slug, plan: shop.plan === "pro" ? "pro" : "free", planExpiresAt: shop.planExpiresAt ? Math.floor(new Date(shop.planExpiresAt).getTime() / 1000) : null, isPublished: shop.status === "ACTIVE", isSuspended: shop.status === "SUSPENDED", isDraft: shop.status === "DRAFT", isExpiredPro, createdAt: Math.floor(new Date(shop.createdAt).getTime() / 1000), sellerName: shop.owner?.name || "Vendeur", sellerPhone: shop.owner?.phone || shop.whatsapp || "—", productCount: shop._count.products, orderCount: shop._count.orders }} />;
            })}
          </tbody></table></div>
          <AdminPagination page={overview.shops.page} totalPages={overview.shops.totalPages} total={overview.shops.total} pageSize={overview.shops.pageSize} noun="boutiques" hrefForPage={makeHref} />
        </section>
        <p className="mt-4 text-xs leading-5 text-muted/65">L’activation Pro de cette page applique l’accès pendant 30 jours. Les paiements réels ne sont pas enregistrés dans Jaayma pour le moment.</p>
      </>
    );
  } catch (error) {
    return <AdminError message={error instanceof Error ? error.message : "Impossible de charger les abonnements."} />;
  }
}

function SubscriptionStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className={`${adminPanelClass()} flex items-center gap-3 p-3 sm:p-4`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/5">{icon}</span><div><p className="font-bricolage text-xl font-black leading-none">{value}</p><p className="mt-1 text-[10px] font-semibold text-muted">{label}</p></div></div>;
}

function PlanTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`rounded-full border px-3 py-2 text-xs font-black ${active ? "border-sun bg-sun text-ink" : "border-ink/15 text-muted hover:bg-ink/5"}`}>{children}</Link>;
}
