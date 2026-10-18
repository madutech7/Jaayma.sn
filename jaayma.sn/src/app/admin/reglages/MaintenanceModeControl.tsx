"use client";

import { useState } from "react";
import { Globe2, Loader2, ShieldAlert } from "lucide-react";
import { setMaintenanceEnabled } from "@/app/actions/admin";

export default function MaintenanceModeControl({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleMaintenance() {
    if (isPending) return;

    const nextEnabled = !enabled;
    if (nextEnabled && !window.confirm("Activer le mode maintenance ? Les visiteurs verront une page d’information jusqu’à la réouverture du site.")) return;

    setIsPending(true);
    setError(null);
    const result = await setMaintenanceEnabled(nextEnabled);
    if (result.success) {
      setEnabled(nextEnabled);
    } else {
      setError(result.error || "Impossible de modifier le mode maintenance.");
    }
    setIsPending(false);
  }

  return (
    <section className={`mb-5 flex flex-col gap-4 rounded-[22px] border-[2.5px] border-ink p-5 text-ink shadow-[4px_4px_0_#0F1E3D] sm:flex-row sm:items-center sm:justify-between sm:p-6 ${enabled ? "bg-[#FFF2F2]" : "bg-papier"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/10 ${enabled ? "bg-hibiscus/10 text-hibiscus" : "bg-baobab/10 text-baobab"}`}>
          {enabled ? <ShieldAlert size={18} /> : <Globe2 size={18} />}
        </span>
        <div>
          <h2 className="font-bricolage text-lg font-black">Mode maintenance</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
            {enabled
              ? "Le site public affiche une page de maintenance. L’administration reste accessible pour rétablir le service."
              : "Le site est ouvert aux visiteurs. Activez ce mode en cas d’intervention ou d’incident."}
          </p>
          {error && <p role="alert" className="mt-2 text-xs font-bold text-hibiscus">{error}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className={`text-xs font-black ${enabled ? "text-hibiscus" : "text-baobab"}`}>
          {isPending ? "Enregistrement…" : enabled ? "Maintenance active" : "Site ouvert"}
        </span>
        <button
          type="button"
          onClick={toggleMaintenance}
          disabled={isPending}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-ink px-4 py-2 text-xs font-black shadow-[2px_2px_0_#0F1E3D] transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70 ${enabled ? "bg-baobab text-white" : "bg-hibiscus text-white"}`}
        >
          {isPending ? <Loader2 size={15} className="animate-spin" /> : enabled ? <Globe2 size={15} /> : <ShieldAlert size={15} />}
          {enabled ? "Rétablir le site" : "Activer la maintenance"}
        </button>
      </div>
    </section>
  );
}
