import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Maintenance en cours",
  description: "Jaayma sera de retour très bientôt. Merci pour votre patience.",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const features = await api.getPublicFeatures().catch(() => ({
    explorerEnabled: true,
    maintenanceEnabled: true,
  }));
  if (!features.maintenanceEnabled) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#F3F5FA] px-5 py-12 text-[#0F1E3D]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#0E7C66]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#FFC83D]/20 blur-3xl" aria-hidden="true" />

      <section className="relative w-full max-w-xl rounded-[28px] border-[2.5px] border-[#0F1E3D] bg-white p-7 text-center shadow-[7px_7px_0_#0F1E3D] sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#0F1E3D] bg-[#FFC83D] shadow-[3px_3px_0_#0F1E3D]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 8v4l2.5 2.5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#0E7C66]">Jaayma · Intervention en cours</p>
        <h1 className="mt-3 font-bricolage text-3xl font-black leading-tight sm:text-4xl">Nous revenons très bientôt.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#526079] sm:text-base">
          Notre site fait l’objet d’une courte maintenance afin de vous offrir un service fiable et sécurisé.
          Veuillez nous excuser pour cette interruption et merci de votre patience.
        </p>
        <div className="mx-auto mt-7 flex max-w-sm items-center justify-center gap-2 rounded-2xl border border-[#0E7C66]/15 bg-[#0E7C66]/[0.05] px-4 py-3 text-xs font-bold text-[#0E7C66]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#0E7C66]" aria-hidden="true" />
          Nos équipes travaillent au rétablissement du service.
        </div>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#0F1E3D] bg-[#FFC83D] px-6 py-3 text-sm font-black shadow-[3px_3px_0_#0F1E3D] transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Réessayer
        </Link>
      </section>
    </main>
  );
}
