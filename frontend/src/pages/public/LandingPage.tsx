const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937,_#020617)] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/20 text-cyan-200">
            <span className="text-xl font-black">BM</span>
          </div>
          <div>
            <p className="text-lg font-semibold">BMNS Fiber</p>
            <p className="text-xs text-slate-300">Smart broadband operations</p>
          </div>
        </div>
        <a
          className="rounded-full border border-cyan-300/40 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400 hover:text-slate-900"
          href="/login"
        >
          Client Login
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-16">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Always-on fiber</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Billing, automation, and real-time network observability for modern ISPs.
            </h1>
            <p className="text-base text-slate-300">
              Offer smart plans, monitor OLTs and Mikrotiks live, and let customers pay on demand—all from a unified
              platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-900">
                Explore Packages
              </button>
              <button className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/80">
                Coverage Areas
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Coverage spotlight</p>
            <h2 className="mt-4 text-2xl font-semibold">Metro North + Riverline</h2>
            <p className="mt-2 text-sm text-slate-300">
              1200+ active ONUs monitored, 98.6% uptime, and 24/7 NOC response.
            </p>
            <div className="mt-6 grid gap-3 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Latency (avg)</span>
                <span className="text-cyan-200">8ms</span>
              </div>
              <div className="flex justify-between">
                <span>Packet loss</span>
                <span className="text-cyan-200">0.3%</span>
              </div>
              <div className="flex justify-between">
                <span>Fiber kilometers</span>
                <span className="text-cyan-200">420 km</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            { name: "Starter", speed: "50 Mbps", price: "$18/mo" },
            { name: "Growth", speed: "150 Mbps", price: "$39/mo" },
            { name: "Ultra", speed: "1 Gbps", price: "$89/mo" },
          ].map((plan) => (
            <div
              key={plan.name}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{plan.name}</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{plan.speed}</h3>
              <p className="mt-2 text-sm text-slate-300">Unlimited night data + priority support.</p>
              <p className="mt-6 text-3xl font-semibold text-cyan-200">{plan.price}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
