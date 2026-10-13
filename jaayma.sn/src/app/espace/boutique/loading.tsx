export default function BoutiqueLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement des paramètres de votre boutique..."
      className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-[70vh] animate-pulse"
    >
      <div className="space-y-6">
        {/* Header Squelette avec Avatar logo */}
        <div className="flex items-center gap-4 mb-10 mt-4">
          <div className="w-20 h-20 rounded-full border-[3px] border-ink bg-[#FFC83D]/50 shrink-0 shadow-[3px_3px_0_#0F1E3D]" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-8 w-48 rounded-xl bg-white/25" />
            <div className="h-4 w-60 rounded-full bg-[#FFC83D]/40" />
          </div>
        </div>

        {/* Champs de formulaire néo-brutalistes crème */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="h-3.5 w-32 rounded-full bg-white/20" />
            <div className="h-12 w-full rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
          </div>

          <div className="space-y-2">
            <div className="h-3.5 w-36 rounded-full bg-white/20" />
            <div className="h-12 w-full rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
          </div>

          {/* Photo de couverture squelette */}
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-36 rounded-full bg-white/20" />
            <div className="w-full aspect-[2.4/1] sm:aspect-[3/1] rounded-[22px] border-[2.5px] border-ink border-dashed bg-[#16264D] flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#FFC83D]/40 border-2 border-ink" />
              <div className="h-3 w-40 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Numéros paiement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded-full bg-white/20" />
              <div className="h-12 w-full rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded-full bg-white/20" />
              <div className="h-12 w-full rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
            </div>
          </div>

          {/* Bouton Enregistrer */}
          <div className="pt-4">
            <div className="h-14 w-full rounded-full border-[2.5px] border-ink bg-[#FFC83D] shadow-[4px_4px_0_#0F1E3D]" />
          </div>
        </div>
      </div>
    </div>
  );
}
