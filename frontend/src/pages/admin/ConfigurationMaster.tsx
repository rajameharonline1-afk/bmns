import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Box, Building2, MapPin, MapPinned, Pencil, Plus, Trash2, Users, Wifi, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([API_BASE, `http://${host}:8000`, "http://localhost:8000", "http://127.0.0.1:8000"]));
})();

const apiFetch = async (path: string, options?: RequestInit) => {
  let networkError: unknown = null;
  for (const base of API_BASES) {
    try {
      return await fetch(`${base}${path}`, options);
    } catch (err) {
      if (err instanceof TypeError) {
        networkError = err;
        continue;
      }
      throw err;
    }
  }
  throw networkError instanceof Error ? networkError : new Error("Failed to fetch");
};

type Kind =
  | "zone"
  | "sub-zone"
  | "box"
  | "connection-type"
  | "client-type"
  | "protocol-type"
  | "billing-status"
  | "package"
  | "district"
  | "upazila";

type ConfigItem = {
  id: number;
  kind: Kind;
  name: string;
  details: string | null;
  zone_name: string | null;
  sub_zone_name: string | null;
  featured_image_path: string | null;
  is_active: boolean;
  package_type: string | null;
  bandwidth_allocation_mb: number | null;
  price: string | null;
  vas: string | null;
  show_on_client_profile: boolean;
  linked_plan_id: number | null;
};

type ListResponse = {
  total: number;
  page: number;
  page_size: number;
  items: ConfigItem[];
};

type ItemForm = {
  name: string;
  details: string;
  zone_name: string;
  sub_zone_name: string;
  featured_image_path: string;
  package_type: string;
  bandwidth_allocation_mb: string;
  price: string;
  vas: string;
  show_on_client_profile: boolean;
};

const createForm = (): ItemForm => ({
  name: "",
  details: "",
  zone_name: "",
  sub_zone_name: "",
  featured_image_path: "",
  package_type: "",
  bandwidth_allocation_mb: "",
  price: "",
  vas: "",
  show_on_client_profile: true,
});

const KINDS: Record<Kind, { title: string; subtitle: string; addLabel: string; icon: typeof MapPin; toggle: boolean }> = {
  zone: { title: "Zone", subtitle: "Configure zone", addLabel: "Zone", icon: MapPin, toggle: false },
  "sub-zone": { title: "Sub Zone", subtitle: "Configure sub zone", addLabel: "Sub Zone", icon: MapPin, toggle: false },
  box: { title: "Box", subtitle: "Configure Box", addLabel: "Box", icon: MapPin, toggle: false },
  "connection-type": { title: "Connection Type", subtitle: "Configure connection Type", addLabel: "Connection Type", icon: Building2, toggle: true },
  "client-type": { title: "Client Type", subtitle: "Configure Client Type", addLabel: "Client Type", icon: Users, toggle: false },
  "protocol-type": { title: "Protocol Type", subtitle: "Configure Protocol Type", addLabel: "Protocol Type", icon: Wifi, toggle: true },
  "billing-status": { title: "Billing Status", subtitle: "Configure Billing Status", addLabel: "Billing Status", icon: BadgeDollarSign, toggle: true },
  package: { title: "Package", subtitle: "Configure Package", addLabel: "Package", icon: Box, toggle: false },
  district: { title: "District", subtitle: "Configure District", addLabel: "District", icon: MapPinned, toggle: false },
  upazila: { title: "Upazila", subtitle: "Configure Upazila", addLabel: "Upazila", icon: MapPinned, toggle: false },
};

const resolveKindFromPath = (pathname: string): Kind => {
  const key = pathname.split("/").pop() as Kind;
  if (key in KINDS) return key;
  return "zone";
};

const toPayload = (kind: Kind, form: ItemForm) => {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    details: form.details.trim() || null,
    zone_name: form.zone_name || null,
    sub_zone_name: form.sub_zone_name || null,
    featured_image_path: form.featured_image_path || null,
    package_type: form.package_type || null,
    bandwidth_allocation_mb: form.bandwidth_allocation_mb ? Number(form.bandwidth_allocation_mb) : null,
    price: form.price ? Number(form.price) : null,
    vas: form.vas.trim() || null,
    show_on_client_profile: form.show_on_client_profile,
  };
  if (kind !== "package") {
    payload.package_type = null;
    payload.bandwidth_allocation_mb = null;
    payload.price = null;
    payload.vas = null;
    payload.show_on_client_profile = true;
  }
  return payload;
};

export default function ConfigurationMaster() {
  const location = useLocation();
  const kind = resolveKindFromPath(location.pathname);
  const meta = KINDS[kind];
  const Icon = meta.icon;
  const { token } = useAuth();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [zones, setZones] = useState<ConfigItem[]>([]);
  const [subZones, setSubZones] = useState<ConfigItem[]>([]);
  const [clientTypes, setClientTypes] = useState<ConfigItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState<ItemForm>(createForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search.trim()) query.set("search", search.trim());
      const res = await apiFetch(`/api/configuration/items/${kind}?${query.toString()}`, { headers: authHeader });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ListResponse;
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [zoneRes, subZoneRes, clientTypeRes] = await Promise.all([
        apiFetch(`/api/configuration/items/zone/all`, { headers: authHeader }),
        apiFetch(`/api/configuration/items/sub-zone/all`, { headers: authHeader }),
        apiFetch(`/api/configuration/items/client-type/all`, { headers: authHeader }),
      ]);
      setZones(zoneRes.ok ? await zoneRes.json() : []);
      setSubZones(subZoneRes.ok ? await subZoneRes.json() : []);
      setClientTypes(clientTypeRes.ok ? await clientTypeRes.json() : []);
    } catch {
      setZones([]);
      setSubZones([]);
      setClientTypes([]);
    }
  };

  useEffect(() => {
    setPage(1);
    setSearch("");
    setOpen(false);
    setEditing(null);
  }, [kind]);

  useEffect(() => {
    loadRows();
  }, [kind, page, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      loadRows();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadDependencies();
  }, [kind]);

  const filteredSubZones = useMemo(
    () => (form.zone_name ? subZones.filter((row) => row.zone_name === form.zone_name || !row.zone_name) : subZones),
    [form.zone_name, subZones]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(createForm());
    setError(null);
    setNotice(null);
    setOpen(true);
  };

  const openEdit = (row: ConfigItem) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      details: row.details || "",
      zone_name: row.zone_name || "",
      sub_zone_name: row.sub_zone_name || "",
      featured_image_path: row.featured_image_path || "",
      package_type: row.package_type || "",
      bandwidth_allocation_mb: row.bandwidth_allocation_mb ? String(row.bandwidth_allocation_mb) : "",
      price: row.price ? String(row.price) : "",
      vas: row.vas || "",
      show_on_client_profile: row.show_on_client_profile,
    });
    setError(null);
    setNotice(null);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (kind === "sub-zone" && !form.zone_name) {
      setError("Zone is required.");
      return;
    }
    if (kind === "box" && (!form.zone_name || !form.sub_zone_name)) {
      setError("Zone and Sub Zone are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = toPayload(kind, form);
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${API_BASE}/api/configuration/items/${kind}/${editing.id}`
        : `${API_BASE}/api/configuration/items/${kind}`;
      const res = await apiFetch(url.replace(API_BASE, ""), {
        method,
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setOpen(false);
      setNotice(editing ? "Updated successfully." : "Created successfully.");
      await loadRows();
      await loadDependencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row: ConfigItem) => {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/configuration/items/${kind}/${row.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error(await res.text());
      await loadRows();
      await loadDependencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleRow = async (row: ConfigItem) => {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/configuration/items/${kind}/${row.id}/toggle`, {
        method: "PATCH",
        headers: authHeader,
      });
      if (!res.ok) throw new Error(await res.text());
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusyId(null);
    }
  };

  const uploadClientTypeImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`/api/configuration/items/image-upload?kind=client-type`, {
        method: "POST",
        headers: authHeader,
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { file_path: string };
      setForm((prev) => ({ ...prev, featured_image_path: data.file_path }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const renderTableHead = () => {
    if (kind === "sub-zone") return ["Serial", "Sub Zone", "Zone", "Details", "Action"];
    if (kind === "box") return ["Serial", "Box", "SubZone", "Zone", "Details", "Action"];
    if (kind === "client-type") return ["Serial", "Featured Image", "Client Type", "Details", "Action"];
    if (kind === "package") return ["Serial", "Package Name", "Package Type", "B. Allocated MB", "Price", "Description", "Action"];
    if (meta.toggle) return ["Serial", meta.title, "Details", "Action"];
    if (kind === "district") return ["Serial", "District Name", "Details", "Action"];
    if (kind === "upazila") return ["Serial", "Upazila Name", "Details", "Action"];
    return ["Serial", "Zone Name", "Details", "Action"];
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[36px] font-semibold text-[#123b5b]">
          <Icon className="h-7 w-7" />
          {meta.title}
          <span className="text-base font-normal text-slate-400">{meta.subtitle}</span>
        </h2>
        <div className="text-xs text-slate-500">Configuration &gt; {meta.title}</div>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}

      <div className="ds-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>SHOW</span>
            <select className="rounded border border-slate-300 px-2 py-1" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <span>ENTRIES</span>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1 rounded-full bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white shadow-md">
            <Plus className="h-4 w-4" />
            {meta.addLabel}
          </button>
        </div>

        <div className="mb-2 flex justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            SEARCH:
            <input className="w-40 rounded border border-slate-300 px-2 py-1 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table min-w-full border border-slate-200 text-sm">
            <thead>
              <tr>{renderTableHead().map((head) => <th key={head} className="border border-white/20 px-3 py-2 text-center">{head}</th>)}</tr>
            </thead>
            <tbody className="bg-white text-slate-700">
              {loading ? (
                <tr><td className="px-3 py-6 text-center" colSpan={8}>Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-3 py-6 text-center" colSpan={8}>No records found.</td></tr>
              ) : items.map((row, index) => (
                <tr key={row.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-center">{(page - 1) * pageSize + index + 1}</td>
                  {kind === "sub-zone" ? (
                    <>
                      <td className="px-3 py-2 text-center">{row.name}</td>
                      <td className="px-3 py-2 text-center">{row.zone_name ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{row.details ?? ""}</td>
                    </>
                  ) : kind === "box" ? (
                    <>
                      <td className="px-3 py-2 text-center">{row.name}</td>
                      <td className="px-3 py-2 text-center">{row.sub_zone_name ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{row.zone_name ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{row.details ?? ""}</td>
                    </>
                  ) : kind === "client-type" ? (
                    <>
                      <td className="px-3 py-2 text-center">
                        {row.featured_image_path ? (
                          <img src={`${API_BASE}${row.featured_image_path}`} alt={row.name} className="mx-auto h-16 w-16 rounded object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">No Image</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{row.name}</td>
                      <td className="px-3 py-2">{row.details ?? ""}</td>
                    </>
                  ) : kind === "package" ? (
                    <>
                      <td className="px-3 py-2 text-center">{row.name}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-xl px-2 py-0.5 text-xs font-semibold text-white ${row.package_type?.toLowerCase().includes("personal") ? "bg-amber-500" : "bg-emerald-600"}`}>
                          {row.package_type || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{row.bandwidth_allocation_mb ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{row.price ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{row.details ?? ""}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center">{row.name}</td>
                      <td className="px-3 py-2 text-center">{row.details ?? ""}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-center">
                    <div className="inline-flex items-center gap-3">
                      <button type="button" title="Edit" onClick={() => openEdit(row)} className="text-emerald-600 hover:text-emerald-700"><Pencil className="h-4 w-4" /></button>
                      <button type="button" title="Delete" disabled={busyId === row.id} onClick={() => removeRow(row)} className="text-rose-600 hover:text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                      {meta.toggle ? (
                        <button
                          type="button"
                          title={row.is_active ? "Deactivate" : "Activate"}
                          disabled={busyId === row.id}
                          onClick={() => toggleRow(row)}
                          className={`ds-toggle ${row.is_active ? "on" : "off"}`}
                        >
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <div>
            Showing {items.length ? (page - 1) * pageSize + 1 : 0} to {(page - 1) * pageSize + items.length} of {total} entries
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="text-slate-500 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <span className="rounded bg-[#2490ea] px-2 py-1 text-white">{page}</span>
            <button type="button" className="text-slate-500 disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="ds-modal-backdrop z-40 flex items-start justify-center px-3 pt-16">
          <div className="ds-modal w-full max-w-[520px] p-6">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-[40px] font-semibold text-slate-700">{editing ? `Edit ${meta.title}` : `Add ${meta.title}`}</h3>
              <button type="button" className="text-slate-400" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <form className="space-y-2" onSubmit={submit}>
              {(kind === "sub-zone" || kind === "box") ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Zone <span className="text-red-500">*</span></label>
                  <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.zone_name} onChange={(e) => setForm((prev) => ({ ...prev, zone_name: e.target.value, sub_zone_name: "" }))}>
                    <option value="">Select</option>
                    {zones.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                  </select>
                </div>
              ) : null}

              {kind === "box" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Sub Zone <span className="text-red-500">*</span></label>
                  <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.sub_zone_name} onChange={(e) => setForm((prev) => ({ ...prev, sub_zone_name: e.target.value }))}>
                    <option value="">Select</option>
                    {filteredSubZones.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                  </select>
                </div>
              ) : null}

              {kind === "package" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Client Type</label>
                  <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.package_type} onChange={(e) => setForm((prev) => ({ ...prev, package_type: e.target.value }))}>
                    <option value="">Select</option>
                    {clientTypes.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  {kind === "district" ? "District" : kind === "upazila" ? "Upazila" : kind === "connection-type" ? "Connection Type" : kind === "protocol-type" ? "Protocol Type" : kind === "client-type" ? "Client Type" : kind === "billing-status" ? "Billing Status" : kind === "package" ? "Package Name" : kind === "sub-zone" ? "Sub Zone" : kind === "box" ? "Box" : "Zone"} <span className="text-red-500">*</span>
                </label>
                <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>

              {kind === "package" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Price <span className="text-red-500">*</span></label>
                    <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Bandwidth_Allocation MB <span className="text-red-500">*</span></label>
                    <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.bandwidth_allocation_mb} onChange={(e) => setForm((prev) => ({ ...prev, bandwidth_allocation_mb: e.target.value }))} />
                  </div>
                </>
              ) : null}

              {kind === "client-type" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Featured Image</label>
                  <input type="file" className="w-full text-sm" accept="image/*" onChange={(e) => uploadClientTypeImage(e.target.files?.[0] ?? null)} />
                  {uploading ? <p className="mt-1 text-xs text-slate-500">Uploading...</p> : null}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Details(Optional)</label>
                <textarea className="h-[56px] w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.details} onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))} />
              </div>

              {kind === "package" ? (
                <div className="flex items-center justify-between pt-2 text-sm font-semibold text-slate-600">
                  <span>Do you want this to be displayed on your client profile?</span>
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, show_on_client_profile: !prev.show_on_client_profile }))} className={`ds-toggle ${form.show_on_client_profile ? "on" : "off"}`} />
                </div>
              ) : null}

              {kind === "package" ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button type="button" className="rounded bg-[#ff473a] px-3 py-2 text-sm font-semibold text-white" onClick={() => setForm(createForm())}>Clear</button>
                  <button type="submit" disabled={saving} className="rounded bg-[#2a8fe5] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70">{saving ? "Saving..." : "Save"}</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button type="button" className="rounded bg-[#ff473a] px-3 py-2 text-sm font-semibold text-white" onClick={() => setForm(createForm())}>Clear</button>
                    <button type="submit" disabled={saving} className="rounded bg-[#2a8fe5] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70">{saving ? "Saving..." : "Save"}</button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button type="button" className="rounded bg-[#ff473a] px-6 py-2 text-sm font-semibold text-white" onClick={() => setOpen(false)}>Close</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
