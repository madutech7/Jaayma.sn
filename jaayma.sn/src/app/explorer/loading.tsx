export default function ExplorerLoading() {
  return (
    <main className="min-h-screen px-5 pb-28 pt-6" style={{ backgroundColor: "#FFC83D" }} aria-busy="true" aria-label="Ouverture d’Explorer">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-[#0F1E3D]/20" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#0F1E3D]/20" />
        </div>
        <div className="mb-2 h-10 w-4/5 animate-pulse rounded-xl bg-[#0F1E3D]/15" />
        <div className="mb-6 h-10 w-3/5 animate-pulse rounded-xl bg-[#0F1E3D]/15" />
        <div className="mb-6 h-14 animate-pulse rounded-full border-2 border-ink/10 bg-white/70" />
        <div className="mb-6 flex gap-2">
          <div className="h-10 w-1/2 animate-pulse rounded-full bg-[#0F1E3D]/15" />
          <div className="h-10 w-1/2 animate-pulse rounded-full bg-[#0F1E3D]/15" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2] p-2 shadow-[3px_3px_0_#0F1E3D]">
              <div className="h-36 animate-pulse rounded-xl bg-[#0F1E3D]/10" />
              <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-[#0F1E3D]/10" />
              <div className="mt-2 h-6 w-2/5 animate-pulse rounded bg-[#0F1E3D]/10" />
            </div>
          ))}
        </div>
      </div>
      <p className="fixed bottom-7 left-0 right-0 text-center text-xs font-bold text-[#0F1E3D]/70" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>Préparation de ta sélection…</p>
    </main>
  );
}
