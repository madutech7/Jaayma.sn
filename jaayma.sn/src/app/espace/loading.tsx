export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement de votre tableau de bord..."
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-10 animate-pulse"
    >
      {/* ─── HERO BANNER SQUELETTE (JAUNE SOLEIL NÉO-BRUTALISTE) ─── */}
      <section className="overflow-hidden rounded-[26px] border-[2.5px] border-ink bg-[#FFC83D] shadow-[5px_5px_0_#0F1E3D] p-5 sm:p-7 lg:p-9">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-28 rounded-full border-2 border-ink bg-[#FFFBF2]/90" />
              <div className="h-4 w-32 rounded-full bg-ink/15" />
            </div>
            <div className="h-10 w-64 sm:w-80 rounded-2xl bg-ink/20" />
            <div className="h-4 w-72 sm:w-96 rounded-full bg-ink/15" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-36 rounded-full border-2 border-ink bg-[#FFFBF2]/80" />
            <div className="h-10 w-36 rounded-full border-[2.5px] border-ink bg-[#0F1E3D] shadow-[3px_3px_0_#0F1E3D]" />
          </div>
        </div>
      </section>

      {/* ─── 4 CARTES MÉTRIQUES NÉO-BRUTALISTES ─── */}
      <section aria-label="Indicateurs de la boutique" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Ventes encaissées", accent: "#FFC83D" },
          { label: "Commandes", accent: "#F6C3D2" },
          { label: "À traiter", accent: "#CFEFE6" },
          { label: "Produits en ligne", accent: "#DCE5FF" },
        ].map((stat, i) => (
          <article
            key={i}
            className="rounded-[22px] border-[2.5px] border-ink bg-[#FFFBF2] p-4 sm:p-5 shadow-[4px_4px_0_#0F1E3D]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 rounded-full bg-ink/20" />
                <div className="h-8 w-28 rounded-xl bg-ink/25" />
              </div>
              <div
                className="w-10 h-10 rounded-xl border-2 border-ink shrink-0"
                style={{ backgroundColor: stat.accent }}
              />
            </div>
            <div className="h-3 w-20 rounded-full bg-ink/15 mt-3" />
          </article>
        ))}
      </section>

      {/* ─── GRILLE ACTIVITÉ & COMMANDES ─── */}
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Carte graphique 7 jours */}
        <article className="rounded-[22px] border-[2.5px] border-ink bg-[#FFFBF2] p-5 sm:p-6 shadow-[4px_4px_0_#0F1E3D]">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded-full bg-[#C8265A]/30" />
              <div className="h-6 w-48 rounded-xl bg-ink/20" />
            </div>
            <div className="h-7 w-28 rounded-full border-2 border-ink bg-[#F4F0E7]" />
          </div>

          {/* Barres du graphe */}
          <div className="flex h-40 items-end gap-2 sm:gap-3">
            {[40, 65, 30, 85, 45, 95, 60].map((h, idx) => (
              <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex w-full flex-1 items-end overflow-hidden rounded-t-xl bg-[#F0EDE8]">
                  <div
                    className="w-full rounded-t-xl border-x border-t border-ink bg-[#CFEFE6]"
                    style={{ height: `${h}%` }}
                  />
                </div>
                <div className="h-3 w-4 rounded-full bg-ink/20" />
              </div>
            ))}
          </div>
        </article>

        {/* Carte commandes prioritaires */}
        <article className="rounded-[22px] border-[2.5px] border-ink bg-[#FFFBF2] p-5 sm:p-6 shadow-[4px_4px_0_#0F1E3D]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded-full bg-[#C8265A]/30" />
              <div className="h-6 w-40 rounded-xl bg-ink/20" />
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-ink bg-[#FFC83D]" />
          </div>

          <div className="divide-y divide-ink/10">
            {[1, 2, 3].map((order) => (
              <div key={order} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full border-2 border-ink bg-[#FFC83D]/60 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-28 rounded-md bg-ink/20" />
                    <div className="h-3.5 w-16 rounded-md bg-ink/25" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-2.5 w-20 rounded-md bg-ink/15" />
                    <div className="h-4 w-16 rounded-full bg-[#F6C3D2]/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
