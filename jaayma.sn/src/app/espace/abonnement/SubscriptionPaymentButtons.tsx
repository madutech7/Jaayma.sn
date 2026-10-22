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

  const actionLabel = isRenewal
    ? "Prolonger avec"
    : plan === "pro_plus" ? "Passer à Pro+ avec" : "Payer avec";
  const paymentMethods = [
    { method: "wave", label: "Wave", logo: "/payments/wave.png" },
    { method: "orange_money", label: "Orange Money", logo: "/payments/orange-money.svg" },
  ] as const;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {paymentMethods.map(({ method, label, logo }) => (
          <form
            key={method}
            action={startProSubscriptionPayment}
            onSubmit={(event) => markPending(event, method)}
          >
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="plan" value={plan} />
            <button
              type="submit"
              disabled={isPending || !price}
              className="flex min-h-[84px] w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-ink bg-[#FDF9F2] px-2.5 py-2 text-left text-ink shadow-[4px_5px_0_#151D3B] transition-transform active:translate-y-0.5 active:shadow-[2px_3px_0_#151D3B] disabled:cursor-wait disabled:opacity-80 sm:min-h-[92px] sm:gap-2.5 sm:px-3"
            >
              {pendingMethod === method ? (
                <Loader2 size={20} className="shrink-0 animate-spin" aria-hidden="true" />
              ) : price ? (
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                    method === "orange_money" ? "border border-[#E6DDC8] bg-white" : ""
                  }`}
                  aria-hidden="true"
                >
                  <Image
                    src={logo}
                    alt=""
                    width={44}
                    height={44}
                    className="h-full w-full rounded-full object-contain"
                  />
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col leading-tight">
                {pendingMethod === method
                  ? "Création du paiement…"
                  : isPending
                  ? "Patientez…"
                  : price
                  ? <>
                      <span className="text-[9px] font-semibold text-[#5B5640] sm:text-[10px]">{actionLabel}</span>
                      <span className="text-[13px] font-black sm:text-sm">{label}</span>
                      <span className="text-[11px] font-bold sm:text-xs">{price} F</span>
                    </>
                  : "Prix indisponible"}
              </span>
            </button>
          </form>
        ))}
      </div>
      {(isPending || !price) && (
        <p className="text-center text-xs font-medium text-[#5B5640]" role="status" aria-live="polite">
          {isPending
            ? "Préparation sécurisée du paiement, cela peut prendre quelques secondes. Ne fermez pas cette page."
            : "Le tarif ne peut pas être chargé. Actualisez la page pour réessayer."}
        </p>
      )}
    </>
  );
}
