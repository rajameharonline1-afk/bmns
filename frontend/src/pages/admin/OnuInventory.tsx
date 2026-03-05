import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, RefreshCw, Search, Users, Wifi, Signal, Router } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type OnuRow = {
  id: number;
  onu_id: string;
  client_code: string;
  area: string | null;
  sub_zone: string | null;
  box: string | null;
  description: string | null;
  mac: string | null;
  vlan: string | null;
  status: string;
  distance_m: number | null;
  signal_dbm: number | null;
  lrt: string | null;
  ldr: string | null;
  olt_id: number;
};

type Summary = {
  online: number;
  offline: number;
  weak: number;
  total_olt: number;
};

type OltOption = {
  id: number;
  ip_address: string;
};

const request = async (path: string, options: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  if (response.status === 204) return null;
  return response.json();
};

const dbmOptions = [
  { label: "All", value: "" },
  { label: "Good", value: "good" },
  { label: "Warn", value: "warn" },
  { label: "Critical", value: "critical" },
];

const scoreRow = (row: OnuRow) =>
  Number(row.distance_m !== null) +
  Number(row.signal_dbm !== null) +
  Number(Boolean(row.ldr && row.ldr !== "N/A")) +
  Number(Boolean(row.vlan));

const dedupeRows = (data: OnuRow[]) => {
  const map = new Map<string, OnuRow>();
  for (const row of data) {
    const key = `${row.olt_id}|${row.onu_id}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, row);
      continue;
    }
    const currentScore = scoreRow(current);
    const nextScore = scoreRow(row);
    if (nextScore > currentScore || (nextScore === currentScore && row.id > current.id)) {
      map.set(key, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
};

const parseLdrDisplay = (value: string | null) => {
  if (!value || value.trim() === "" || value.trim().toUpperCase() === "N/A") {
    return { reason: "N/A", time: null as string | null };
  }
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && line.toUpperCase() !== "N/A");
  if (lines.length === 0) {
    return { reason: "N/A", time: null as string | null };
  }
  if (lines.length >= 2) {
    return { reason: lines[0], time: lines.slice(1).join(" ") };
  }
  return { reason: lines[0], time: null as string | null };
};

const OnuInventory = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<OnuRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ online: 0, offline: 0, weak: 0, total_olt: 0 });
  const [olts, setOlts] = useState<OltOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dbmFilter, setDbmFilter] = useState("");
  const [oltFilter, setOltFilter] = useState("");
  const [ponFilter, setPonFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configModalRow, setConfigModalRow] = useState<OnuRow | null>(null);
  const [configDescription, setConfigDescription] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const loadSummary = async () => {
    try {
      const data = (await request("/api/onu-inventory/summary", { headers: authHeader })) as Summary;
      setSummary(data);
    } catch {
      // Keep old summary if this transient call fails.
    }
  };

  const loadOlts = async () => {
    try {
      const data = (await request("/api/olts", { headers: authHeader })) as OltOption[];
      setOlts(data);
    } catch {
      // Keep page usable without select options.
    }
  };

  const loadRows = async () => {
    if (!oltFilter) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (oltFilter) params.set("olt_id", oltFilter);
      if (ponFilter) params.set("pon", ponFilter);
      if (dbmFilter === "critical") {
        params.set("max_dbm", "-27");
      } else if (dbmFilter === "warn") {
        params.set("min_dbm", "-27");
        params.set("max_dbm", "-24");
      } else if (dbmFilter === "good") {
        params.set("min_dbm", "-24");
      }
      const data = (await request(`/api/onu-inventory?${params.toString()}`, { headers: authHeader })) as OnuRow[];
      setRows(dedupeRows(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ONU rows");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const syncOnu = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const syncPath = oltFilter ? `/api/onu-inventory/sync?olt_id=${oltFilter}` : "/api/onu-inventory/sync";
      const result = (await request(syncPath, {
        method: "POST",
        headers: authHeader,
      })) as { updated: number; errors?: string[] };
      if (result.errors && result.errors.length) {
        setSyncMessage(result.errors.join(" | "));
      } else {
        setSyncMessage(`Synced ${result.updated} ONU${oltFilter ? "" : " from all OLTs"}`);
      }
      await Promise.all([loadRows(), loadSummary()]);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadSummary();
    loadOlts();
    loadRows();
  }, []);

  useEffect(() => {
    loadRows();
  }, [statusFilter, dbmFilter, oltFilter, ponFilter]);

  const scopedRows = useMemo(() => {
    if (!oltFilter) return rows;
    return rows.filter((row) => String(row.olt_id) === oltFilter);
  }, [rows, oltFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.client_code, row.onu_id, row.mac ?? "", row.description ?? "", row.vlan ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, search]);

  const ponOptions = useMemo(() => {
    const values = new Set<number>();
    scopedRows.forEach((row) => {
      const match = row.onu_id.match(/\/(\d+):/);
      if (match) values.add(Number(match[1]));
    });
    return Array.from(values).sort((a, b) => a - b);
  }, [scopedRows]);

  useEffect(() => {
    if (ponFilter && !ponOptions.includes(Number(ponFilter))) setPonFilter("");
  }, [ponFilter, ponOptions]);

  const activeFilters = [
    oltFilter && `OLT: ${olts.find((item) => String(item.id) === oltFilter)?.ip_address ?? oltFilter}`,
    ponFilter && `PON: ${ponFilter}`,
    statusFilter && `Status: ${statusFilter}`,
    dbmFilter && `DBM: ${dbmFilter}`,
  ].filter(Boolean) as string[];

  const badgeForDbm = (value: number | null) => {
    if (value === null || value === undefined) return { label: "N/A", tone: "bg-slate-400" };
    if (value <= -27) return { label: "Critical", tone: "bg-rose-500" };
    if (value <= -24) return { label: "Warn", tone: "bg-amber-500" };
    return { label: "Good", tone: "bg-emerald-500" };
  };

  const openConfigureModal = (row: OnuRow) => {
    setConfigModalRow(row);
    setConfigDescription(row.description?.trim() ?? "");
    setConfigError(null);
  };

  const closeConfigureModal = () => {
    if (configSaving) return;
    setConfigModalRow(null);
    setConfigDescription("");
    setConfigError(null);
  };

  const submitConfigure = async () => {
    if (!configModalRow) return;
    const description = configDescription.trim();
    if (!description) {
      setConfigError("Description is required.");
      return;
    }
    setConfigSaving(true);
    setConfigError(null);
    try {
      const updated = (await request(`/api/onu-inventory/${configModalRow.id}/configure`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })) as OnuRow;
      setRows((prev) => dedupeRows(prev.map((row) => (row.id === updated.id ? updated : row))));
      setSyncMessage(`Updated description for ${updated.onu_id}`);
      closeConfigureModal();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Configure failed");
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">OLT</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-800">Olt Users</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {syncMessage ? <span className="text-rose-600">{syncMessage}</span> : null}
          <button
            type="button"
            onClick={syncOnu}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full bg-[#21425a] px-3 py-1.5 text-xs font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : oltFilter ? "Sync ONU" : "Sync All ONU"}
          </button>
          <span>OLT &gt; OLT Users</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-4 p-4 lg:grid-cols-4">
          <div className="rounded-md bg-gradient-to-r from-cyan-500 to-sky-500 p-4 text-white shadow">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8" />
              <div>
                <div className="text-sm">Online</div>
                <div className="text-xl font-semibold">{summary.online}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/90">Online Clients</div>
          </div>
          <div className="rounded-md bg-gradient-to-r from-teal-500 to-emerald-500 p-4 text-white shadow">
            <div className="flex items-center gap-3">
              <Wifi className="h-8 w-8" />
              <div>
                <div className="text-sm">Offline</div>
                <div className="text-xl font-semibold">{summary.offline}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/90">Offline Clients</div>
          </div>
          <div className="rounded-md bg-gradient-to-r from-violet-500 to-purple-500 p-4 text-white shadow">
            <div className="flex items-center gap-3">
              <Signal className="h-8 w-8" />
              <div>
                <div className="text-sm">dBm 24+</div>
                <div className="text-xl font-semibold">{summary.weak}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/90">Very weak signal</div>
          </div>
          <div className="rounded-md bg-gradient-to-r from-slate-600 to-slate-700 p-4 text-white shadow">
            <div className="flex items-center gap-3">
              <Router className="h-8 w-8" />
              <div>
                <div className="text-sm">Total OLT</div>
                <div className="text-xl font-semibold">{summary.total_olt}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/90">No of OLT devices</div>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-[#21425a] px-4 py-2 text-xs font-semibold text-white shadow"
          >
            {showFilters ? "Hide" : "Show"} <ChevronDown className={`h-4 w-4 ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 border-t border-slate-200 px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="space-y-1 text-xs text-slate-500">
                <div>FILTER BY OLT IP:</div>
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={oltFilter}
                  onChange={(event) => {
                    setOltFilter(event.target.value);
                    setPonFilter("");
                  }}
                >
                  <option value="">All OLT</option>
                  {olts.map((olt) => (
                    <option key={olt.id} value={olt.id}>{olt.ip_address}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                <div>FILTER BY PON:</div>
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={ponFilter}
                  onChange={(event) => {
                    setPonFilter(event.target.value);
                  }}
                >
                  <option value="">All</option>
                  {ponOptions.map((pon) => (
                    <option key={pon} value={pon}>PON {pon}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                <div>FILTER BY STATUS:</div>
                <select className="w-full rounded border border-slate-300 px-3 py-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                <div>FILTER BY DBM:</div>
                <select className="w-full rounded border border-slate-300 px-3 py-2" value={dbmFilter} onChange={(event) => setDbmFilter(event.target.value)}>
                  {dbmOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 flex items-end justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("");
                    setDbmFilter("");
                    setOltFilter("");
                    setPonFilter("");
                    setSearch("");
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Clear
                </button>
                <button type="button" onClick={loadRows} className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white">
                  <Filter className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="font-semibold">Active Filters:</span>
                {activeFilters.length === 0 ? <span className="text-slate-400">None</span> : null}
                {activeFilters.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{item}</span>
                ))}
              </div>
              <span className="text-slate-500">Results: {filtered.length}</span>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Showing dynamic results</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Search:</span>
              <div className="flex items-center gap-2 rounded border border-slate-300 px-2 py-1">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  className="w-48 text-xs focus:outline-none"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="client / onu / mac"
                />
              </div>
            </div>
          </div>
          {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-[#21425a] text-white">
              <tr>
                <th className="border-r border-white/20 px-3 py-2 text-left">ONU ID</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Client</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Area</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Sub Zone</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Box</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Description</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">MAC</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">VLAN</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Status</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Dist.(m)</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">L.(dBm)</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">LRT</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">LDR</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const badge = badgeForDbm(row.signal_dbm);
                const ldrDisplay = parseLdrDisplay(row.ldr);
                const isOffline = row.status.trim().toLowerCase() === "offline";
                return (
                  <tr key={`${row.olt_id}-${row.onu_id}`} className="border-b border-slate-200 text-slate-700 odd:bg-white even:bg-[#f8fafc]">
                    <td className="px-3 py-2">{row.onu_id}</td>
                    <td className="px-3 py-2 text-blue-600">{row.client_code}</td>
                    <td className="px-3 py-2">{row.area ?? "-"}</td>
                    <td className="px-3 py-2">{row.sub_zone ?? "-"}</td>
                    <td className="px-3 py-2">{row.box ?? "-"}</td>
                    <td className="px-3 py-2">{row.description?.trim() ?? ""}</td>
                    <td className="px-3 py-2 text-pink-500">{row.mac ?? ""}</td>
                    <td className="px-3 py-2">
                      {row.vlan ? <span className="rounded bg-slate-700 px-2 py-0.5 text-white">{row.vlan}</span> : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-emerald-600">{row.status}</td>
                    <td className="px-3 py-2">{row.distance_m ?? "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{isOffline ? "Null" : row.signal_dbm ?? "N/A"}</span>
                        {!isOffline ? <span className={`rounded px-2 py-0.5 text-[10px] text-white ${badge.tone}`}>{badge.label}</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row.lrt ?? "N/A"}</td>
                    <td className="px-3 py-2 text-slate-500">
                      <div className="leading-tight">
                        <div className="text-slate-800">{ldrDisplay.reason}</div>
                        {ldrDisplay.time ? <div className="text-[11px] text-slate-500">{ldrDisplay.time}</div> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openConfigureModal(row)}
                        className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-600"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                    {oltFilter ? "No ONU records found." : "Please select an OLT IP to view results."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-slate-500">Loading...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {configModalRow && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Configure ONU Description</h3>
                <p className="text-xs text-slate-500">{configModalRow.onu_id} | {configModalRow.mac}</p>
              </div>
              <button type="button" onClick={closeConfigureModal} className="text-sm text-slate-500 hover:text-slate-800">Close</button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <label className="block text-xs font-semibold text-slate-600">
                Description (Real Device)
                <input
                  value={configDescription}
                  onChange={(event) => setConfigDescription(event.target.value)}
                  maxLength={32}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Enter ONU description"
                />
              </label>
              <p className="text-xs text-slate-500">
                Save will update both the OLT device and the web table.
              </p>
              {configError ? <p className="text-xs text-rose-600">{configError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeConfigureModal}
                className="rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitConfigure}
                disabled={configSaving}
                className="rounded bg-sky-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {configSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OnuInventory;
