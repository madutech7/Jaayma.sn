export default function ShopLoading() {
  return (
    <main
      className="min-h-screen animate-pulse bg-[#FFFBF2] pb-28"
      aria-busy="true"
      aria-label="Ouverture de la boutique"
    >
      <div className="bg-[#C8265A] px-5 pb-6 pt-4">
        <div className="mx-auto max-w-xl">
          <div className="h-10 w-10 rounded-full border-2 border-ink/20 bg-white/30" />
          <div className="mt-7 h-9 w-3/4 rounded-xl bg-white/25" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/20" />
          <div className="mt-5 flex gap-2">
            <div className="h-8 w-24 rounded-full bg-white/25" />
            <div className="h-8 w-32 rounded-full bg-white/25" />
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 px-4 pt-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border-[2.5px] border-ink bg-white p-2 shadow-[3px_3px_0_#0F1E3D]">
            <div className="h-40 rounded-xl bg-[#0F1E3D]/10" />
            <div className="mt-3 h-4 w-4/5 rounded bg-[#0F1E3D]/10" />
            <div className="mt-2 h-6 w-2/5 rounded bg-[#FFC83D]/45" />
          </div>
        ))}
      </div>
      <p className="fixed bottom-5 left-0 right-0 text-center text-xs font-bold text-[#3F4B69]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        Préparation de la boutique…
      </p>
    </main>
  );
}
