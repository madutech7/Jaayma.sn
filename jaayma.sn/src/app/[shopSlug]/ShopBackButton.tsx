"use client";

import { useRouter } from "next/navigation";

export default function ShopBackButton() {
  const router = useRouter();

  const handleBack = () => {
    const openedFromExplorerAt = Number(sessionStorage.getItem("jaayma:explorer-return") || 0);
    const hasExplorerHistory = openedFromExplorerAt > 0 && Date.now() - openedFromExplorerAt < 30 * 60 * 1000;
    sessionStorage.removeItem("jaayma:explorer-return");
    if (hasExplorerHistory && window.history.length > 1) {
      router.back();
    } else {
      router.push("/explorer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Retour à Explorer"
      className="flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-ink bg-white shadow-[2px_2px_0_#0F1E3D] transition-transform active:scale-90"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0F1E3D" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
