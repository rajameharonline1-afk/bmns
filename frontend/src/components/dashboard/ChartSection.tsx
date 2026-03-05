import type { ReactNode } from "react";

type ChartSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export default function ChartSection({ title, children, className = "" }: ChartSectionProps) {
  return (
    <section className={`rounded-md border border-[#c8d0d7] bg-white ${className}`}>
      <div className="border-b border-[#c8d0d7] px-3 py-2 text-[12px] font-bold text-[#233749]">{title}</div>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}
