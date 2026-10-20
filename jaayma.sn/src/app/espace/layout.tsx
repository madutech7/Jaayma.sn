import { ReactNode } from "react";
import EspaceNav from "./_components/EspaceNav";
import RefreshOnResume from "./_components/RefreshOnResume";

export default function EspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F1E3D] text-white">
      <RefreshOnResume />
      <EspaceNav />
      <main className="lg:pl-72 min-h-screen pb-32 lg:pb-12 pt-2 lg:pt-4">
        {children}
      </main>
    </div>
  );
}
