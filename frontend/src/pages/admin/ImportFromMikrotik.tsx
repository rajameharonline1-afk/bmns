import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type RouterOption = {
  id: number;
  name: string;
  ip: string;
};

type PreviewRow = {
  pppoe_id: string;
  password: string | null;
  comment: string | null;
  client: string | null;
  mobile: string | null;
  profile: string | null;
  package: string | null;
  price: number | null;
  status: string | null;
  selected?: boolean;
  dirty?: boolean;
};

type Toast = { type: "success" | "error"; message: string } | null;

const request = async (path: string, options: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  if (response.status === 204) return null;
  return response.json();
};

const toMonthValue = (date = new Date()) => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const extractClientNameFromComment = (comment: string | null) => {
  const source = (comment ?? "").trim();
  if (!source) return "";
  const labelled = source.match(/client\s*name\s*[:\-]\s*([A-Za-z][A-Za-z .]*)/i);
  let name = labelled ? labelled[1] : source;
  name = name.replace(/(?:\+?88)?01[3-9]\d{8}/g, " ");
  name = name.replace(/\b(name|client)\s*[:\-]\s*/gi, " ");
  name = name.replace(/[|_,:]+/g, " ");
  name = name.replace(/\s+/g, " ").trim();
  return name.split("-")[0].trim();
};

const ImportFromMikrotik = () => {
  const { token } = useAuth();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [routers, setRouters] = useState<RouterOption[]>([]);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedRouter, setSelectedRouter] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [invoiceMonth, setInvoiceMonth] = useState(toMonthValue());

  const [noOverwrite] = useState(true);
  const [importClientName, setImportClientName] = useState(true);
  const [importMobile, setImportMobile] = useState(true);
  const [importStatus, setImportStatus] = useState(true);
  const [importPackageAndBill, setImportPackageAndBill] = useState(true);
  const [importPppoePasswords, setImportPppoePasswords] = useState(true);
  const [generateFirstInvoice] = useState(false);

  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const notify = (type: "success" | "error", message: string) => setToast({ type, message });

  const loadBaseData = async (routerId?: string) => {
    setIsLoadingOptions(true);
    try {
      const optionResponse = await request(
        `/api/mikrotik-servers/import-from-mikrotik/options${routerId ? `?router_id=${routerId}` : ""}`,
        { headers: authHeader }
      );
      setRouters(optionResponse.routers ?? []);
      setProfiles(optionResponse.profiles ?? []);
      if (!selectedRouter && optionResponse.routers?.length) {
        setSelectedRouter(String(optionResponse.routers[0].id));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load form options";
      notify("error", message);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      return [row.pppoe_id, row.mobile ?? "", row.client ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [rows, search]);

  const handlePreview = async () => {
    if (!selectedRouter) {
      notify("error", "Please select router.");
      return;
    }

    setIsLoadingPreview(true);
    try {
      const payload = {
        router_id: Number(selectedRouter),
        profile: selectedProfile || null,
        invoice_month: `${invoiceMonth}-01`,
        import_client_name: importClientName,
        import_mobile: importMobile,
        import_status: importStatus,
        import_package_and_bill: importPackageAndBill,
        import_pppoe_passwords: importPppoePasswords,
      };
      const preview = await request("/api/mikrotik-servers/import-from-mikrotik/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });
      const incomingRows: PreviewRow[] = (preview.rows ?? []).map((row: PreviewRow) => ({
        ...row,
        client: extractClientNameFromComment(row.comment) || null,
        selected: false,
        dirty: false,
      }));
      setRows(incomingRows);
      setWarnings(preview.warnings ?? []);
      setSearch("");
      setSelectAll(false);
      notify("success", `Preview loaded: ${incomingRows.length} users.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load preview";
      notify("error", message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const updateRow = (pppoeId: string, patch: Partial<PreviewRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.pppoe_id === pppoeId ? { ...row, ...patch, dirty: true } : row))
    );
  };

  const handleToggleRow = (pppoeId: string, checked: boolean) => {
    setRows((prev) => prev.map((row) => (row.pppoe_id === pppoeId ? { ...row, selected: checked } : row)));
  };

  const handleToggleAll = (checked: boolean) => {
    setSelectAll(checked);
    setRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  };

  const profileOptions = selectedProfile
    ? profiles
    : ["-- Select Profile --", ...profiles];

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

      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-4 font-semibold text-slate-700">Import Mikrotik Users (PPPoE)</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Router *</span>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2"
              value={selectedRouter}
              onChange={async (event) => {
                const value = event.target.value;
                setSelectedRouter(value);
                await loadBaseData(value);
              }}
              disabled={isLoadingOptions}
            >
              {!selectedRouter && <option value="">-- Select Router --</option>}
              {routers.map((router) => (
                <option key={router.id} value={router.id}>
                  {router.name} ({router.ip})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Profile *</span>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2"
              value={selectedProfile}
              onChange={(event) => setSelectedProfile(event.target.value === "-- Select Profile --" ? "" : event.target.value)}
              disabled={isLoadingOptions}
            >
              {profileOptions.map((profile) => (
                <option key={profile} value={profile === "-- Select Profile --" ? "" : profile}>
                  {profile}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Invoice Month</span>
            <input
              type="month"
              value={invoiceMonth}
              onChange={(event) => setInvoiceMonth(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noOverwrite} readOnly />
            <span>Do not overwrite existing client name/mobile</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={importClientName} onChange={(event) => setImportClientName(event.target.checked)} />
            <span>Import client name</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={importMobile} onChange={(event) => setImportMobile(event.target.checked)} />
            <span>Import mobile</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={importStatus} onChange={(event) => setImportStatus(event.target.checked)} />
            <span>Import status</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={importPackageAndBill}
              onChange={(event) => setImportPackageAndBill(event.target.checked)}
            />
            <span>Import package & bill</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={importPppoePasswords}
              onChange={(event) => setImportPppoePasswords(event.target.checked)}
            />
            <span>Import PPPoE passwords</span>
          </label>
          <label className="flex items-center gap-2 text-slate-400">
            <input type="checkbox" checked={generateFirstInvoice} readOnly disabled />
            <span>Generate first invoice</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={isLoadingPreview}
          className="mt-4 inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isLoadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Load Preview
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-3 font-semibold text-slate-700">Preview</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="Search PPPoE ID or Mobile"
              />
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={selectAll} onChange={(event) => handleToggleAll(event.target.checked)} />
                <span>Select all</span>
              </label>
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />
                <span>Show passwords</span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#21425a] text-white">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={selectAll} onChange={(event) => handleToggleAll(event.target.checked)} />
                  </th>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">PPPoE ID</th>
                  <th className="px-3 py-2 text-left">Password</th>
                  <th className="px-3 py-2 text-left">Comment</th>
                  <th className="px-3 py-2 text-left">Mobile</th>
                  <th className="px-3 py-2 text-left">Profile</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.pppoe_id} className="border-b border-slate-200">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(row.selected)}
                        onChange={(event) => handleToggleRow(row.pppoe_id, event.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">{extractClientNameFromComment(row.comment)}</td>
                    <td className="px-3 py-2">{row.pppoe_id}</td>
                    <td className="px-3 py-2">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={row.password ?? ""}
                        onChange={(event) => updateRow(row.pppoe_id, { password: event.target.value })}
                        className="w-28 rounded border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block min-w-40 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                        {row.comment ?? ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.mobile ?? ""}
                        onChange={(event) => updateRow(row.pppoe_id, { mobile: event.target.value })}
                        className="w-32 rounded border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.profile ?? ""}
                        onChange={(event) => updateRow(row.pppoe_id, { profile: event.target.value })}
                        className="w-32 rounded border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status ?? "active"}
                        onChange={(event) => updateRow(row.pppoe_id, { status: event.target.value })}
                        className="rounded border border-slate-300 px-2 py-1"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setSavingRowId(row.pppoe_id);
                          try {
                            const updated = await request("/api/mikrotik-servers/import-from-mikrotik/update-row", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", ...authHeader },
                              body: JSON.stringify({
                                router_id: Number(selectedRouter),
                                pppoe_id: row.pppoe_id,
                                client: row.client,
                                mobile: row.mobile,
                                profile: row.profile,
                                package: row.package,
                                status: row.status,
                                password: row.password,
                              }),
                            });
                            updateRow(row.pppoe_id, {
                              comment: updated.comment ?? null,
                              client: extractClientNameFromComment(updated.comment ?? null) || null,
                              mobile: updated.mobile ?? null,
                              profile: updated.profile ?? null,
                              status: updated.status ?? null,
                              password: updated.password ?? null,
                              dirty: false,
                            });
                            notify("success", `Updated ${row.pppoe_id}`);
                          } catch (error) {
                            const message = error instanceof Error ? error.message : "Update failed";
                            notify("error", message);
                          } finally {
                            setSavingRowId(null);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1 hover:bg-slate-50"
                      >
                        {savingRowId === row.pppoe_id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {warnings.length > 0 ? (
            <div className="mt-3 rounded border border-amber-200 bg-amber-100 px-3 py-2 text-amber-800">
              {warnings.join(" ")}
            </div>
          ) : null}

        </div>
      ) : null}
    </section>
  );
};

export default ImportFromMikrotik;
