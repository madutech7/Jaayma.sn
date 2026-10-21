"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { startProSubscriptionPayment } from "@/app/actions/subscription";

export function SubscriptionPaymentButtons({
  price,
  isRenewal = false,
}: {
  price: string | null;
  isRenewal?: boolean;
}) {
  const [pendingMethod, setPendingMethod] = useState<"wave" | "orange_money" | null>(null);
  const submissionStarted = useRef(false);
  const isPending = pendingMethod !== null;

  function markPending(event: FormEvent<HTMLFormElement>, method: "wave" | "orange_money") {
    if (submissionStarted.current) {
      event.preventDefault();
      return;
    }
    submissionStarted.current = true;
    setPendingMethod(method);
  }

  const waveLabel = isRenewal ? "Prolonger avec Wave" : "Payer avec Wave";
  const omLabel = isRenewal ? "Prolonger avec Orange Money" : "Payer avec Orange Money";

  return (
    <>
      <form action={startProSubscriptionPayment} onSubmit={(event) => markPending(event, "wave")}>
        <input type="hidden" name="method" value="wave" />
        <button
          type="submit"
          disabled={isPending || !price}
          className="w-full py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:cursor-wait disabled:opacity-80"
          style={{ backgroundColor: "#0F1E3D", color: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}
        >
          {pendingMethod === "wave" && <Loader2 size={18} className="animate-spin" />}
          {pendingMethod === "wave" ? "Création du paiement Wave…" : isPending ? "Patientez…" : price ? `${waveLabel} · ${price} F` : "Prix indisponible"}
        </button>
      </form>
      <form action={startProSubscriptionPayment} onSubmit={(event) => markPending(event, "orange_money")}>
        <input type="hidden" name="method" value="orange_money" />
        <button
          type="submit"
          disabled={isPending || !price}
          className="w-full py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:cursor-wait disabled:opacity-80"
          style={{ backgroundColor: "#FFFBF2", color: "#0F1E3D", boxShadow: "4px 4px 0 #0F1E3D" }}
        >
          {pendingMethod === "orange_money" && <Loader2 size={18} className="animate-spin" />}
          {pendingMethod === "orange_money" ? "Création du paiement Orange Money…" : isPending ? "Patientez…" : price ? `${omLabel} · ${price} F` : "Prix indisponible"}
        </button>
      </form>
      {(isPending || !price) && (
        <p className="text-center text-xs font-medium text-[#C3CCE6]" role="status" aria-live="polite">
          {isPending ? "Préparation sécurisée du paiement, cela peut prendre quelques secondes. Ne fermez pas cette page." : "Le prix Pro ne peut pas être chargé. Actualisez la page pour réessayer."}
        </p>
      )}
    </>
  );
}
