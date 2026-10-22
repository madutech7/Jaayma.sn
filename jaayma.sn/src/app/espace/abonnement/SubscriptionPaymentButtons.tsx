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
  const actionLabel = isRenewal
    ? isProPlus ? "Prolonger Pro+ avec" : "Prolonger avec"
    : isProPlus ? "Passer à Pro+ avec" : "Payer avec";

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <form action={startProSubscriptionPayment} onSubmit={(event) => markPending(event, "wave")}>
          <input type="hidden" name="method" value="wave" />
          <input type="hidden" name="plan" value={plan} />
          <button
            type="submit"
            disabled={isPending || !price}
            className="flex min-h-[112px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-[2.5px] border-ink px-2 py-3 text-center text-xs font-bold transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-80 sm:min-h-[88px] sm:flex-row sm:gap-2 sm:px-3 sm:text-left sm:text-[13px]"
            style={{ backgroundColor: "#0F1E3D", color: "#fff", boxShadow: "4px 4px 0 #0F1E3D" }}
          >
            {pendingMethod === "wave" ? (
              <Loader2 size={18} className="shrink-0 animate-spin" />
            ) : price && !isPending ? (
              <Image
                src="/payments/wave.png"
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
                className="h-8 w-8 shrink-0 rounded-full object-contain sm:h-9 sm:w-9"
              />
            ) : null}
            <span className="flex min-w-0 flex-col items-center leading-tight sm:items-start">
              {pendingMethod === "wave"
                ? "Création du paiement…"
                : isPending
                ? "Patientez…"
                : price
                ? <>
                    <span className="text-[10px] font-semibold sm:text-[11px]">{actionLabel}</span>
                    <span className="font-black">Wave</span>
                    <span className="text-[11px] sm:text-xs">{price} F</span>
                  </>
                : "Prix indisponible"}
            </span>
          </button>
        </form>

        <form action={startProSubscriptionPayment} onSubmit={(event) => markPending(event, "orange_money")}>
          <input type="hidden" name="method" value="orange_money" />
          <input type="hidden" name="plan" value={plan} />
          <button
            type="submit"
            disabled={isPending || !price}
            className="flex min-h-[112px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-[2.5px] border-ink px-2 py-3 text-center text-xs font-bold transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-80 sm:min-h-[88px] sm:flex-row sm:gap-2 sm:px-3 sm:text-left sm:text-[13px]"
            style={{ backgroundColor: "#FFFBF2", color: "#0F1E3D", boxShadow: "4px 4px 0 #0F1E3D" }}
          >
            {pendingMethod === "orange_money" ? (
              <Loader2 size={18} className="shrink-0 animate-spin" />
            ) : price && !isPending ? (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6DDC8] bg-white p-0.5 sm:h-9 sm:w-9">
                <Image
                  src="/payments/orange-money.svg"
                  alt=""
                  aria-hidden="true"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col items-center leading-tight sm:items-start">
              {pendingMethod === "orange_money"
                ? "Création du paiement…"
                : isPending
                ? "Patientez…"
                : price
                ? <>
                    <span className="text-[10px] font-semibold sm:text-[11px]">{actionLabel}</span>
                    <span className="font-black">Orange Money</span>
                    <span className="text-[11px] sm:text-xs">{price} F</span>
                  </>
                : "Prix indisponible"}
            </span>
          </button>
        </form>
      </div>
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
