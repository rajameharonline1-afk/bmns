import ClientPlaceholderPage from "./ClientPlaceholderPage";

const ClientPayBill = () => {
  return (
    <ClientPlaceholderPage
      title="Recharge/Pay Bill"
      subtitle="Pay your due bill and submit recharge from the client panel."
      actions={
        <>
          <button className="rounded-md bg-[#0f7fbc] px-4 py-2 text-sm font-semibold text-white">Pay with bKash</button>
          <button className="rounded-md bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white">Pay with Nagad</button>
          <button className="rounded-md border border-[#d6dee8] bg-white px-4 py-2 text-sm font-semibold text-slate-700">Bank Transfer</button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Due</p>
          <p className="mt-2 text-3xl font-bold text-[#1f4e6e]">TK 500.00</p>
          <p className="mt-1 text-sm text-slate-500">Due date: 10 March 2026</p>
        </div>
        <div className="rounded-md border border-[#d6dee8] bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
          <input className="mb-3 w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" defaultValue="500" />
          <label className="mb-1 block text-sm font-medium text-slate-700">Reference (optional)</label>
          <input className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" placeholder="Transaction ID" />
        </div>
      </div>
    </ClientPlaceholderPage>
  );
};

export default ClientPayBill;
