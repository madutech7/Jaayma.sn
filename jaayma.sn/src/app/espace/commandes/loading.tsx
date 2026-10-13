export default function CommandesLoading() {
  const avatarColors = ["#FFC83D", "#F6C3D2", "#CFEFE6", "#DCE5FF"];

  return (
    <div
      role="status"
      aria-label="Chargement de vos commandes..."
      className="p-5 max-w-xl mx-auto lg:max-w-2xl min-h-[70vh] animate-pulse"
    >
      <div className="space-y-6">
        {/* Header Squelette */}
        <div className="space-y-2">
          <div className="h-3.5 w-40 rounded-full bg-white/20" />
          <div className="h-10 w-52 rounded-2xl bg-white/25" />
        </div>

        {/* Filtres Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <div className="h-9 w-20 rounded-full border-[2px] border-ink bg-[#FFC83D]" />
          <div className="h-9 w-24 rounded-full border-[2px] border-[#3A4A75] bg-[#16264D]" />
          <div className="h-9 w-20 rounded-full border-[2px] border-[#3A4A75] bg-[#16264D]" />
        </div>

        {/* Liste des reçus squelettes avec dents de scie authentiques */}
        <div className="space-y-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="relative">
              {/* Dents haut */}
              <svg viewBox="0 0 344 18" preserveAspectRatio="none" style={{ width: "100%", height: 18, display: "block" }}>
                <path d="M0 18H344V0L334.6 9L325.1 0L315.7 9L306.3 0L296.9 9L287.4 0L278.0 9L268.6 0L259.1 9L249.7 0L240.3 9L230.9 0L221.4 9L212.0 0L202.6 9L193.1 0L183.7 9L174.3 0L164.9 9L155.4 0L146.0 9L136.6 0L127.1 9L117.7 0L108.3 9L98.9 0L89.4 9L80.0 0L70.6 9L61.0 0L51.8 9L42.5 0L33.2 9L23.4 0L14.0 9L4.6 0L0 9Z" fill="#FFFBF2" stroke="#0F1E3D" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>

              {/* Corps du ticket */}
              <div className="px-5 py-4 flex items-center gap-3 relative bg-[#FFFBF2]">
                {/* Badge tourné squelette */}
                <div className="absolute right-4 top-2">
                  <div className="h-4 w-16 rounded bg-[#C8265A]/20 border border-[#C8265A]/40 -rotate-3" />
                </div>

                {/* Avatar initiales stylisé */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-[2px] border-ink"
                  style={{ backgroundColor: avatarColors[item % avatarColors.length] }}
                />

                {/* Infos client et articles */}
                <div className="flex-1 min-w-0 pr-16 mt-2 space-y-2">
                  <div className="h-4 w-32 rounded-md bg-ink/25" />
                  <div className="h-3 w-44 rounded-md bg-ink/15" />
                </div>

                {/* Prix en bas à droite */}
                <div className="absolute right-5 bottom-4">
                  <div className="h-5 w-20 rounded-md bg-ink/25" />
                </div>
              </div>

              {/* Dents bas */}
              <svg viewBox="0 0 344 18" preserveAspectRatio="none" style={{ width: "100%", height: 18, display: "block" }}>
                <path d="M0 0H344V18L334.6 9L325.1 18L315.7 9L306.3 18L296.9 9L287.4 18L278.0 9L268.6 18L259.1 9L249.7 18L240.3 9L230.9 18L221.4 9L212.0 18L202.6 9L193.1 18L183.7 9L174.3 18L164.9 9L155.4 18L146.0 9L136.6 18L127.1 9L117.7 18L108.3 9L98.9 18L89.4 9L80.0 18L70.6 9L61.1 18L51.7 9L42.3 18L32.9 9L23.4 18L14.0 9L4.6 18L0 9Z" fill="#FFFBF2" stroke="#0F1E3D" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
