import ClientPlaceholderPage from "./ClientPlaceholderPage";

const ClientSupportTickets = () => (
  <ClientPlaceholderPage title="Support Tickets" subtitle="Create and track your support tickets.">
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
        <h3 className="text-sm font-semibold text-[#1f4e6e]">Open Ticket</h3>
        <p className="mt-1 text-sm text-slate-600">No open ticket found.</p>
      </div>
      <div className="rounded-md border border-[#d6dee8] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#1f4e6e]">New Ticket</h3>
        <textarea rows={4} className="mt-2 w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" placeholder="Write issue details" />
        <button className="mt-3 rounded-md bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white">Submit</button>
      </div>
    </div>
  </ClientPlaceholderPage>
);

export default ClientSupportTickets;
