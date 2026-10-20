import { Crown } from "lucide-react";

type ProBadgeProps = {
  variant?: "dark" | "light";
  compact?: boolean;
  className?: string;
};

export default function ProBadge({
  variant = "light",
  compact = false,
  className = "",
}: ProBadgeProps) {
  const variantClasses = variant === "dark"
    ? "border-[#F5CF67]/70 bg-[#0F1E3D]/90 text-[#FFE8A3] shadow-[0_3px_12px_rgba(15,30,61,0.3)]"
    : "border-[#D4AA3B]/65 bg-gradient-to-b from-[#FFF9E8] to-[#FCE8AB] text-[#594000] shadow-[0_2px_7px_rgba(15,30,61,0.12)]";
  const emblemClasses = variant === "dark"
    ? "bg-[#FFC83D] text-[#0F1E3D]"
    : "bg-[#E9C96B]/45 text-[#725300]";

  return (
    <span
      role="img"
      aria-label="Boutique Pro Jaaymaa"
      title="Boutique au plan Pro actif"
      className={`inline-flex shrink-0 items-center rounded-full border font-black uppercase ${variantClasses} ${compact ? "gap-1 px-1.5 py-0.5 text-[8px] tracking-[0.12em]" : "gap-1.5 px-2.5 py-1 text-[9px] tracking-[0.16em]"} ${className}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-full ${emblemClasses} ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}>
        <Crown size={compact ? 9 : 10} strokeWidth={2.7} aria-hidden="true" />
      </span>
      <span>{compact ? "PRO" : "BOUTIQUE PRO"}</span>
    </span>
  );
}
