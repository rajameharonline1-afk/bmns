const Forbidden = () => {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-10">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Access denied</p>
      <h2 className="text-3xl font-semibold text-white">You do not have permission.</h2>
      <p className="text-sm text-slate-300">Switch role or contact your administrator.</p>
    </div>
  );
};

export default Forbidden;
