export default function AbonnementLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement de vos formules d'abonnement..."
      className="min-h-screen animate-pulse bg-[#0F1E3D] p-5 pb-28"
    >
      <div className="mx-auto max-w-xl space-y-5 lg:max-w-2xl">
        {/* Header Squelette */}
        <div className="space-y-2 mt-4 mb-8">
          <div className="h-3.5 w-24 rounded-full bg-white/20" />
          <div className="h-10 w-48 rounded-2xl bg-white/25" />
        </div>

        {/* Carte Offre Gratuite (Crème néo-brutaliste) */}
        <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border-[2.5px] border-ink bg-[#FFFBF2] p-6">
          <div className="w-16 h-16 rounded-full border-[2.5px] border-ink bg-white shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-32 rounded-lg bg-ink/25" />
            <div className="h-3.5 w-4/5 rounded bg-ink/15" />
          </div>
        </div>

        {/* Formules Pro et Pro+ dans le style des cartes de paiement */}
        {[4, 5].map((benefitCount) => (
          <div key={benefitCount} className="space-y-4 rounded-[2rem] bg-[#EFCC6E] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 rounded-full border-[2.5px] border-ink bg-[#FDF9F2] sm:h-16 sm:w-16" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-6 w-40 max-w-full rounded-lg bg-ink/25" />
                <div className="h-4 w-44 max-w-full rounded bg-ink/15" />
              </div>
            </div>

            <div className="space-y-3 border-t border-ink/15 pt-4">
              {Array.from({ length: benefitCount }, (_, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-ink/20" />
                  <div className={`h-4 rounded bg-ink/20 ${index === 3 ? "w-4/5" : "w-3/4"}`} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-ink/15 pt-4">
              {[1, 2].map((method) => (
                <div
                  key={method}
                  className="flex min-h-[84px] items-center gap-2 rounded-full border-[2.5px] border-ink bg-[#FDF9F2] px-3 shadow-[4px_5px_0_#151D3B]"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-ink/10" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-2.5 w-14 rounded bg-ink/15" />
                    <div className="h-3.5 w-20 max-w-full rounded bg-ink/25" />
                    <div className="h-3 w-12 rounded bg-ink/20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
