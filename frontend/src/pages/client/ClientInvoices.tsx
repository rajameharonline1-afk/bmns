import ClientPlaceholderPage from "./ClientPlaceholderPage";

const rows = [
  { invoice: "INV-4021", date: "2026-03-01", amount: "TK 500.00", status: "Paid" },
  { invoice: "INV-4019", date: "2026-02-01", amount: "TK 500.00", status: "Paid" },
  { invoice: "INV-4012", date: "2026-01-01", amount: "TK 500.00", status: "Due" },
];

const ClientInvoices = () => {
  return (
    <ClientPlaceholderPage title="Payment History" subtitle="Track your previous bill payments and pending invoices.">
      <div className="overflow-hidden rounded-md border border-[#d6dee8]">
        <table className="ds-table w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.invoice}>
                <td className="px-3 py-2">{row.invoice}</td>
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2 font-semibold text-[#1f4e6e]">{row.amount}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ClientPlaceholderPage>
  );
};

export default ClientInvoices;
