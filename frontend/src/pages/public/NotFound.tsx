const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">404</p>
      <h2 className="text-3xl font-semibold">Page not found</h2>
      <a className="text-sm text-cyan-200" href="/">
        Back to home
      </a>
    </div>
  );
};

export default NotFound;
