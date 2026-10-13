"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutSeller } from "../../actions/auth";

const NAV = [
  {
    name: "Accueil",
    mobileName: "Accueil",
    href: "/espace",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    name: "Produits",
    mobileName: "Produits",
    href: "/espace/produits",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
  {
    name: "Commandes",
    mobileName: "Commandes",
    href: "/espace/commandes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    name: "Ma boutique",
    mobileName: "Boutique",
    href: "/espace/boutique",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 1 0 21 12h-1" />
      </svg>
    ),
  },
  {
    name: "Abonnement",
    mobileName: "Plan",
    href: "/espace/abonnement",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sun"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 120 120" fill="none">
        <path d="M38 4H82A34 34 0 0 1 116 38V82A34 34 0 0 1 82 116H10A6 6 0 0 1 4 110V38A34 34 0 0 1 38 4Z" fill="#0F1E3D" />
        <path d="M64 46V76C64 90 57 97 44 97" stroke="#FFC83D" strokeWidth="12" strokeLinecap="round" />
        <circle cx="64" cy="28" r="7.5" fill="#C8265A" />
      </svg>
    </span>
  );
}

export default function EspaceNav() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/espace") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <aside className="fixed bottom-6 left-6 top-6 z-40 hidden w-64 flex-col justify-between rounded-[26px] border-[2.5px] border-ink bg-[#FFFBF2] p-4 text-ink shadow-[5px_5px_0_#0F1E3D] lg:flex">
        <div>
          <Link href="/espace" className="mb-7 flex items-center gap-3 rounded-2xl px-2 py-2">
            <LogoMark size={42} />
            <span>
              <span className="block font-bricolage text-lg font-black leading-tight tracking-tight">Jaayma</span>
              <span className="mt-1 block text-[11px] font-semibold text-[#65708A]">Espace vendeur</span>
            </span>
          </Link>

          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#8991A4]">
            Gérer mon activité
          </p>
          <nav aria-label="Navigation espace vendeur" className="space-y-1.5">
            {NAV.map((item) => {
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-colors ${
                    active
                      ? "border-ink bg-sun text-ink shadow-[3px_3px_0_#0F1E3D]"
                      : "border-transparent text-[#3F4B69] hover:border-ink/10 hover:bg-white"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#C8265A]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-ink/15 pt-3">
          <Link
            href="/"
            prefetch={true}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[#3F4B69] transition-colors hover:bg-white hover:text-ink"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
            Voir le site Jaayma
          </Link>
          <form action={logoutSeller}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[#3F4B69] transition-colors hover:bg-[#F6C3D2]/40 hover:text-[#8C1C41]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-2 z-40 mx-auto max-w-5xl px-3 lg:hidden">
        <div className="flex items-center justify-between rounded-full border-[2.5px] border-ink bg-[#FFFBF2] px-3 py-2.5 text-ink shadow-[3px_3px_0_#0F1E3D]">
          <Link href="/espace" prefetch={true} className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span>
              <span className="block font-bricolage text-sm font-black leading-tight">Jaayma</span>
              <span className="block text-[10px] font-semibold text-[#65708A]">Espace vendeur</span>
            </span>
          </Link>
          <form action={logoutSeller}>
            <button
              type="submit"
              className="rounded-full border-2 border-ink px-3 py-1.5 text-[11px] font-black text-[#3F4B69] transition-colors hover:bg-[#F6C3D2]"
            >
              Quitter
            </button>
          </form>
        </div>
      </header>

      <nav
        aria-label="Navigation espace vendeur"
        className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 lg:hidden"
      >
        <div className="flex items-center justify-between rounded-full border-[2.5px] border-ink bg-[#FFFBF2] p-1.5 text-ink shadow-[4px_4px_0_#0F1E3D]">
          {NAV.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                aria-label={item.name}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-full transition-colors ${
                  active
                    ? "border-2 border-ink bg-sun px-3 py-2 text-ink"
                    : "p-2.5 text-[#65708A] hover:bg-white hover:text-ink"
                }`}
              >
                {item.icon}
                {active && <span className="font-bricolage text-[10px] font-black leading-none whitespace-nowrap">{item.mobileName}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
