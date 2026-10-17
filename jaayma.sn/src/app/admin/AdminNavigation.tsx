"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Settings2,
  ShoppingBag,
  Users,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/admin/boutiques", label: "Boutiques", icon: Boxes },
  { href: "/admin/comptes", label: "Comptes vendeurs", icon: Users },
  { href: "/admin/abonnements", label: "Abonnements Pro", icon: CreditCard },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/reglages", label: "Réglages", icon: Settings2 },
];

export default function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation administration" className={mobile ? "flex min-w-max gap-1 px-4 py-2.5" : "space-y-1"}>
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl text-sm font-bold transition-colors ${mobile ? "px-3.5 py-2.5" : "px-3 py-3"} ${active ? "bg-sun text-ink shadow-[3px_3px_0_#000]" : "text-ghost hover:bg-white/[0.07] hover:text-white"}`}
          >
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
