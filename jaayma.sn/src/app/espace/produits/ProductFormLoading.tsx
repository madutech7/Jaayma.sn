export default function ProductFormLoading({ mode }: { mode: "create" | "edit" }) {
  const isEditing = mode === "edit";

  return (
    <div
      role="status"
      aria-label={isEditing ? "Chargement du produit à modifier..." : "Chargement du formulaire produit..."}
      className="mx-auto min-h-screen w-full max-w-xl animate-pulse p-5 pb-24 lg:max-w-2xl"
      style={{ backgroundColor: "#0F1E3D" }}
    >
      <div className="mb-8 mt-2 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full border-[2.5px] border-ink bg-white" />
        <div className="h-7 min-w-0 flex-1 rounded-xl bg-white/20" />
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border-2 border-dashed border-white/20 bg-[#16264D]/60 p-4">
          <div className="mb-3 h-4 w-36 rounded bg-white/20" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 w-20 shrink-0 rounded-xl border-2 border-ink bg-white/10" />
            ))}
          </div>
          <div className="mt-3 h-3 w-48 max-w-full rounded bg-white/10" />
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-white/20" />
            <div className="h-12 rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1].map((field) => (
              <div key={field} className="space-y-2">
                <div className="h-3 w-36 max-w-full rounded bg-white/20" />
                <div className="h-12 rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="h-3 w-36 rounded bg-white/20" />
            <div className="h-28 rounded-2xl border-[2.5px] border-ink bg-[#FFFBF2]" />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#16264D]/45 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 w-36 rounded bg-white/20" />
            <div className="h-9 w-24 rounded-xl border border-white/10 bg-white/5" />
          </div>
          <div className="h-11 rounded-xl border border-white/10 bg-[#0F1E3D]/60" />
        </section>

        <div className="flex items-center justify-between py-2">
          <div className="h-4 w-32 rounded bg-white/20" />
          <div className="h-6 w-11 rounded-full bg-[#0E7C66]/30" />
        </div>

        <div className="space-y-3 pt-2">
          <div className="h-14 rounded-full border-[2.5px] border-ink bg-[#FFC83D] shadow-[4px_4px_0_#0F1E3D]" />
          {isEditing && <div className="h-12 rounded-full border-[2.5px] border-[#C8265A]/40 bg-[#C8265A]/10" />}
        </div>
      </div>
    </div>
  );
}
