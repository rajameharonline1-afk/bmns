import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  MoreVertical,
  RefreshCcw,
  RotateCcw,
  Settings,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ClientListItem = {
  client_id: number;
  c_code: string;
  id_or_ip: string;
  password: string;
  customer_name: string;
  mobile: string | null;
  zone: string | null;
  connection_type: string | null;
  client_type: string | null;
  package_speed: string | null;
  monthly_bill: string | null;
  mac_address: string | null;
  server: string | null;
  billing_status: string | null;
  monitoring_status: boolean;
};

type ClientListOptions = {
  servers: string[];
  protocol_types: string[];
  profiles: string[];
  zones: string[];
  sub_zones: string[];
  boxes: string[];
  packages: string[];
  client_types: string[];
  connection_types: string[];
  billing_statuses: string[];
  monitoring_statuses: string[];
  custom_statuses: string[];
};

type ClientListResponse = {
  stats: {
    running_clients: number;
    new_clients: number;
    renewed_clients: number;
    waiver_clients: number;
  };
  options: ClientListOptions;
  items: ClientListItem[];
};

const request = async (path: string, options: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json();
};

const BulkButton = ({ label }: { label: string }) => (
  <button
    type="button"
    className="inline-flex items-center gap-2 rounded-full bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white shadow"
  >
    <Wrench className="h-4 w-4" />
    {label}
  </button>
);

export default function AdminClients() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [data, setData] = useState<ClientListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [showFilters, setShowFilters] = useState(false);
  const [showPassMap, setShowPassMap] = useState<Record<number, boolean>>({});
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [monitorLoadingId, setMonitorLoadingId] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    server: "",
    protocol_type: "",
    profile: "",
    zone: "",
    sub_zone: "",
    box: "",
    package: "",
    client_type: "",
    connection_type: "",
    b_status: "",
    m_status: "",
    custom_status: "",
    from_date: "",
    to_date: "",
  });

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      if (search.trim()) params.set("search", search.trim());
      const query = params.toString();
      const response = (await request(`/api/clients/list-view${query ? `?${query}` : ""}`, {
        headers: authHeader,
      })) as ClientListResponse;
      setData(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load clients";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.items.slice(0, pageSize);
  }, [data, pageSize]);

  const option = (values: string[]) =>
    values.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ));

  const updateMonitor = async (clientId: number, enabled: boolean) => {
    try {
      setMonitorLoadingId(clientId);
      await request(`/api/clients/${clientId}/monitor-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ enabled }),
      });
      await loadClients();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update monitor status";
      setError(msg);
    } finally {
      setMonitorLoadingId(null);
    }
  };

  const viewClient = (client: ClientListItem) => {
    setActionMenuId(null);
    navigate("/admin/section/client/add-new", {
      state: { client_id: client.client_id, mode: "view" },
    });
  };

  const editClient = (client: ClientListItem) => {
    setActionMenuId(null);
    navigate("/admin/section/client/add-new", {
      state: { client_id: client.client_id, mode: "edit" },
    });
  };

  const refreshClientRow = async () => {
    setActionMenuId(null);
    await loadClients();
  };

  const scheduleClient = async (client: ClientListItem) => {
    setActionMenuId(null);
    await updateMonitor(client.client_id, !client.monitoring_status);
  };

  const stat = data?.stats ?? {
    running_clients: 0,
    new_clients: 0,
    renewed_clients: 0,
    waiver_clients: 0,
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4 font-semibold text-slate-800">Client List <span className="text-sm font-normal text-slate-500">View All Client</span></h2>
        </div>
        <div className="text-xs text-slate-500">Client &gt; Client List</div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <BulkButton label="Info To Mikrotik" />
          <BulkButton label="Generate Excel" />
          <BulkButton label="Generate Pdf" />
          <BulkButton label="Bulk Profile Change" />
          <BulkButton label="Bulk Package Change" />
          <BulkButton label="Bulk Status Change" />
          <BulkButton label="Unbind All PPOE MAC Address" />
          <BulkButton label="Bind All PPOE MAC Address" />
          <button type="button" onClick={loadClients} className="inline-flex items-center gap-2 rounded-full bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white shadow">
            <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sync Clients & Servers
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded bg-gradient-to-r from-cyan-500 to-sky-500 p-3 text-white shadow">
            <div className="flex items-center gap-2"><Users className="h-7 w-7" /><div><div className="text-2xl font-bold leading-none">{stat.running_clients}</div><div className="text-sm font-semibold">Running Clients</div></div></div>
            <div className="mt-1 text-xs text-white/90">Number of clients without LeftOut status</div>
          </div>
          <div className="rounded bg-gradient-to-r from-teal-500 to-cyan-500 p-3 text-white shadow">
            <div className="flex items-center gap-2"><UserPlus className="h-7 w-7" /><div><div className="text-2xl font-bold leading-none">{stat.new_clients}</div><div className="text-sm font-semibold">New Clients</div></div></div>
            <div className="mt-1 text-xs text-white/90">Monthly number of clients those are new</div>
          </div>
          <div className="rounded bg-gradient-to-r from-violet-500 to-indigo-500 p-3 text-white shadow">
            <div className="flex items-center gap-2"><CalendarDays className="h-7 w-7" /><div><div className="text-2xl font-bold leading-none">{stat.renewed_clients}</div><div className="text-sm font-semibold">Renewed Clients</div></div></div>
            <div className="mt-1 text-xs text-white/90">Monthly number of newly renewed clients</div>
          </div>
          <div className="rounded bg-slate-600 p-3 text-white shadow">
            <div className="flex items-center gap-2"><Users className="h-7 w-7" /><div><div className="text-2xl font-bold leading-none">{stat.waiver_clients}</div><div className="text-sm font-semibold">Waiver Clients</div></div></div>
            <div className="mt-1 text-xs text-white/90">Number of clients those are free/personal</div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-[#1f4e6e] px-5 py-2 text-sm font-semibold text-white shadow"
          >
            {showFilters ? "Hide" : "Show"}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFilters ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["SERVER", "server", data?.options.servers ?? []],
              ["PROTOCOL TYPE", "protocol_type", data?.options.protocol_types ?? []],
              ["PROFILE", "profile", data?.options.profiles ?? []],
              ["ZONE", "zone", data?.options.zones ?? []],
              ["SUB ZONE", "sub_zone", data?.options.sub_zones ?? []],
              ["BOX", "box", data?.options.boxes ?? []],
              ["PACKAGE", "package", data?.options.packages ?? []],
              ["CLIENT TYPE", "client_type", data?.options.client_types ?? []],
              ["CONNECTION TYPE", "connection_type", data?.options.connection_types ?? []],
              ["B.STATUS", "b_status", data?.options.billing_statuses ?? []],
              ["M.STATUS", "m_status", data?.options.monitoring_statuses ?? []],
              ["CUSTOM STATUS", "custom_status", data?.options.custom_statuses ?? []],
            ].map(([label, key, values]) => (
              <div key={String(key)}>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
                <select
                  value={(filters as any)[key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                >
                  <option value="">Select</option>
                  {option(values as string[])}
                </select>
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">FROM DATE</label>
              <input type="date" value={filters.from_date} onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))} className="w-full rounded border border-slate-300 px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">TO DATE</label>
              <input type="date" value={filters.to_date} onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))} className="w-full rounded border border-slate-300 px-2 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={loadClients} className="rounded bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white">Apply</button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            SHOW
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded border border-slate-300 px-2 py-1">
              {[25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            ENTRIES
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            SEARCH:
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadClients(); }} className="rounded border border-slate-300 px-2 py-1" />
          </div>
        </div>

        {error ? <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#21425a] text-white">
              <tr>
                <th className="px-2 py-2 text-left"><input type="checkbox" /></th>
                <th className="px-2 py-2 text-left">C.Code</th>
                <th className="px-2 py-2 text-left">ID/IP</th>
                <th className="px-2 py-2 text-left">Password</th>
                <th className="px-2 py-2 text-left">Cus.Name</th>
                <th className="px-2 py-2 text-left">Mobile</th>
                <th className="px-2 py-2 text-left">Zone</th>
                <th className="px-2 py-2 text-left">Conn. Type</th>
                <th className="px-2 py-2 text-left">Cus.Type</th>
                <th className="px-2 py-2 text-left">Package/Speed</th>
                <th className="px-2 py-2 text-left">M.Bill</th>
                <th className="px-2 py-2 text-left">MAC Addrs</th>
                <th className="px-2 py-2 text-left">Server</th>
                <th className="px-2 py-2 text-left">B.Status</th>
                <th className="px-2 py-2 text-left">M.Status</th>
                <th className="px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.client_id}>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-2"><input type="checkbox" /></td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => viewClient(row)}
                      className="font-semibold text-sky-700 hover:text-sky-900"
                    >
                      {row.c_code}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span>{row.id_or_ip}</span>
                      <button type="button" title="Refresh client list" onClick={refreshClientRow}>
                        <RefreshCcw className="h-4 w-4 text-sky-500" />
                      </button>
                      <button
                        type="button"
                        title={row.monitoring_status ? "Disable monitoring" : "Enable monitoring"}
                        onClick={() => updateMonitor(row.client_id, !row.monitoring_status)}
                      >
                        <span className={`inline-block h-3 w-3 rounded-full ${row.monitoring_status ? "bg-green-500" : "bg-slate-400"}`} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span>{showPassMap[row.client_id] ? row.password : "••••••••"}</span>
                      <button type="button" onClick={() => setShowPassMap((prev) => ({ ...prev, [row.client_id]: !prev[row.client_id] }))}>
                        <Eye className="h-4 w-4 text-sky-500" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">{row.customer_name}</td>
                  <td className="px-2 py-2">{row.mobile ?? "-"}</td>
                  <td className="px-2 py-2">{row.zone ?? "-"}</td>
                  <td className="px-2 py-2">{row.connection_type ?? "-"}</td>
                  <td className="px-2 py-2">{row.client_type ?? "-"}</td>
                  <td className="px-2 py-2">{row.package_speed ?? "-"}</td>
                  <td className="px-2 py-2">{row.monthly_bill ?? "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span>{row.mac_address ?? "-"}</span>
                      <button type="button" title="Refresh client list" onClick={refreshClientRow}>
                        <RefreshCcw className="h-4 w-4 text-emerald-500" />
                      </button>
                      <button type="button" title="Disable monitoring" onClick={() => updateMonitor(row.client_id, false)}>
                        <Lock className="h-4 w-4 text-emerald-500" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">{row.server ?? "-"}</td>
                  <td className="px-2 py-2">{row.billing_status ?? "-"}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      disabled={monitorLoadingId === row.client_id}
                      onClick={() => updateMonitor(row.client_id, !row.monitoring_status)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${row.monitoring_status ? "bg-sky-500" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white transition ${row.monitoring_status ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => setActionMenuId((prev) => (prev === row.client_id ? null : row.client_id))}>
                      <MoreVertical className="h-5 w-5 text-slate-700" />
                    </button>
                  </td>
                </tr>
                {actionMenuId === row.client_id ? (
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td colSpan={16} className="px-2 py-2">
                      <div className="flex items-center justify-end">
                        <div className="flex items-center gap-2 rounded-full bg-[#1f4e6e] px-3 py-2 text-white shadow">
                          <button
                            type="button"
                            title="View"
                            onClick={() => viewClient(row)}
                            className="rounded-full bg-white/10 p-1 hover:bg-white/20"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => editClient(row)}
                            className="rounded-full bg-white/10 p-1 hover:bg-white/20"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Reload"
                            onClick={refreshClientRow}
                            className="rounded-full bg-white/10 p-1 hover:bg-white/20"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Schedule"
                            onClick={() => scheduleClient(row)}
                            className="rounded-full bg-white/10 p-1 hover:bg-white/20"
                          >
                            <CalendarDays className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-3 py-6 text-center text-slate-500">No clients found.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={16} className="px-3 py-6 text-center text-slate-500">Loading...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
