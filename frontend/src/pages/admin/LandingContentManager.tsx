import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";

const ENV_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([ENV_BASE, `http://${host}:8001`, "http://localhost:8001", "http://127.0.0.1:8001"]));
})();

const request = async (path: string, options?: RequestInit) => {
  let lastError: unknown = null;
  for (const base of API_BASES) {
    if (!base) continue;
    try {
      const response = await fetch(`${base}${path}`, options);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      if (response.status === 204) return null;
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
};

type HomeContent = {
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

type ConfigItem = {
  id: number;
  name: string;
  details: string | null;
  package_type: string | null;
  price: string | null;
};

type ListResponse = {
  items: ConfigItem[];
};

const defaultHome: HomeContent = {
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
};

export default function LandingContentManager() {
  const { token } = useAuth();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [loading, setLoading] = useState(true);
  const [savingHome, setSavingHome] = useState(false);
  const [homeId, setHomeId] = useState<number | null>(null);
  const [home, setHome] = useState<HomeContent>(defaultHome);

  const [metrics, setMetrics] = useState<ConfigItem[]>([]);
  const [plans, setPlans] = useState<ConfigItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [metricForm, setMetricForm] = useState({ label: "", value: "" });
  const [editingMetricId, setEditingMetricId] = useState<number | null>(null);

  const [planForm, setPlanForm] = useState({ name: "", speed: "", description: "", price: "" });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [homeRes, metricRes, planRes] = await Promise.all([
        request("/api/configuration/items/landing-home?page=1&page_size=10", { headers: authHeader }) as Promise<ListResponse>,
        request("/api/configuration/items/landing-metric?page=1&page_size=100", { headers: authHeader }) as Promise<ListResponse>,
        request("/api/configuration/items/landing-plan?page=1&page_size=100", { headers: authHeader }) as Promise<ListResponse>,
      ]);

      const homeRow = homeRes.items[0] ?? null;
      setHomeId(homeRow?.id ?? null);
      if (homeRow?.details) {
        try {
          setHome({ ...defaultHome, ...JSON.parse(homeRow.details) });
        } catch {
          setHome(defaultHome);
        }
      }

      setMetrics(metricRes.items);
      setPlans(planRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load landing content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveHome = async (event: FormEvent) => {
    event.preventDefault();
    setSavingHome(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        name: "home",
        details: JSON.stringify(home),
      };
      if (homeId) {
        await request(`/api/configuration/items/landing-home/${homeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      } else {
        const created = (await request("/api/configuration/items/landing-home", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        })) as ConfigItem;
        setHomeId(created.id);
      }
      setNotice("Landing home content saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingHome(false);
    }
  };

  const submitMetric = async (event: FormEvent) => {
    event.preventDefault();
    if (!metricForm.label.trim() || !metricForm.value.trim()) return;
    setError(null);
    try {
      const payload = { name: metricForm.label.trim(), details: metricForm.value.trim() };
      if (editingMetricId) {
        await request(`/api/configuration/items/landing-metric/${editingMetricId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      } else {
        await request("/api/configuration/items/landing-metric", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      }
      setMetricForm({ label: "", value: "" });
      setEditingMetricId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Metric save failed.");
    }
  };

  const editMetric = (row: ConfigItem) => {
    setEditingMetricId(row.id);
    setMetricForm({ label: row.name, value: row.details ?? "" });
  };

  const deleteMetric = async (id: number) => {
    if (!window.confirm("Delete this metric?")) return;
    await request(`/api/configuration/items/landing-metric/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    await loadAll();
  };

  const submitPlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!planForm.name.trim() || !planForm.speed.trim()) return;
    setError(null);
    try {
      const payload = {
        name: planForm.name.trim(),
        package_type: planForm.speed.trim(),
        details: planForm.description.trim(),
        price: planForm.price ? Number(planForm.price) : null,
      };
      if (editingPlanId) {
        await request(`/api/configuration/items/landing-plan/${editingPlanId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      } else {
        await request("/api/configuration/items/landing-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      }
      setPlanForm({ name: "", speed: "", description: "", price: "" });
      setEditingPlanId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan save failed.");
    }
  };

  const editPlan = (row: ConfigItem) => {
    setEditingPlanId(row.id);
    setPlanForm({
      name: row.name,
      speed: row.package_type ?? "",
      description: row.details ?? "",
      price: row.price ?? "",
    });
  };

  const deletePlan = async (id: number) => {
    if (!window.confirm("Delete this plan?")) return;
    await request(`/api/configuration/items/landing-plan/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    await loadAll();
  };

  const metricTitle = useMemo(() => (editingMetricId ? "Update Metric" : "Add Metric"), [editingMetricId]);
  const planTitle = useMemo(() => (editingPlanId ? "Update Plan" : "Add Plan"), [editingPlanId]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Landing Page Content Manager</h2>
        <span className="text-xs text-slate-500">Configuration &gt; Landing Content</span>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}

      <form onSubmit={saveHome} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-700">Home Block</h3>
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Brand Name" value={home.brand_name} onChange={(e) => setHome((p) => ({ ...p, brand_name: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Brand Subtitle" value={home.brand_subtitle} onChange={(e) => setHome((p) => ({ ...p, brand_subtitle: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Hero Tagline" value={home.hero_tagline} onChange={(e) => setHome((p) => ({ ...p, hero_tagline: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Spotlight Title" value={home.spotlight_title} onChange={(e) => setHome((p) => ({ ...p, spotlight_title: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Hero Title" value={home.hero_title} onChange={(e) => setHome((p) => ({ ...p, hero_title: e.target.value }))} />
          <textarea className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Hero Description" value={home.hero_description} onChange={(e) => setHome((p) => ({ ...p, hero_description: e.target.value }))} />
          <textarea className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Spotlight Description" value={home.spotlight_description} onChange={(e) => setHome((p) => ({ ...p, spotlight_description: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Primary CTA Label" value={home.primary_cta_label} onChange={(e) => setHome((p) => ({ ...p, primary_cta_label: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Primary CTA Href" value={home.primary_cta_href} onChange={(e) => setHome((p) => ({ ...p, primary_cta_href: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Secondary CTA Label" value={home.secondary_cta_label} onChange={(e) => setHome((p) => ({ ...p, secondary_cta_label: e.target.value }))} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Secondary CTA Href" value={home.secondary_cta_href} onChange={(e) => setHome((p) => ({ ...p, secondary_cta_href: e.target.value }))} />
        </div>
        <button type="submit" disabled={savingHome} className="inline-flex items-center gap-2 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
          <Save className="h-4 w-4" /> {savingHome ? "Saving..." : "Save Home Content"}
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">Coverage Metrics</h3>
          <form className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]" onSubmit={submitMetric}>
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Label" value={metricForm.label} onChange={(e) => setMetricForm((p) => ({ ...p, label: e.target.value }))} />
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Value" value={metricForm.value} onChange={(e) => setMetricForm((p) => ({ ...p, value: e.target.value }))} />
            <button type="submit" className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">{metricTitle}</button>
            <button type="button" className="rounded bg-slate-200 px-3 py-2 text-sm" onClick={() => { setEditingMetricId(null); setMetricForm({ label: "", value: "" }); }}><X className="h-4 w-4" /></button>
          </form>

          <div className="space-y-2">
            {metrics.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{row.name}</p>
                  <p className="text-slate-600">{row.details}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => editMetric(row)} className="text-emerald-600"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => deleteMetric(row.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">Package Cards</h3>
          <form className="grid gap-2 md:grid-cols-2" onSubmit={submitPlan}>
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Plan Name" value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Speed" value={planForm.speed} onChange={(e) => setPlanForm((p) => ({ ...p, speed: e.target.value }))} />
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Price" value={planForm.price} onChange={(e) => setPlanForm((p) => ({ ...p, price: e.target.value }))} />
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Description" value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">{planTitle}</button>
              <button type="button" className="rounded bg-slate-200 px-3 py-2 text-sm" onClick={() => { setEditingPlanId(null); setPlanForm({ name: "", speed: "", description: "", price: "" }); }}><X className="h-4 w-4" /></button>
            </div>
          </form>

          <div className="space-y-2">
            {plans.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{row.name} ({row.package_type})</p>
                  <p className="text-slate-600">{row.details} | ${row.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => editPlan(row)} className="text-emerald-600"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => deletePlan(row.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
