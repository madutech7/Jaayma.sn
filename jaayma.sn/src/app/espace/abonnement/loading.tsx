export default function AbonnementLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement de vos formules d'abonnement..."
      className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-[70vh] animate-pulse"
    >
      <div className="space-y-6">
        {/* Header Squelette */}
        <div className="space-y-2 mt-4 mb-8">
          <div className="h-3.5 w-24 rounded-full bg-white/20" />
          <div className="h-10 w-48 rounded-2xl bg-white/25" />
        </div>

        {/* Carte Offre Gratuite (Crème néo-brutaliste) */}
        <div className="p-6 rounded-3xl border-[2.5px] border-ink bg-[#FFFBF2] flex items-center gap-4 shadow-[3px_3px_0_#0F1E3D]">
          <div className="w-16 h-16 rounded-full border-[2.5px] border-ink bg-white shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-32 rounded-lg bg-ink/25" />
            <div className="h-3.5 w-4/5 rounded bg-ink/15" />
          </div>
        </div>

        {/* Carte Offre Pro (Or jaune néo-brutaliste) */}
        <div className="p-6 rounded-3xl border-[2.5px] border-ink bg-[#FFC83D] space-y-6 shadow-[3px_3px_0_#0F1E3D]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-[2.5px] border-ink bg-white shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-40 rounded-lg bg-ink/25" />
              <div className="h-3.5 w-36 rounded bg-ink/15" />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-ink/15">
            {[1, 2, 3].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-ink bg-white shrink-0" />
                <div className="h-4 w-3/4 rounded bg-ink/20" />
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="h-14 w-full rounded-full border-[2.5px] border-ink bg-[#0F1E3D] shadow-[3px_3px_0_#0F1E3D]" />
          </div>
        </div>
      </div>
    </div>
  );
}
