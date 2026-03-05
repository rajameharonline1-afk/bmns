const ClientDashboard = () => {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">My Service</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Current package & signals</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase text-slate-400">Package</p>
          <p className="mt-4 text-2xl font-semibold text-white">Fiber Growth</p>
          <p className="text-sm text-slate-300">150 Mbps • Unlimited</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase text-slate-400">Expiry</p>
          <p className="mt-4 text-2xl font-semibold text-white">12 Nov 2026</p>
          <p className="text-sm text-slate-300">Auto-renew enabled</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase text-slate-400">ONU signal</p>
          <p className="mt-4 text-2xl font-semibold text-emerald-200">-18.2 dBm</p>
          <p className="text-sm text-slate-300">Stable</p>
        </div>
      </div>
    </section>
  );
};

export default ClientDashboard;
