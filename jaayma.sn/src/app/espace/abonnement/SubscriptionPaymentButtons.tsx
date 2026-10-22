"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { startProSubscriptionPayment } from "@/app/actions/subscription";

export function SubscriptionPaymentButtons({
  price,
  isRenewal = false,
  plan = "pro",
}: {
  price: string | null;
  isRenewal?: boolean;
  plan?: "pro" | "pro_plus";
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

  const isProPlus = plan === "pro_plus";
  const waveLabel = isRenewal
    ? isProPlus ? "Prolonger Pro+ avec Wave" : "Prolonger avec Wave"
    : isProPlus ? "Passer à Pro+ avec Wave" : "Payer avec Wave";
  const omLabel = isRenewal
    ? isProPlus ? "Prolonger Pro+ avec Orange Money" : "Prolonger avec Orange Money"
    : isProPlus ? "Passer à Pro+ avec Orange Money" : "Payer avec Orange Money";

  return (
    <>
      <form action={startProSubscriptionPayment} onSubmit={(event) => markPending(event, "wave")}>
        <input type="hidden" name="method" value="wave" />
        <input type="hidden" name="plan" value={plan} />
        <button
          type="submit"
          disabled={isPending || !price}
          className="w-full px-3 py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:cursor-wait disabled:opacity-80"
          style={{ backgroundColor: "#0F1E3D", color: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}
        >
          {pendingMethod === "wave" && <Loader2 size={18} className="animate-spin" />}
          {price && !isPending && (
            <Image
              src="/payments/wave.png"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-contain"
            />
          )}
          {pendingMethod === "wave"
            ? "Création du paiement Wave…"
            : isPending
            ? "Patientez…"
            : price
            ? <span className="text-center leading-tight">{waveLabel} · {price} F</span>
            : "Prix indisponible"}
        </button>
      </form>
      <form action={startProSubscriptionPayment} onSubmit={(event) => markPending(event, "orange_money")}>
        <input type="hidden" name="method" value="orange_money" />
        <input type="hidden" name="plan" value={plan} />
        <button
          type="submit"
          disabled={isPending || !price}
          className="w-full px-3 py-4 rounded-full font-bold text-[15px] border-[2.5px] border-ink flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:cursor-wait disabled:opacity-80"
          style={{ backgroundColor: "#FFFBF2", color: "#0F1E3D", boxShadow: "4px 4px 0 #0F1E3D" }}
        >
          {pendingMethod === "orange_money" && <Loader2 size={18} className="animate-spin" />}
          {price && !isPending && (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6DDC8] bg-white p-0.5">
              <Image
                src="/payments/orange-money.svg"
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </span>
          )}
          {pendingMethod === "orange_money"
            ? "Création du paiement Orange Money…"
            : isPending
            ? "Patientez…"
            : price
            ? <span className="text-center leading-tight">{omLabel} · {price} F</span>
            : "Prix indisponible"}
        </button>
      </form>
      {(isPending || !price) && (
        <p className="text-center text-xs font-medium text-[#C3CCE6]" role="status" aria-live="polite">
          {isPending
            ? "Préparation sécurisée du paiement, cela peut prendre quelques secondes. Ne fermez pas cette page."
            : "Le tarif ne peut pas être chargé. Actualisez la page pour réessayer."}
        </p>
      )}
    </>
  );
}
