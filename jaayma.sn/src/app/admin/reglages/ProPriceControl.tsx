"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { setProSubscriptionPrice } from "@/app/actions/admin";
import { adminPanelClass } from "../AdminUI";

export default function ProPriceControl({ initialPrice }: { initialPrice: number }) {
  const [price, setPrice] = useState(String(initialPrice));
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const amount = Number(price);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000) {
      setError("Saisissez un montant entier entre 1 et 100 000 000 F.");
      setMessage(null);
      return;
    }

    setIsPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await setProSubscriptionPrice(amount);
      if ("error" in result) {
        setError(result.error);
      } else {
        setPrice(String(result.amount));
        setMessage("Le prix Pro a été mis à jour.");
      }
    } catch {
      setError("Impossible de modifier le prix Pro. Réessayez.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className={`${adminPanelClass()} mb-5 p-5 sm:p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bricolage text-lg font-black">Prix de la formule Pro</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
            Le nouveau montant sera affiché aux vendeurs et appliqué aux prochains paiements, pour 30 jours d’abonnement.
          </p>
        </div>
        <form onSubmit={savePrice} className="flex flex-col gap-2 sm:min-w-[310px]">
          <label htmlFor="pro-price" className="text-xs font-black text-ink">Montant mensuel (FCFA)</label>
          <div className="flex gap-2">
            <input
              id="pro-price"
              name="amount"
              type="number"
              inputMode="numeric"
              min={1}
              max={100_000_000}
              step={1}
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={isPending}
              className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-white px-3 py-2.5 text-sm font-black text-ink outline-none focus:ring-2 focus:ring-sun disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-sun px-4 text-xs font-black text-ink shadow-[2px_2px_0_#0F1E3D] transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-bold text-hibiscus">{error}</p>}
      {message && <p role="status" className="mt-3 text-xs font-bold text-baobab">{message}</p>}
    </section>
  );
}
