"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readProSubscriptionPayment } from "@/app/actions/subscription";

type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export function SubscriptionPaymentNotice({
  paymentId,
  initialStatus,
}: {
  paymentId: string;
  initialStatus: PaymentStatus | null;
}) {
  const [status, setStatus] = useState<PaymentStatus | null>(initialStatus);
  const router = useRouter();

  useEffect(() => {
    if (status !== "pending") return;
    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const refresh = async () => {
      const payment = await readProSubscriptionPayment(paymentId);
      if (stopped) return;
      if (payment) {
        setStatus(payment.status);
        if (payment.status === "paid") {
          router.refresh();
          return;
        }
        if (payment.status !== "pending") return;
      }
      attempts += 1;
      if (attempts < 15) timer = setTimeout(refresh, 4000);
    };

    timer = setTimeout(refresh, 2500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [paymentId, router, status]);

  const copy = status === "paid"
    ? { title: "Paiement confirmé", body: "Votre boutique vient de passer au plan Pro. Actualisation de votre espace…", color: "#0E7C66" }
    : status === "failed"
      ? { title: "Paiement non abouti", body: "Le paiement a échoué. Vous pouvez réessayer avec Wave ou Orange Money.", color: "#C8265A" }
      : status === "expired"
        ? { title: "Session de paiement expirée", body: "Cette session a expiré. Relancez un paiement pour activer Pro.", color: "#8A5A00" }
        : { title: "Confirmation du paiement en cours", body: "U‑NITech PAY nous confirme votre paiement de façon sécurisée. Cette vérification peut prendre quelques secondes.", color: "#8A5A00" };

  return (
    <div className="mb-5 rounded-2xl border-2 border-ink p-4" style={{ backgroundColor: "#FFFBF2" }} role="status" aria-live="polite">
      <p className="font-bricolage font-black text-ink" style={{ color: copy.color }}>{copy.title}</p>
      <p className="mt-1 text-sm font-medium text-ink/75">{copy.body}</p>
      {status === "pending" && (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-3 text-sm font-black text-ink underline underline-offset-4"
        >
          Vérifier le statut maintenant
        </button>
      )}
    </div>
  );
}
