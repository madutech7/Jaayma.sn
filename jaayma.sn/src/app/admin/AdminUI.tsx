import type { ReactNode } from "react";
import Link from "next/link";

export function AdminPageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sun">{eyebrow}</p>
        <h1 className="mt-1 font-bricolage text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ghost">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  noun,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  noun: string;
  hrefForPage: (page: number) => string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-ghost">{total === 0 ? "Aucun résultat" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} sur ${total}`} {noun}</p>
      <div className="flex items-center gap-2">
        <Link aria-disabled={page <= 1} href={hrefForPage(Math.max(1, page - 1))} className={`rounded-lg border border-white/10 px-3 py-2 text-xs font-bold ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-white/10"}`}>Précédent</Link>
        <span className="px-2 text-xs font-bold text-ghost">Page {page} / {totalPages}</span>
        <Link aria-disabled={page >= totalPages} href={hrefForPage(Math.min(totalPages, page + 1))} className={`rounded-lg border border-white/10 px-3 py-2 text-xs font-bold ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-white/10"}`}>Suivant</Link>
      </div>
    </div>
  );
}

export function AdminError({ message }: { message: string }) {
  return <div className="rounded-2xl border border-hibiscus/30 bg-hibiscus/10 p-5 text-sm leading-6 text-[#FFD0DA]">{message}</div>;
}

export function adminPanelClass() {
  return "rounded-[22px] border-2 border-white/10 bg-[#142447] shadow-[0_12px_35px_rgba(0,0,0,0.14)]";
}
