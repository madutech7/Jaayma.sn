export default function ProduitsLoading() {
  const thumbnailColors = ["#FFC83D", "#F6C3D2", "#CFEFE6", "#DCE5FF"];

  return (
    <div
      role="status"
      aria-label="Chargement de vos produits..."
      className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-[70vh] animate-pulse"
    >
      <div className="space-y-6">
        {/* Header Squelette */}
        <div className="flex items-end justify-between mb-6">
          <div className="space-y-2">
            <div className="h-3.5 w-24 rounded-full bg-white/20" />
            <div className="h-10 w-44 rounded-2xl bg-white/25" />
          </div>
          <div className="h-10 w-28 rounded-full bg-[#FFC83D] border-[2.5px] border-ink shadow-[3px_3px_0_#0F1E3D]" />
        </div>

        {/* Barre de quota produits */}
        <div className="p-4 rounded-[16px] bg-[#16264D] border border-white/10 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-48 rounded-full bg-white/20" />
            <div className="h-3.5 w-16 rounded-full bg-[#FFC83D]/50" />
          </div>
          <div className="h-1.5 rounded-full bg-[#2A3B66] overflow-hidden">
            <div className="h-full w-2/5 rounded-full bg-[#FFC83D]" />
          </div>
        </div>

        {/* Liste des cartes produits néo-brutalistes en squelette */}
        <div className="space-y-3.5">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="p-3 rounded-[20px] border-[2.5px] border-ink bg-[#FFFBF2] flex items-center shadow-[3px_3px_0_#0F1E3D]"
            >
              {/* Image produit squelette colorée */}
              <div
                className="w-14 h-14 rounded-2xl shrink-0 mr-3.5 border-[2px] border-ink shadow-[2px_2px_0_#0F1E3D]"
                style={{ backgroundColor: thumbnailColors[item % thumbnailColors.length] }}
              />

              {/* Infos produit */}
              <div className="flex-1 space-y-2 min-w-0 pr-2">
                <div className="h-4 w-3/5 rounded-md bg-ink/25" />
                <div className="h-3.5 w-24 rounded-md bg-[#C8265A]/40" />
              </div>

              {/* Toggle statut squelette */}
              <div className="shrink-0 pl-3 border-l-2 border-ink/10">
                <div className="w-11 h-6 rounded-full bg-[#0E7C66]/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
