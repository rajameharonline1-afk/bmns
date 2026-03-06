import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Gauge,
  Mail,
  Package,
  Receipt,
  Scale,
  Ticket,
  Upload,
  Download,
  Newspaper,
  Bell,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

type Tile = {
  title: string;
  value: string;
  subtitle: string;
  footer_action: string;
  tone: string;
};

type Post = {
  id: number;
  title: string;
  body: string;
  image_path: string | null;
  published_label: string;
};

type Summary = {
  login_code: string;
  server_ip: string;
  package_name: string;
  package_speed_label: string;
  tiles: Tile[];
  usage: { uptime_label: string; downloaded_gb: string; uploaded_gb: string };
  ticket: { title: string; status: string; action_label: string };
  message: Post | null;
  news: Post[];
  notices: Post[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([API_BASE, `http://${host}:8001`, "http://localhost:8001", "http://127.0.0.1:8001"]));
})();

const fallback: Summary = {
  login_code: "5555",
  server_ip: "R3545555",
  package_name: "Basic",
  package_speed_label: "5Mbps [1:8 Shared]",
  tiles: [
    { title: "Package", value: "Basic", subtitle: "5Mbps [1:8 Shared]", footer_action: "Migration/Update", tone: "purple" },
    { title: "Monthly Bill", value: "0.00", subtitle: "You have to pay this amount in every month.", footer_action: "My Profile", tone: "purple" },
    { title: "Paid(Advance)", value: "1.00", subtitle: "You have advanced paid amount, no need to pay.", footer_action: "Recharge/Pay Bill", tone: "green" },
    { title: "Expiry Date", value: "14-MAR-2026", subtitle: "This is your internet expiry date.", footer_action: "Extend BillingDate", tone: "red" },
    { title: "Service Invoice", value: "Upcoming", subtitle: "Upcoming monthly service invoice.", footer_action: "Migration/Update", tone: "purple" },
    { title: "Service Due", value: "Upcoming", subtitle: "Pending due status for your account.", footer_action: "Migration/Update", tone: "purple" },
  ],
  usage: { uptime_label: "2D 11H 7M 37S", downloaded_gb: "43.3", uploaded_gb: "1.3" },
  ticket: { title: "Not Found", status: "Processing", action_label: "New Ticket" },
  message: {
    id: 1,
    title: "SUPPORT CREATED",
    body: "প্রিয় গ্রাহক, আমরা আপনার সমস্যাটি তালিকাভুক্ত করেছি। আপনার টিকেট নং: 160।",
    image_path: null,
    published_label: "27-Dec-2025",
  },
  news: [
    { id: 1, title: "বকেয়া মাশ", body: "আপনার কালেকশন চিটার জন্য যোগাযোগ করুন ...", image_path: null, published_label: "March 30, 2025" },
    { id: 2, title: "অনলাইনে বিল পেমেন্ট", body: "অনলাইনে বিল পেমেন্ট করুন", image_path: null, published_label: "March 09, 2025" },
    { id: 3, title: "FTP & Live Tv Server", body: "FTP & Live Tv দেখতে ক্লিক করুন", image_path: null, published_label: "March 09, 2025" },
  ],
  notices: [],
};

const toneMap: Record<string, string> = {
  purple: "bg-[#7a5be2]",
  green: "bg-[#08b16c]",
  red: "bg-[#ff0d4f]",
  blue: "bg-[#178bcb]",
  cyan: "bg-[#37b8bd]",
};

const iconFor = (title: string) => {
  const key = title.toLowerCase();
  if (key.includes("package")) return <Package className="h-6 w-6" />;
  if (key.includes("bill") || key.includes("invoice")) return <Receipt className="h-6 w-6" />;
  if (key.includes("advance")) return <Scale className="h-6 w-6" />;
  if (key.includes("expiry")) return <CalendarDays className="h-6 w-6" />;
  return <BadgeDollarSign className="h-6 w-6" />;
};

const buildError = async (response: Response) => {
  let message = response.statusText || "Request failed";
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      message = payload.detail;
    }
  } catch {
    // ignore
  }
  return message;
};

const ClientDashboard = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary>(fallback);
  const [error, setError] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState<string>(API_BASES.find((base) => base.includes(":8001")) || API_BASES[0] || "");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      let lastError: string | null = null;
      for (const base of API_BASES) {
        if (!base) continue;
        try {
          const response = await fetch(`${base}/api/dashboard/client-summary`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (!response.ok) {
            lastError = await buildError(response);
            continue;
          }
          const payload = (await response.json()) as Summary;
          if (!cancelled) {
            setSummary(payload);
            setApiBase(base);
            setError(null);
          }
          return;
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Failed to load client dashboard";
        }
      }

      if (!cancelled && lastError) {
        setError(lastError);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const topCards = useMemo(() => summary.tiles.slice(0, 6), [summary.tiles]);

  const resolveImage = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${apiBase}${path}`;
  };

  return (
    <section className="space-y-4">
      {error ? <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}

      <div className="ds-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#f5f8fb] text-[#64b0c2]">
            <Gauge className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-[#324c62]">Dashboard</h2>
            <p className="text-base text-slate-500">At a glance view of your profile, package, payments notice information.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="ds-card px-4 py-3 text-[34px] text-slate-700">LoginID/ClientCode: <b>{summary.login_code}</b></div>
        <div className="ds-card px-4 py-3 text-right text-[34px] text-slate-700">ServerID/IP: <b>{summary.server_ip}</b></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {topCards.map((tile) => (
          <article key={`${tile.title}-${tile.footer_action}`} className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
            <div className={`flex items-center justify-center gap-3 px-4 py-3 text-white ${toneMap[tile.tone] || "bg-[#7a5be2]"}`}>
              {iconFor(tile.title)}
              <span className="text-[38px] font-bold uppercase">{tile.title}</span>
            </div>
            <div className="space-y-1 px-5 py-4 text-center text-[#3d5368]">
              <h3 className="text-[54px] font-semibold leading-tight">{tile.value}</h3>
              <p className="text-[30px] text-slate-600">{tile.subtitle}</p>
            </div>
            <div className="bg-[#4d5762] px-4 py-3 text-center text-[42px] font-semibold text-white">{tile.footer_action}</div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
          <div className="flex items-center justify-center gap-3 bg-[#08b16c] px-4 py-3 text-white">
            <Gauge className="h-6 w-6" />
            <span className="text-[38px] font-bold uppercase">Up Time ({summary.usage.uptime_label})</span>
          </div>
          <div className="grid grid-cols-2 gap-4 px-6 py-5 text-[#3d5368]">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4d5762] text-white"><Download className="h-7 w-7" /></div>
              <div>
                <p className="text-[34px]">Downloaded Data</p>
                <p className="text-[44px] font-semibold">{summary.usage.downloaded_gb} Gb</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4d5762] text-white"><Upload className="h-7 w-7" /></div>
              <div>
                <p className="text-[34px]">Uploaded Data</p>
                <p className="text-[44px] font-semibold">{summary.usage.uploaded_gb} Gb</p>
              </div>
            </div>
          </div>
          <div className="bg-[#4d5762] px-4 py-3 text-center text-[42px] font-semibold text-white">Reload</div>
        </article>

        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
          <div className="flex items-center justify-center gap-3 bg-[#178bcb] px-4 py-3 text-white">
            <Ticket className="h-6 w-6" />
            <span className="text-[38px] font-bold uppercase">Ticket</span>
          </div>
          <div className="space-y-3 px-5 py-5 text-center text-[#3d5368]">
            <h3 className="text-[58px] font-semibold uppercase">{summary.ticket.title}</h3>
            <span className="inline-flex rounded-full bg-[#f79d1b] px-4 py-1 text-[30px] font-semibold text-white">{summary.ticket.status}</span>
          </div>
          <div className="bg-[#4d5762] px-4 py-3 text-center text-[42px] font-semibold text-white">{summary.ticket.action_label}</div>
        </article>

        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
          <div className="flex items-center justify-center gap-3 bg-[#178bcb] px-4 py-3 text-white">
            <Mail className="h-6 w-6" />
            <span className="text-[38px] font-bold uppercase">Message</span>
          </div>
          <div className="space-y-2 px-5 py-4 text-center text-[#3d5368]">
            <h3 className="text-[34px] font-semibold uppercase">{summary.message?.title || "Support Created"}</h3>
            <p className="text-[31px] leading-snug">{summary.message?.body || "No message available."}</p>
            <p className="text-[32px] font-semibold">{summary.message?.published_label || "N/A"}</p>
          </div>
          <div className="bg-[#4d5762] px-4 py-3 text-center text-[42px] font-semibold text-white">Contact Center</div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
          <div className="flex items-center justify-center gap-3 bg-[#37b8bd] px-4 py-3 text-white">
            <Newspaper className="h-6 w-6" />
            <span className="text-[38px] font-bold uppercase">News & Events</span>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-3">
            {summary.news.map((item) => (
              <article key={`news-${item.id}-${item.title}`} className="rounded border border-slate-300 bg-[#f4f6f8]">
                <div className="h-28 overflow-hidden bg-slate-200">
                  {item.image_path ? (
                    <img src={resolveImage(item.image_path)} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">No image</div>
                  )}
                </div>
                <div className="px-2 py-2 text-center">
                  <h4 className="text-[26px] font-semibold text-[#1f3f5b]">{item.title}</h4>
                  <p className="text-[25px] text-slate-600">{item.body}</p>
                  <p className="mt-2 text-[28px] font-semibold text-[#274f6d]">{item.published_label}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
          <div className="flex items-center justify-center gap-3 bg-[#37b8bd] px-4 py-3 text-white">
            <Bell className="h-6 w-6" />
            <span className="text-[38px] font-bold uppercase">Notices</span>
          </div>
          <div className="space-y-3 p-4">
            {summary.notices.length ? (
              summary.notices.map((item) => (
                <div key={`notice-${item.id}-${item.title}`} className="rounded border border-slate-200 bg-[#f8fafc] p-3">
                  <h4 className="text-[30px] font-semibold text-[#21425f]">{item.title}</h4>
                  <p className="mt-1 text-[27px] text-slate-600">{item.body}</p>
                  <p className="mt-2 text-[26px] font-semibold text-slate-500">{item.published_label}</p>
                </div>
              ))
            ) : (
              <div className="rounded border border-dashed border-slate-300 bg-[#fafcff] p-5 text-[30px] text-slate-500">No notices available.</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
};

export default ClientDashboard;
