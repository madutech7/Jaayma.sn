function TicketEdge({ position }: { position: "top" | "bottom" }) {
  const topPath = "M0 18H344V0L334.6 9L325.1 0L315.7 9L306.3 0L296.9 9L287.4 0L278 9L268.6 0L259.1 9L249.7 0L240.3 9L230.9 0L221.4 9L212 0L202.6 9L193.1 0L183.7 9L174.3 0L164.9 9L155.4 0L146 9L136.6 0L127.1 9L117.7 0L108.3 9L98.9 0L89.4 9L80 0L70.6 9L61 0L51.8 9L42.5 0L33.2 9L23.4 0L14 9L4.6 0L0 9Z";
  const bottomPath = "M0 0H344V18L334.6 9L325.1 18L315.7 9L306.3 18L296.9 9L287.4 18L278 9L268.6 18L259.1 9L249.7 18L240.3 9L230.9 18L221.4 9L212 18L202.6 9L193.1 18L183.7 9L174.3 18L164.9 9L155.4 18L146 9L136.6 18L127.1 9L117.7 18L108.3 9L98.9 18L89.4 9L80 18L70.6 9L61.1 18L51.7 9L42.3 18L32.9 9L23.4 18L14 9L4.6 18L0 9Z";

  return (
    <svg viewBox="0 0 344 18" preserveAspectRatio="none" className="block h-[18px] w-full" aria-hidden="true">
      <path
        d={position === "top" ? topPath : bottomPath}
        fill="#FFFBF2"
        stroke="#0F1E3D"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function OrderDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Chargement du détail de la commande..."
      className="mx-auto min-h-screen w-full max-w-xl animate-pulse p-5 lg:max-w-2xl"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full border-[2px] border-ink bg-white" />
        <div className="h-6 min-w-0 flex-1 rounded-lg bg-white/20" />
        <div className="h-6 w-20 shrink-0 rounded border-2 border-[#C8265A]/30 bg-[#C8265A]/10" />
      </div>

      <div className="relative">
        <TicketEdge position="top" />
        <div className="space-y-4 bg-[#FFFBF2] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 rounded-full border-2 border-ink bg-[#FFC83D]/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-36 max-w-full rounded-md bg-ink/20" />
              <div className="h-3 w-28 rounded-md bg-ink/10" />
            </div>
            <div className="flex shrink-0 gap-2">
              <div className="h-10 w-10 rounded-full border-2 border-ink bg-[#FFC83D]/60" />
              <div className="h-10 w-10 rounded-full border-2 border-ink bg-[#0E7C66]/30" />
            </div>
          </div>

          <div className="border-b border-dashed border-ink/20" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-ink/15" />
            <div className="h-4 w-4/5 rounded bg-ink/20" />
          </div>
          <div className="border-b border-dashed border-ink/20" />

          <div className="space-y-3">
            {[0, 1].map((item) => (
              <div key={item} className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-ink/20" />
                  {item === 0 && <div className="h-3 w-24 rounded bg-ink/10" />}
                </div>
                <div className="h-4 w-20 shrink-0 rounded bg-ink/20" />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-20 rounded bg-ink/15" />
              <div className="h-4 w-16 rounded bg-ink/15" />
            </div>
          </div>

          <div className="border-b border-dashed border-ink/20" />
          <div className="flex items-end justify-between gap-4">
            <div className="h-5 w-16 rounded bg-ink/20" />
            <div className="h-8 w-32 rounded-lg bg-ink/25" />
          </div>
          <div className="border-b border-dashed border-ink/20" />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-ink/15" />
              <div className="h-4 w-32 rounded bg-ink/20" />
            </div>
            <div className="h-7 w-24 rounded border-2 border-[#C8265A]/30 bg-[#C8265A]/10" />
          </div>
        </div>
        <TicketEdge position="bottom" />
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-14 w-full rounded-full border-[2.5px] border-ink bg-[#FFC83D] shadow-[4px_4px_0_#0F1E3D]" />
        <div className="h-14 w-full rounded-full border-[2.5px] border-ink bg-white/10" />
      </div>
    </div>
  );
}
