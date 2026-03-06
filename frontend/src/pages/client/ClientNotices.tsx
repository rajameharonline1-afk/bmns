import ClientPlaceholderPage from "./ClientPlaceholderPage";

const items = [
  { id: 1, title: "Scheduled maintenance", detail: "Core router maintenance at 2:00 AM.", date: "2026-03-05" },
  { id: 2, title: "Invoice reminder", detail: "Please pay your monthly bill before due date.", date: "2026-03-03" },
];

const ClientNotices = () => (
  <ClientPlaceholderPage title="Notices & Queries" subtitle="Read latest notices and send quick query.">
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[#1f4e6e]">{item.title}</h3>
            <span className="text-xs text-slate-500">{item.date}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
        </article>
      ))}
    </div>
  </ClientPlaceholderPage>
);

export default ClientNotices;
