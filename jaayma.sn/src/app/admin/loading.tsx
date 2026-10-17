export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Chargement de l’administration" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-ink/10" />
        <div className="h-9 w-64 max-w-full rounded-lg bg-ink/10" />
        <div className="h-4 w-full max-w-xl rounded bg-ink/10" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-[22px] border-2 border-ink/10 bg-papier" />)}
      </div>
      <div className="h-72 rounded-[22px] border-2 border-ink/10 bg-papier" />
    </div>
  );
}
