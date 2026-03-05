import { useEffect, useState } from "react";

const ENV_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([ENV_BASE, `http://${host}:8001`, "http://localhost:8001", "http://127.0.0.1:8001"]));
})();

type LandingPayload = {
  home: {
    brand_name: string;
    brand_subtitle: string;
    hero_tagline: string;
    hero_title: string;
    hero_description: string;
    primary_cta_label: string;
    primary_cta_href: string;
    secondary_cta_label: string;
    secondary_cta_href: string;
    spotlight_title: string;
    spotlight_description: string;
  };
  metrics: Array<{ id: number; label: string; value: string }>;
  plans: Array<{ id: number; name: string; speed: string; description: string; price: string }>;
};

const defaultPayload: LandingPayload = {
  home: {
    brand_name: "BMNS Fiber",
    brand_subtitle: "Smart broadband operations",
    hero_tagline: "Always-on fiber",
    hero_title: "Billing, automation, and real-time network observability for modern ISPs.",
    hero_description: "Offer smart plans, monitor OLTs and Mikrotiks live, and let customers pay on demand-all from a unified platform.",
    primary_cta_label: "Explore Packages",
    primary_cta_href: "#plans",
    secondary_cta_label: "Coverage Areas",
    secondary_cta_href: "#coverage",
    spotlight_title: "Metro North + Riverline",
    spotlight_description: "1200+ active ONUs monitored, 98.6% uptime, and 24/7 NOC response.",
  },
  metrics: [
    { id: 1, label: "Latency (avg)", value: "8ms" },
    { id: 2, label: "Packet loss", value: "0.3%" },
    { id: 3, label: "Fiber kilometers", value: "420 km" },
  ],
  plans: [
    { id: 1, name: "Starter", speed: "50 Mbps", description: "Unlimited night data + priority support.", price: "18" },
    { id: 2, name: "Growth", speed: "150 Mbps", description: "Unlimited night data + priority support.", price: "39" },
    { id: 3, name: "Ultra", speed: "1 Gbps", description: "Unlimited night data + priority support.", price: "89" },
  ],
};

const LandingPage = () => {
  const [content, setContent] = useState<LandingPayload>(defaultPayload);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (const base of API_BASES) {
        if (!base) continue;
        try {
          const response = await fetch(`${base}/api/configuration/items/public/landing`, { cache: "no-store" });
          if (!response.ok) continue;
          const payload = (await response.json()) as LandingPayload;
          if (!cancelled) {
            setContent(payload);
          }
          return;
        } catch {
          // Try next base.
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const home = content.home;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937,_#020617)] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/20 text-cyan-200">
            <span className="text-xl font-black">BM</span>
          </div>
          <div>
            <p className="text-lg font-semibold">{home.brand_name}</p>
            <p className="text-xs text-slate-300">{home.brand_subtitle}</p>
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
        <section id="coverage" className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">{home.hero_tagline}</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{home.hero_title}</h1>
            <p className="text-base text-slate-300">{home.hero_description}</p>
            <div className="flex flex-wrap gap-4">
              <a href={home.primary_cta_href || "#plans"} className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-900">
                {home.primary_cta_label}
              </a>
              <a href={home.secondary_cta_href || "#coverage"} className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/80">
                {home.secondary_cta_label}
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Coverage spotlight</p>
            <h2 className="mt-4 text-2xl font-semibold">{home.spotlight_title}</h2>
            <p className="mt-2 text-sm text-slate-300">{home.spotlight_description}</p>
            <div className="mt-6 grid gap-3 text-xs text-slate-300">
              {content.metrics.map((metric) => (
                <div key={`${metric.id}-${metric.label}`} className="flex justify-between">
                  <span>{metric.label}</span>
                  <span className="text-cyan-200">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="grid gap-6 md:grid-cols-3">
          {content.plans.map((plan) => (
            <div key={`${plan.id}-${plan.name}`} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{plan.name}</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{plan.speed}</h3>
              <p className="mt-2 text-sm text-slate-300">{plan.description || "Unlimited night data + priority support."}</p>
              <p className="mt-6 text-3xl font-semibold text-cyan-200">${plan.price}/mo</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
