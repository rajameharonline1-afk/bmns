const ClientPayBill = () => {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Pay Bill</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Settle your invoice</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase text-slate-400">Amount due</p>
          <p className="mt-4 text-3xl font-semibold text-white">$39.00</p>
          <button className="mt-6 w-full rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-900">
            Pay with Wallet
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase text-slate-400">Payment options</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <button className="rounded-xl border border-white/10 px-4 py-3 text-left">Card / Mobile Money</button>
            <button className="rounded-xl border border-white/10 px-4 py-3 text-left">Bank Transfer</button>
            <button className="rounded-xl border border-white/10 px-4 py-3 text-left">USSD</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientPayBill;
