import { notFound } from "next/navigation";
import { formatFcfa } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import Link from "next/link";
import { waLink } from "@/lib/whatsapp";
import AutoRefresh from "./AutoRefresh";
import MarketingPixel from "@/components/MarketingPixel";
import { OrderStatus } from "@/lib/orders";
import { getRequestOrigin } from "@/lib/site-url";
import { api } from "@/lib/api";
import { getEffectivePlan } from "@/lib/plans";
import ProBadge from "@/components/ProBadge";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Commande envoyée | Jaaymaa",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  new:             "Commande reçue",
  preparing:       "En préparation",
  out_for_delivery:"Livreur en route",
  delivered:       "Livrée",
  cancelled:       "Annulée",
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string; border: string }> = {
  new:             { bg: "transparent", color: "#C8265A", border: "#C8265A" },
  preparing:       { bg: "transparent", color: "#FFC83D", border: "#FFC83D" },
  out_for_delivery:{ bg: "transparent", color: "#FFC83D", border: "#FFC83D" },
  delivered:       { bg: "transparent", color: "#0E7C66", border: "#0E7C66" },
  cancelled:       { bg: "transparent", color: "#C3CCE6", border: "#C3CCE6" },
};

/* ─── Ticket card (haut et bas en dents de scie) ─── */
function TicketCard({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <svg viewBox="0 0 344 18" preserveAspectRatio="none" style={{ width: "100%", height: 18, display: "block" }}>
        <path
          d="M0 18H344V0L334.6 9L325.1 0L315.7 9L306.3 0L296.9 9L287.4 0L278.0 9L268.6 0L259.1 9L249.7 0L240.3 9L230.9 0L221.4 9L212.0 0L202.6 9L193.1 0L183.7 9L174.3 0L164.9 9L155.4 0L146.0 9L136.6 0L127.1 9L117.7 0L108.3 9L98.9 0L89.4 9L80.0 0L70.6 9L61.1 0L51.7 9L42.3 0L32.9 9L23.4 0L14.0 9L4.6 0L0 9Z"
          fill="#FFFBF2" stroke="#0F1E3D" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="px-5 py-4" style={{ backgroundColor: "#FFFBF2" }}>{children}</div>
      <svg viewBox="0 0 344 18" preserveAspectRatio="none" style={{ width: "100%", height: 18, display: "block" }}>
        <path
          d="M0 0H344V18L334.6 9L325.1 18L315.7 9L306.3 18L296.9 9L287.4 18L278.0 9L268.6 18L259.1 9L249.7 18L240.3 9L230.9 18L221.4 9L212.0 18L202.6 9L193.1 18L183.7 9L174.3 18L164.9 9L155.4 18L146.0 9L136.6 18L127.1 9L117.7 18L108.3 9L98.9 18L89.4 9L80.0 18L70.6 9L61.1 18L51.7 9L42.3 18L32.9 9L23.4 18L14.0 9L4.6 18L0 9Z"
          fill="#FFFBF2" stroke="#0F1E3D" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function DottedDivider() {
  return <div className="my-3" style={{ borderTop: "1.5px dashed rgba(91,103,133,0.4)" }} />;
}

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ shopSlug: string; publicToken: string }>;
}) {
  const { shopSlug, publicToken } = await params;

  const order = await api.getOrderByReference(publicToken);
  if (!order) notFound();

  const shop = order.shop ?? (await api.getShopBySlug(shopSlug));
  if (!shop) notFound();
  const isProActive = getEffectivePlan(shop.plan, shop.planExpiresAt) === "pro";

  const wavePaymentNumber = shop.waveNumber || shop.whatsapp;
  const orangeMoneyPaymentNumber = shop.orangeMoneyNumber || shop.whatsapp;

  const items = order.items ?? [];
  const events: any[] = [];

  const trackingLink = `${await getRequestOrigin()}/${shopSlug}/commande/${publicToken}`;
  const itemsSummary = items
    .map((i) => `${i.name}${i.options ? ` (${i.options})` : ""} x${i.quantity}`)
    .join(", ");
  const whatsappMessage = `Bonjour ${shop.name} ! Je vous contacte au sujet de ma commande ${order.reference}${itemsSummary ? ` [${itemsSummary}]` : ""}.\nLien de suivi : ${trackingLink}`;

  const currentStatus = (order.status?.toLowerCase() || "new") as OrderStatus;
  const statusStyle = STATUS_COLORS[currentStatus] || STATUS_COLORS.new;

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: "#FFC83D" }}>
      <AutoRefresh intervalMs={30000} />
      <MarketingPixel
        facebookPixelId={isProActive ? shop.facebookPixelId : null}
        tiktokPixelId={isProActive ? shop.tiktokPixelId : null}
        event="Purchase"
        eventData={{
          content_name: shop.name,
          content_type: "product",
          content_ids: items.map((i: any) => i.productId || i.id),
          value: order.total || 0,
          currency: "XOF",
          num_items: items.length,
          order_id: order.reference,
        }}
      />

      <div className="max-w-xl mx-auto px-5">
        {/* ─── CHECK ICON ─── */}
        <div className="flex justify-center pt-14 pb-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center border-[3px] border-ink"
            style={{ backgroundColor: "#0E7C66" }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
        </div>

        {/* ─── TITRE ─── */}
        <div className="text-center mb-3">
          <h1 className="font-bricolage font-black text-ink leading-none" style={{ fontSize: "clamp(2.2rem, 10vw, 3.5rem)", letterSpacing: "-0.02em" }}>
            Commande
          </h1>
          <h1 className="font-bricolage font-black text-ink leading-none mb-2" style={{ fontSize: "clamp(2.2rem, 10vw, 3.5rem)", letterSpacing: "-0.02em" }}>
            envoyée !
          </h1>
          {/* Soulignement rouge */}
          <svg viewBox="0 0 140 10" className="mx-auto mb-4" style={{ width: 140, height: 10 }}>
            <path d="M10 5Q70 1 130 5" stroke="#C8265A" strokeWidth="5" fill="none" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-ink">
            {shop.name} a reçu ta commande{" "}
            <span className="font-bold">{order.number}</span>
            {shop.whatsapp ? " et te répond sur WhatsApp." : "."}
          </p>
          {isProActive && <ProBadge className="mx-auto mt-3" />}
        </div>

        {/* ─── STATUT badge ─── */}
        <div className="flex justify-center mb-5">
          <span
            className="text-xs font-black px-4 py-1.5 rounded-full border-[2px]"
            style={{ ...statusStyle, transform: "rotate(-2deg)" }}
          >
            {STATUS_LABELS[currentStatus]?.toUpperCase()}
          </span>
        </div>

        {/* ─── TICKET récapitulatif ─── */}
        <div className="mb-5">
          <TicketCard>
            {/* Numéro + total */}
            <div className="flex items-end justify-between mb-1">
              <div>
                <p className="text-xs font-semibold" style={{ color: "#3F4B69" }}>Commande</p>
                <p className="font-bricolage font-black text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{order.number}</p>
              </div>
              <p className="font-bricolage font-black text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{formatFcfa(order.total)}</p>
            </div>

            <DottedDivider />

            {/* Articles */}
            {items.map((item) => (
              <div key={item.id} className="flex justify-between py-1 text-sm">
                <div>
                  <span className="font-medium text-ink">
                    {item.name}{" "}
                    <span className="text-xs font-normal" style={{ color: "#3F4B69" }}>
                      x{item.quantity}
                    </span>
                  </span>
                  {item.options && (
                    <p className="text-xs text-[#0E7C66] font-semibold">{item.options}</p>
                  )}
                </div>
                <span className="font-bold text-ink">{formatFcfa(item.unitPrice * item.quantity)}</span>
              </div>
            ))}

            {order.deliveryFee > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: "#3F4B69" }}>Livraison</span>
                <span style={{ color: "#3F4B69" }}>{formatFcfa(order.deliveryFee)}</span>
              </div>
            )}

            <DottedDivider />

            {/* Paiement */}
            {order.paymentMethod === "wave" && (
              shop.wavePaymentLink ? (
                <div className="space-y-2.5 text-sm text-ink">
                  <p className="font-bold">Paiement Wave · {formatFcfa(order.total)}</p>
                  <a
                    href={shop.wavePaymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-ink px-4 py-3 font-black text-sm transition-transform active:scale-[0.98]"
                    style={{ backgroundColor: "#0F1E3D", color: "#FFC83D", boxShadow: "3px 3px 0 #0F1E3D" }}
                  >
                    Ouvrir le lien Wave <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                  <p className="text-xs leading-relaxed" style={{ color: "#3F4B69" }}>
                    Dans Wave, vérifie ou saisis le total indiqué ci-dessus. La boutique confirmera ensuite la réception du paiement.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-ink">
                  Wave : paie au{" "}
                  <span className="font-black">
                    {wavePaymentNumber ? formatPhone(wavePaymentNumber) : "numéro du vendeur"}
                  </span>
                </p>
              )
            )}
            {order.paymentMethod === "orange_money" && (
              <p className="text-sm font-semibold text-ink">
                Orange Money : paie au{" "}
                <span className="font-black">
                  {orangeMoneyPaymentNumber
                    ? formatPhone(orangeMoneyPaymentNumber)
                    : "numéro du vendeur"}
                </span>
              </p>
            )}
            {order.paymentMethod === "cash" && (
              <p className="text-sm font-semibold text-ink">Paiement en espèces à la livraison.</p>
            )}
          </TicketCard>
        </div>

        {/* ─── Timeline (si events) ─── */}
        {events.filter((e) => e.kind === "status").length > 0 && (
          <div className="rounded-2xl border-[2px] border-ink p-4 mb-5" style={{ backgroundColor: "rgba(15,30,61,0.08)" }}>
            <p className="text-xs font-bold text-ink mb-3 uppercase tracking-widest">Chronologie</p>
            <div className="space-y-2">
              {events.filter((e) => e.kind === "status").map((event) => (
                <div key={event.id} className="flex items-center gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#0F1E3D" }} />
                  <span className="font-medium text-ink">{STATUS_LABELS[event.value as OrderStatus]}</span>
                  <span className="ml-auto" style={{ color: "#3F4B69" }}>
                    {new Date(event.createdAt * 1000).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CTA SUIVRE ─── */}
        <Link
          href={`/${shopSlug}/commande/${publicToken}`}
          className="block w-full py-4 rounded-full font-bold text-base border-[2.5px] border-ink mb-3 active:scale-95 transition-transform text-center"
          style={{ backgroundColor: "#0F1E3D", color: "#FFC83D", boxShadow: "4px 4px 0 #0F1E3D" }}
        >
          Suivre ma commande
        </Link>

        {/* WhatsApp */}
        {shop.whatsapp && (
          <a
            href={waLink(shop.whatsapp, whatsappMessage)}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center py-3 rounded-full font-bold text-sm border-[2px] border-ink mb-3 active:scale-95 transition-transform"
            style={{ backgroundColor: "#25D366", color: "#fff" }}
          >
            Contacter sur WhatsApp
          </a>
        )}

        {/* Retour boutique */}
        <Link
          href={`/${shopSlug}`}
          className="block text-center text-sm font-bold py-3 text-ink"
        >
          Retour à la boutique
        </Link>
      </div>
    </div>
  );
}
