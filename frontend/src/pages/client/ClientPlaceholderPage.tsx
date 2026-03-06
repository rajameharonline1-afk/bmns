import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children?: ReactNode;
};

const ClientPlaceholderPage = ({ title, subtitle, actions, children }: Props) => {
  return (
    <section className="space-y-4">
      <header className="ds-card p-4">
        <h2 className="text-2xl font-semibold text-[#324c62]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </header>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      <div className="ds-card p-4">{children}</div>
    </section>
  );
};

export default ClientPlaceholderPage;
