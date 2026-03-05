const ClientInvoices = () => {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Invoice History</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Recent billing</h2>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {["INV-4021", "INV-4019", "INV-4012"].map((invoice) => (
          <div key={invoice} className="flex items-center justify-between border-b border-white/10 py-4 text-sm">
            <div>
              <p className="text-white">{invoice}</p>
              <p className="text-xs text-slate-400">Paid • 10/10/26</p>
            </div>
            <p className="text-cyan-200">$39.00</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ClientInvoices;
