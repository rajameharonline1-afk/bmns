import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Plus, RefreshCw, Search, Trash2, Pencil } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Olt = {
  id: number;
  ip_address: string;
  community: string | null;
  username: string | null;
  password: string | null;
  snmp_port: number;
  olt_type: string;
  is_active: boolean;
};

type FormState = {
  ip_address: string;
  community: string;
  username: string;
  password: string;
  snmp_port: string;
  olt_type: string;
};

const emptyForm: FormState = {
  ip_address: "",
  community: "",
  username: "",
  password: "",
  snmp_port: "161",
  olt_type: "",
};

const oltTypes = ["VSOL_EPON", "VSOL_EPON_TYPE_2", "VSOL_GPON", "BDCOM", "HUAWEI", "OTHER"];

const request = async (path: string, options: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  if (response.status === 204) return null;
  return response.json();
};

const OltManage = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<Olt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Olt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const loadItems = async (preserveError = false) => {
    setIsLoading(true);
    if (!preserveError) setError(null);
    try {
      const data = await request("/api/olts", { headers: authHeader });
      setItems(data as Olt[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OLTs");
    } finally {
      setIsLoading(false);
    }
  };

  const syncAll = async () => {
    try {
      const data = (await request("/api/olts/sync", { method: "POST", headers: authHeader })) as {
        errors?: { id: number; ip_address: string; error: string }[];
      };
      if (data?.errors?.length) {
        const message = data.errors.map((item) => `${item.ip_address}: ${item.error}`).join(" | ");
        setError(message);
      } else {
        setError(null);
      }
      await loadItems(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync OLTs");
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.ip_address, item.community ?? "", item.username ?? "", item.olt_type]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [items, search]);

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
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (item: Olt) => {
    setEditing(item);
    setForm({
      ip_address: item.ip_address,
      community: item.community ?? "",
      username: item.username ?? "",
      password: item.password ?? "",
      snmp_port: String(item.snmp_port ?? 161),
      olt_type: item.olt_type,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
  };

  const submitForm = async () => {
    if (!form.ip_address || !form.olt_type) {
      setError("IP Address and OLT Type are required.");
      return;
    }

    const parseIpPort = () => {
      const raw = form.ip_address.trim();
      let host = raw;
      let port = Number(form.snmp_port || 161);
      if (raw.includes(":")) {
        const parts = raw.split(":");
        host = parts[0] || raw;
        const parsed = Number(parts[1]);
        if (!Number.isNaN(parsed)) {
          port = parsed;
        }
      }
      return { host, port };
    };

    const { host, port } = parseIpPort();

    const payload: any = {
      ip_address: host,
      community: form.community || null,
      username: form.username || null,
      snmp_port: port,
      olt_type: form.olt_type,
    };
    if (form.password) {
      payload.password = form.password;
    }

    try {
      setError(null);
      if (editing) {
        await request(`/api/olts/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      } else {
        await request("/api/olts", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
      }
      await loadItems();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save OLT");
    }
  };

  const deleteItem = async (item: Olt) => {
    if (!confirm(`Delete OLT ${item.ip_address}?`)) return;
    try {
      await request(`/api/olts/${item.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete OLT");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">OLT</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-800">OLTManage</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-600">OLT</span> &gt; <span className="text-slate-700">OLT Manage</span>
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#21425a] px-3 py-1.5 text-xs font-semibold text-white shadow"
            onClick={syncAll}
          >
            <RefreshCw className="h-4 w-4" />
            Sync All OLTs
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#21425a] px-3 py-1.5 text-xs font-semibold text-white shadow"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Add OLT
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
            <span className="text-xs text-slate-500">Search:</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-48 rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
        </div>

        {error && <div className="px-4 py-2 text-xs text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-[#21425a] text-white">
              <tr>
                <th className="border-r border-white/20 px-3 py-2 text-left">Serial</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Ip</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Community</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">OLTType</th>
                <th className="border-r border-white/20 px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-200 text-slate-700 odd:bg-white even:bg-[#f8fafc]">
                  <td className="px-3 py-2">{start + index + 1}</td>
                  <td className="px-3 py-2">{`${item.ip_address}:${item.snmp_port ?? 161}`}</td>
                  <td className="px-3 py-2">{item.community ?? ""}</td>
                  <td className="px-3 py-2">{item.olt_type}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                          item.is_active ? "bg-green-500" : "bg-slate-400"
                        }`}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </span>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <button type="button" onClick={() => openEditModal(item)} className="hover:text-green-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={syncAll} className="hover:text-purple-600">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => deleteItem(item)} className="hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No OLTs found.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
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
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{editing ? "Edit OLT" : "Add OLT"}</h3>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-700">
                ?
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">
                  IP ADDRESS <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={form.ip_address}
                  onChange={(event) => setForm((prev) => ({ ...prev, ip_address: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  placeholder="Enter IP and Port (e.g., 192.168.43.241:23)"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">PORT</span>
                <input
                  type="number"
                  value={form.snmp_port}
                  onChange={(event) => setForm((prev) => ({ ...prev, snmp_port: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">COMMUNITY</span>
                <input
                  type="text"
                  value={form.community}
                  onChange={(event) => setForm((prev) => ({ ...prev, community: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">USERNAME</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">PASSWORD</span>
                <div className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">
                  OLT TYPE <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.olt_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, olt_type: event.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">Select</option>
                  {oltTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="rounded bg-red-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={submitForm}
                className="rounded bg-blue-500 px-6 py-2 text-xs font-semibold text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="ml-auto rounded bg-red-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OltManage;
