import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, RefreshCw, Search, Pencil } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type MikrotikServer = {
  id: number;
  server_name: string | null;
  server_ip: string;
  username: string;
  password: string;
  api_port: number;
  mikrotik_version: string;
  request_timeout_sec: number;
  is_active: boolean;
};

type FormState = {
  server_ip: string;
  username: string;
  password: string;
  api_port: string;
  mikrotik_version: string;
  request_timeout_sec: string;
};

const emptyForm: FormState = {
  server_ip: "",
  username: "",
  password: "",
  api_port: "8728",
  mikrotik_version: "v3",
  request_timeout_sec: "10",
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

const MikrotikServerPage = () => {
  const { token } = useAuth();
  const [servers, setServers] = useState<MikrotikServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MikrotikServer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Record<number, boolean>>({});
  const [reloadingIds, setReloadingIds] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const notify = (type: "success" | "error", message: string) => {
    setToast({ type, message });
  };

  const loadServers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await request("/api/mikrotik-servers", { headers: authHeader });
      setServers(data as MikrotikServer[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load servers";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return servers;
    return servers.filter((server) =>
      [server.server_ip, server.username, server.server_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [servers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  const openCreateModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (server: MikrotikServer) => {
    setEditing(server);
    setForm({
      server_ip: server.server_ip,
      username: server.username,
      password: "",
      api_port: String(server.api_port),
      mikrotik_version: server.mikrotik_version ?? "v3",
      request_timeout_sec: String(server.request_timeout_sec ?? 10),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submitForm = async () => {
    if (!form.server_ip || !form.username || (!editing && !form.password)) {
      setError("Server IP, Username, and Password are required.");
      return;
    }

    const payload: Record<string, unknown> = {
      server_ip: form.server_ip,
      username: form.username,
      api_port: Number(form.api_port || 8728),
      mikrotik_version: form.mikrotik_version,
      request_timeout_sec: Number(form.request_timeout_sec || 10),
    };

    if (form.password) payload.password = form.password;

    try {
      setSaving(true);
      setError(null);
      if (editing) {
        await request(`/api/mikrotik-servers/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      } else {
        await request("/api/mikrotik-servers", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      }
      await loadServers();
      closeModal();
      notify("success", editing ? "Server updated successfully." : "Server created successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save server";
      setError(message);
      notify("error", message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (server: MikrotikServer) => {
    try {
      await request(`/api/mikrotik-servers/${server.id}/toggle`, {
        method: "PATCH",
        headers: authHeader,
      });
      await loadServers();
      notify("success", "Server status updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      notify("error", message);
    }
  };

  const syncServer = async (server: MikrotikServer) => {
    try {
      setSyncingIds((prev) => ({ ...prev, [server.id]: true }));
      const result = (await request(`/api/mikrotik-servers/${server.id}/sync`, {
        method: "POST",
        headers: authHeader,
      })) as {
        pushed_created: number;
        pushed_updated: number;
        pulled_updated: number;
      };
      await loadServers();
      notify(
        "success",
        `Sync complete for ${server.server_ip}. Created: ${result.pushed_created}, Updated: ${result.pushed_updated}, Pulled: ${result.pulled_updated}.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync server";
      setError(message);
      notify("error", message);
    } finally {
      setSyncingIds((prev) => ({ ...prev, [server.id]: false }));
    }
  };

  const reloadRow = async (server: MikrotikServer) => {
    try {
      setReloadingIds((prev) => ({ ...prev, [server.id]: true }));
      await loadServers();
      notify("success", `Reload complete for ${server.server_ip}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reload server";
      setError(message);
      notify("error", message);
    } finally {
      setReloadingIds((prev) => ({ ...prev, [server.id]: false }));
    }
  };

  return (
    <section className="space-y-4">
      {toast ? (
        <div className="fixed right-5 top-5 z-[60]">
          <div
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mt-1 text-3xl font-semibold text-slate-800">
            Mikrotik Server <span className="ml-2 text-sm font-normal text-slate-400">All Mikrotik Servers</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-600">System</span> &gt; <span className="text-slate-700">Server</span>
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#21425a] px-3 py-1.5 text-xs font-semibold text-white shadow"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4 text-cyan-300" />
            Server
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show</span>
            <select
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {[5, 10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">SEARCH:</span>
            <div className="flex items-center gap-2 rounded border border-slate-300 px-2 py-1 text-xs">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="w-40 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error && <div className="px-4 py-2 text-xs text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-[#21425a] text-white">
              <tr>
                <th className="border-r border-white/20 px-3 py-2 text-left">Serial</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">ServerName</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Server IP</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Username</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Password</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Port</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Version</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Timeout</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((server, index) => (
                <tr
                  key={server.id}
                  className="border-b border-slate-200 text-slate-700 odd:bg-white even:bg-[#f8fafc]"
                >
                  <td className="px-3 py-2">{start + index + 1}</td>
                  <td className="px-3 py-2">
                    <div className="leading-tight">
                      <div>{server.server_name ?? `Mikrotik-${server.server_ip}`}</div>
                      <div className={server.is_active ? "text-emerald-600" : "text-rose-500"}>
                        {server.is_active ? "Mikrotik Connected" : "Mikrotik Is InActive"}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{server.server_ip}</td>
                  <td className="px-3 py-2">{server.username}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{showPasswords[server.id] ? server.password : "........"}</span>
                      <button
                        type="button"
                        className="text-sky-500 hover:text-sky-700"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, [server.id]: !prev[server.id] }))
                        }
                      >
                        {showPasswords[server.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">{server.api_port}</td>
                  <td className="px-3 py-2">{server.mikrotik_version}</td>
                  <td className="px-3 py-2">{server.request_timeout_sec} sec.</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                        server.is_active ? "bg-blue-500" : "bg-slate-300"
                      }`}
                      onClick={() => toggleStatus(server)}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                          server.is_active ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button type="button" title="Sync to Mikrotik(only for pppoe)" onClick={() => syncServer(server)} className="text-blue-600 hover:text-blue-700">
                        <RefreshCw className={`h-4 w-4 ${syncingIds[server.id] ? "animate-spin" : ""}`} />
                      </button>
                      <button type="button" title="Edit" onClick={() => openEditModal(server)} className="text-green-600 hover:text-green-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" title="Reload" onClick={() => reloadRow(server)} className="text-violet-600 hover:text-violet-700">
                        <RefreshCw className={`h-4 w-4 ${reloadingIds[server.id] ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                    No servers found.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing {filtered.length === 0 ? 0 : start + 1} to {Math.min(start + pageSize, filtered.length)} of {filtered.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="rounded border border-blue-500 bg-blue-500 px-2 py-1 text-white">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-4 font-semibold text-slate-800">{editing ? "Edit Server" : "Add New Server"}</h3>
              <button type="button" onClick={closeModal} className="text-pink-300 hover:text-pink-400">
                x
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">SERVER IP <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={form.server_ip}
                  onChange={(event) => setForm((prev) => ({ ...prev, server_ip: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">USER NAME <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">PASSWORD <span className="text-red-500">*</span></span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  placeholder={editing ? "Leave blank to keep current" : ""}
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">API PORT <span className="text-red-500">*</span></span>
                <input
                  type="number"
                  value={form.api_port}
                  onChange={(event) => setForm((prev) => ({ ...prev, api_port: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">MIKROTIK VERSION</span>
                <select
                  value={form.mikrotik_version}
                  onChange={(event) => setForm((prev) => ({ ...prev, mikrotik_version: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                >
                  <option value="v3">Version greater 6.43 or older 7.0</option>
                  <option value="v2">Version older 6.43</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">API REQUEST TIMEOUT</span>
                <input
                  type="number"
                  value={form.request_timeout_sec}
                  onChange={(event) => setForm((prev) => ({ ...prev, request_timeout_sec: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={closeModal}
                className="rounded bg-red-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitForm}
                disabled={saving}
                className="rounded bg-blue-500 px-6 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MikrotikServerPage;
