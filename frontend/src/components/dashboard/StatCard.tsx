import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
  tone: "teal" | "blue" | "purple" | "slate" | "green" | "red" | "orange";
  icon: ReactNode;
  size?: "normal" | "compact";
};

const toneStyles: Record<StatCardProps["tone"], string> = {
  teal: "bg-[#1ea7c9]",
  blue: "bg-[#1f88d8]",
  purple: "bg-[#7b55dd]",
  slate: "bg-[#5c6b78]",
  green: "bg-[#22b38f]",
  red: "bg-[#e8584b]",
  orange: "bg-[#f19a1b]"
};

export default function StatCard({ title, value, subtitle, tone, icon, size = "normal" }: StatCardProps) {
  const sizeClass = size === "compact" ? "min-h-[80px] px-3 py-2 text-[10px]" : "min-h-[96px] px-3 py-3 text-[11px]";

  return (
    <div className={`rounded-md ${toneStyles[tone]} ${sizeClass} text-white shadow-[0_6px_14px_rgba(15,23,42,0.18)]`}>
      <div className="flex items-start gap-2.5">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-white/25 text-[16px] shadow-inner">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold uppercase tracking-wide text-white/95">{title}</div>
          <div className="mt-1 text-[18px] font-extrabold leading-none">{value}</div>
          <div className="mt-1 text-[10px] leading-snug text-white/95">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
