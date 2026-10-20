import { ReactNode } from "react";
import EspaceNav from "./_components/EspaceNav";
import RefreshOnResume from "./_components/RefreshOnResume";

export default function EspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100svh] overflow-x-clip bg-[#0F1E3D] text-white">
      <RefreshOnResume />
      <EspaceNav />
      <main className="lg:pl-72 pb-32 pt-2 lg:pb-12 lg:pt-4">
        {children}
      </main>
    </div>
  );
}
