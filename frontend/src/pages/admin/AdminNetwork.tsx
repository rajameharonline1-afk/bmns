const AdminNetwork = () => {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Device Monitor</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-800">
          <i className="fa-solid fa-network-wired mr-2" /> OLT & Mikrotik status
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {["OLT-01", "OLT-02", "Mikrotik-Core", "Mikrotik-Edge"].map((device) => (
          <div key={device} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-slate-800">
                <i className="fa-solid fa-server mr-2 text-slate-500" /> {device}
              </p>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-600">
                <i className="fa-solid fa-circle-check mr-2" /> Online
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">SNMP active • 2 alarms</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminNetwork;
