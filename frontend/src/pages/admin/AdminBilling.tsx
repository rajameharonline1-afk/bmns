const AdminBilling = () => {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Billing Overview</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-800">
          <i className="fa-solid fa-file-invoice-dollar mr-2" /> Collections & revenue
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-400">
            <i className="fa-solid fa-triangle-exclamation mr-2" /> Invoices due
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-800">124</p>
          <p className="text-sm text-slate-500">$12,430 outstanding</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-400">
            <i className="fa-solid fa-circle-check mr-2" /> Payments today
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-800">$4,980</p>
          <p className="text-sm text-slate-500">+18% vs yesterday</p>
        </div>
      </div>
    </section>
  );
};

export default AdminBilling;
