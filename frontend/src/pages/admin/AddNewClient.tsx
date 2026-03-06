import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleUserRound, FileImage, Loader2, PenSquare, UserPlus, Contact, Wifi, BriefcaseBusiness, Plus, X } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([API_BASE, `http://${host}:8001`, "http://localhost:8001", "http://127.0.0.1:8001", `http://${host}:8000`, "http://localhost:8000", "http://127.0.0.1:8000"]));
})();

type OptionItem = { value: string; label: string };
type PackageItem = { id: number; name: string; price: string };
type OptionsResponse = {
  packages: PackageItem[];
  servers: OptionItem[];
  protocol_types: OptionItem[];
  zones: OptionItem[];
  sub_zones: OptionItem[];
  boxes: OptionItem[];
  connection_types: OptionItem[];
  client_types: OptionItem[];
  billing_statuses: OptionItem[];
  employees: OptionItem[];
  districts: OptionItem[];
  upazilas: OptionItem[];
  references: OptionItem[];
};
type QuickConfigKind = "zone" | "sub-zone" | "box" | "package" | "client-type";
type QuickConfigForm = {
  name: string;
  details: string;
  zone_name: string;
  sub_zone_name: string;
  package_type: string;
  bandwidth_allocation_mb: string;
  price: string;
};

type FormState = {
  client_code: string;
  customer_name: string;
  remarks: string;
  nid_or_certificate_no: string;
  registration_perm_no: string;
  father_name: string;
  mother_name: string;
  gender: string;
  date_of_birth: string;
  profile_picture_path: string;
  nid_picture_path: string;
  registration_picture_path: string;
  map_latitude: string;
  map_longitude: string;
  mobile_number: string;
  district: string;
  upazila: string;
  road_no: string;
  house_no: string;
  present_address: string;
  email_address: string;
  serial: string;
  server_id: string;
  protocol_type: string;
  zone: string;
  sub_zone: string;
  box: string;
  connection_type: string;
  cable_required_meter: string;
  fiber_code: string;
  number_of_core: string;
  core_color: string;
  device: string;
  device_serial_no: string;
  vendor: string;
  purchase_date: string;
  package_id: string;
  profile: string;
  client_type: string;
  billing_status: string;
  username: string;
  password: string;
  owner_name_relation_in_billing: string;
  monthly_bill: string;
  billing_starting_from: string;
  expire_date: string;
  ui_expire_days: string;
  ui_billing_start_month: string;
  reference_by: string;
  vat_percent_client: string;
  connection_by: string;
  send_greetings_sms: boolean;
};

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const createInitialForm = (): FormState => ({
  client_code: "",
  customer_name: "",
  remarks: "",
  nid_or_certificate_no: "",
  registration_perm_no: "",
  father_name: "",
  mother_name: "",
  gender: "",
  date_of_birth: "",
  profile_picture_path: "",
  nid_picture_path: "",
  registration_picture_path: "",
  map_latitude: "",
  map_longitude: "",
  mobile_number: "",
  district: "",
  upazila: "",
  road_no: "",
  house_no: "",
  present_address: "",
  email_address: "",
  serial: "",
  server_id: "",
  protocol_type: "",
  zone: "",
  sub_zone: "",
  box: "",
  connection_type: "",
  cable_required_meter: "",
  fiber_code: "",
  number_of_core: "",
  core_color: "",
  device: "",
  device_serial_no: "",
  vendor: "",
  purchase_date: "",
  package_id: "",
  profile: "",
  client_type: "",
  billing_status: "",
  username: "",
  password: "",
  owner_name_relation_in_billing: getTodayIso(),
  monthly_bill: "",
  billing_starting_from: "",
  expire_date: "",
  ui_expire_days: "",
  ui_billing_start_month: "",
  reference_by: "",
  vat_percent_client: "",
  connection_by: "",
  send_greetings_sms: false,
});

const request = async (path: string, options: RequestInit) => {
  let fallbackError: Error | null = null;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, options);
      if (response.ok) {
        if (response.status === 204) return null;
        return response.json();
      }

      // Wrong service/route candidate (e.g. Django on :8000), try next base.
      if (response.status === 404 || response.status === 405) {
        continue;
      }

      let message = response.statusText || "Request failed";
      try {
        const payload = await response.json();
        if (typeof payload?.detail === "string") {
          message = payload.detail;
        } else if (typeof payload?.message === "string") {
          message = payload.message;
        }
      } catch {
        const text = await response.text();
        if (text) message = text;
      }
      throw new Error(message);
    } catch (err) {
      if (err instanceof TypeError) {
        fallbackError = err;
        continue;
      }
      fallbackError = err instanceof Error ? err : new Error("Failed to fetch");
      continue;
    }
  }
  throw fallbackError ?? new Error("Failed to fetch");
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-md border border-slate-200 bg-[#f8fafc]">
    <div className="rounded-t-md bg-[#234a69] px-4 py-2 text-[11px] font-semibold text-white">{title}</div>
    <div className="space-y-3 p-3">{children}</div>
  </div>
);

const FieldLabel = ({ text, required = false }: { text: string; required?: boolean }) => (
  <label className="mb-1.5 block text-sm font-bold uppercase tracking-[0.03em] text-slate-700">
    {text} {required ? <span className="ml-0.5 text-base font-extrabold leading-none text-red-600">*</span> : null}
  </label>
);

export default function AddNewClient() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [form, setForm] = useState<FormState>(createInitialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<"" | "profile" | "nid" | "registration">("");
  const [serverProfiles, setServerProfiles] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<"" | "checking" | "available" | "not_available">("");
  const [clientCodeHint, setClientCodeHint] = useState<string>("");
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const nidInputRef = useRef<HTMLInputElement | null>(null);
  const regInputRef = useRef<HTMLInputElement | null>(null);
  const [previewPath, setPreviewPath] = useState({
    profile: "",
    nid: "",
    registration: "",
  });
  const [quickKind, setQuickKind] = useState<QuickConfigKind | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState<QuickConfigForm>({
    name: "",
    details: "",
    zone_name: "",
    sub_zone_name: "",
    package_type: "",
    bandwidth_allocation_mb: "",
    price: "",
  });

  const loadOptions = async () => {
    const data = (await request("/api/clients/add-new/options", { headers: authHeader })) as OptionsResponse;
    setOptions(data);
    return data;
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadOptions();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load form options";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!options?.servers?.length) return;
    if (!form.server_id) {
      const first = options.servers[0].value;
      setField("server_id", first);
      loadServerProfiles(first);
    }
  }, [options]);

  const packagePrice = useMemo(() => {
    if (!options || !form.package_id) return "";
    return options.packages.find((pkg) => pkg.id === Number(form.package_id))?.price ?? "";
  }, [options, form.package_id]);

  const setField = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openQuickModal = (kind: QuickConfigKind) => {
    setQuickError(null);
    setQuickKind(kind);
    setQuickForm({
      name: "",
      details: "",
      zone_name: form.zone || "",
      sub_zone_name: form.sub_zone || "",
      package_type: form.client_type || "",
      bandwidth_allocation_mb: "",
      price: "",
    });
  };

  const saveQuickConfig = async () => {
    if (!quickKind) return;
    if (!quickForm.name.trim()) {
      setQuickError("Name is required.");
      return;
    }
    if (quickKind === "sub-zone" && !quickForm.zone_name) {
      setQuickError("Zone is required.");
      return;
    }
    if (quickKind === "box" && (!quickForm.zone_name || !quickForm.sub_zone_name)) {
      setQuickError("Zone and Sub Zone are required.");
      return;
    }
    if (quickKind === "package" && (!quickForm.price || !quickForm.bandwidth_allocation_mb)) {
      setQuickError("Price and Bandwidth are required.");
      return;
    }

    setQuickSaving(true);
    setQuickError(null);
    try {
      const payload: Record<string, unknown> = {
        name: quickForm.name.trim(),
        details: quickForm.details.trim() || null,
      };
      if (quickKind === "sub-zone" || quickKind === "box") payload.zone_name = quickForm.zone_name || null;
      if (quickKind === "box") payload.sub_zone_name = quickForm.sub_zone_name || null;
      if (quickKind === "package") {
        payload.package_type = quickForm.package_type || null;
        payload.price = Number(quickForm.price);
        payload.bandwidth_allocation_mb = Number(quickForm.bandwidth_allocation_mb);
      }

      await request(`/api/configuration/items/${quickKind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });

      const latest = await loadOptions();
      if (quickKind === "zone") setField("zone", quickForm.name.trim());
      if (quickKind === "sub-zone") setField("sub_zone", quickForm.name.trim());
      if (quickKind === "box") setField("box", quickForm.name.trim());
      if (quickKind === "client-type") setField("client_type", quickForm.name.trim());
      if (quickKind === "package") {
        const found = latest.packages.find((pkg) => pkg.name === quickForm.name.trim());
        if (found) setField("package_id", String(found.id));
      }
      setQuickKind(null);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setQuickSaving(false);
    }
  };

  const resolvePreviewSrc = (kind: "profile" | "nid" | "registration") => {
    const local = previewPath[kind];
    if (local) return local;
    if (kind === "profile" && form.profile_picture_path) return `${API_BASE}${form.profile_picture_path}`;
    if (kind === "nid" && form.nid_picture_path) return `${API_BASE}${form.nid_picture_path}`;
    if (kind === "registration" && form.registration_picture_path) return `${API_BASE}${form.registration_picture_path}`;
    return "";
  };

  const loadServerProfiles = async (serverId: string) => {
    if (!serverId) {
      setServerProfiles([]);
      return;
    }
    setProfileLoading(true);
    try {
      const response = (await request(`/api/clients/add-new/server-profiles?server_id=${serverId}`, {
        headers: authHeader,
      })) as { profiles: string[] };
      setServerProfiles(response.profiles ?? []);
    } catch {
      setServerProfiles([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const checkUsernameAvailability = async () => {
    if (!form.server_id || !form.username.trim()) {
      setUsernameAvailability("");
      return;
    }
    setUsernameAvailability("checking");
    try {
      const response = (await request(
        `/api/clients/add-new/username-check?server_id=${form.server_id}&username=${encodeURIComponent(form.username.trim())}`,
        { headers: authHeader }
      )) as { available: boolean };
      setUsernameAvailability(response.available ? "available" : "not_available");
    } catch {
      setUsernameAvailability("");
    }
  };

  const suggestClientCode = async () => {
    try {
      const response = (await request("/api/clients/add-new/suggest-client-code", {
        headers: authHeader,
      })) as { client_code: string };
      setField("client_code", response.client_code);
      setClientCodeHint(`Suggested: ${response.client_code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suggest client code");
    }
  };

  useEffect(() => {
    if (!form.server_id || !form.username.trim()) {
      setUsernameAvailability("");
      return;
    }
    setUsernameAvailability("checking");
    const timer = window.setTimeout(() => {
      checkUsernameAvailability();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.server_id, form.username]);

  const uploadImage = async (kind: "profile" | "nid" | "registration", file: File | null) => {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setPreviewPath((prev) => ({ ...prev, [kind]: localPreview }));
    setUploadingKind(kind);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = (await request(`/api/clients/add-new/upload?kind=${kind}`, {
        method: "POST",
        headers: authHeader,
        body: formData,
      })) as { file_path: string };
      if (kind === "profile") setField("profile_picture_path", data.file_path);
      if (kind === "nid") setField("nid_picture_path", data.file_path);
      if (kind === "registration") setField("registration_picture_path", data.file_path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploadingKind("");
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.server_id || !form.customer_name || !form.username || !form.password) {
      setError("Server, Customer Name, Username, and Password are required.");
      return;
    }
    if (!form.client_code.trim()) {
      setError("Client Code is required. You can enter manually or click Auto Suggest.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      const joiningDate = form.owner_name_relation_in_billing || getTodayIso();
      const expireDayOfMonth = Number(form.ui_expire_days || 0);
      const monthName = form.ui_billing_start_month;
      const monthNumber = monthNameToNumber[monthName] ?? "";
      const joinDate = new Date(`${joiningDate}T00:00:00`);
      const targetYear = Number.isNaN(joinDate.getTime()) ? new Date().getFullYear() : joinDate.getFullYear();
      const targetMonth = monthNumber ? Number(monthNumber) : (Number.isNaN(joinDate.getTime()) ? new Date().getMonth() + 1 : joinDate.getMonth() + 1);

      if (monthNumber) {
        payload.billing_starting_from = `${targetYear}-${monthNumber}-01`;
      }

      if (expireDayOfMonth > 0) {
        const maxDay = new Date(targetYear, targetMonth, 0).getDate();
        const safeDay = Math.min(expireDayOfMonth, maxDay);
        payload.expire_date = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
      }

      payload.server_id = form.server_id ? Number(form.server_id) : null;
      payload.package_id = form.package_id ? Number(form.package_id) : null;
      payload.monthly_bill = form.monthly_bill ? Number(form.monthly_bill) : null;
      delete payload.ui_expire_days;
      delete payload.ui_billing_start_month;

      for (const key of Object.keys(payload)) {
        if (payload[key] === "") payload[key] = null;
      }

      const result = await request("/api/clients/add-new", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });
      setMessage(`Client created successfully. Username: ${result.username}`);
      setForm(createInitialForm());
      setClientCodeHint("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create client";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const option = (items: OptionItem[] | undefined) =>
    items?.map((item) => (
      <option key={item.value} value={item.value}>
        {item.label}
      </option>
    ));

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Add New Client...
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[40px] font-semibold text-[#123b5b]"><UserPlus className="h-7 w-7" />Client <span className="text-2xl font-normal text-slate-400">Add New Client</span></h2>
        <div className="text-xs text-slate-500">Client &gt; Add New Client</div>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

      <Section title={
        <span className="inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Personal Information</span>
          <span className="font-normal">Fill Up All Required(<span className="text-red-400">*</span>) Field Data</span>
        </span>
      }>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:row-span-3 flex flex-col items-center justify-center p-1">
            <FieldLabel text="Profile Picture" />
            <div className="relative mt-1 flex h-36 w-36 items-center justify-center rounded-full border border-slate-300 bg-slate-100">
              {resolvePreviewSrc("profile") ? (
                <img src={resolvePreviewSrc("profile")} alt="Profile" className="h-36 w-36 rounded-full object-cover" />
              ) : (
                <CircleUserRound className="h-24 w-24 text-slate-300" />
              )}
              <button type="button" onClick={() => profileInputRef.current?.click()} className="absolute right-1 top-1 rounded-full bg-[#1f4e6e] p-1 text-white">
                <PenSquare className="h-3 w-3" />
              </button>
              <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage("profile", e.target.files?.[0] ?? null)} />
            </div>
            <span className="mt-2 text-[11px] text-slate-500">{uploadingKind === "profile" ? "Uploading..." : form.profile_picture_path ? "Uploaded" : ""}</span>
          </div>
          <div>
            <FieldLabel text="Customer Name" required />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.customer_name} onChange={(e) => setField("customer_name", e.target.value)} />
          </div>
          <div className="md:row-span-2 md:col-span-2">
            <FieldLabel text="Remarks/Special Note" />
            <textarea className="h-[94px] w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="NID/Birth Certificate No" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.nid_or_certificate_no} onChange={(e) => setField("nid_or_certificate_no", e.target.value)} />
          </div>
          <div className="md:row-span-2 flex flex-col items-center justify-center p-1">
            <FieldLabel text="NID/Birth Certificate Picture" />
            <div className="relative mt-1 flex h-32 w-32 items-center justify-center rounded-full border border-slate-300 bg-slate-100">
              {resolvePreviewSrc("nid") ? (
                <img src={resolvePreviewSrc("nid")} alt="NID" className="h-32 w-32 rounded-full object-cover" />
              ) : (
                <FileImage className="h-20 w-20 text-slate-300" />
              )}
              <button type="button" onClick={() => nidInputRef.current?.click()} className="absolute right-1 top-1 rounded-full bg-[#1f4e6e] p-1 text-white">
                <PenSquare className="h-3 w-3" />
              </button>
              <input ref={nidInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage("nid", e.target.files?.[0] ?? null)} />
            </div>
            <span className="mt-2 text-[11px] text-slate-500">{uploadingKind === "nid" ? "Uploading..." : form.nid_picture_path ? "Uploaded" : ""}</span>
          </div>
          <div>
            <FieldLabel text="Registration Perm No" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.registration_perm_no} onChange={(e) => setField("registration_perm_no", e.target.value)} />
          </div>
          <div className="md:row-span-2 flex flex-col items-center justify-center p-1">
            <FieldLabel text="Registration Form Picture" />
            <div className="relative mt-1 flex h-32 w-32 items-center justify-center rounded-full border border-slate-300 bg-slate-100">
              {resolvePreviewSrc("registration") ? (
                <img src={resolvePreviewSrc("registration")} alt="Registration" className="h-32 w-32 rounded-full object-cover" />
              ) : (
                <FileImage className="h-20 w-20 text-slate-300" />
              )}
              <button type="button" onClick={() => regInputRef.current?.click()} className="absolute right-1 top-1 rounded-full bg-[#1f4e6e] p-1 text-white">
                <PenSquare className="h-3 w-3" />
              </button>
              <input ref={regInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage("registration", e.target.files?.[0] ?? null)} />
            </div>
            <span className="mt-2 text-[11px] text-slate-500">{uploadingKind === "registration" ? "Uploading..." : form.registration_picture_path ? "Uploaded" : ""}</span>
          </div>
          <div>
            <FieldLabel text="Gender" />
            <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <FieldLabel text="Father Name" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.father_name} onChange={(e) => setField("father_name", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="Mother Name" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.mother_name} onChange={(e) => setField("mother_name", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="Date of Birth" />
            <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.date_of_birth} onChange={(e) => setField("date_of_birth", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title={
        <span className="inline-flex items-center gap-2">
          <Contact className="h-4 w-4" />
          <span>Contact Information</span>
          <span className="font-normal">Fill Up All Required(<span className="text-red-400">*</span>) Field Data</span>
        </span>
      }>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <FieldLabel text="Map Latitude" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.map_latitude} onChange={(e) => setField("map_latitude", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="Mobile Number" required />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.mobile_number} onChange={(e) => setField("mobile_number", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="District" />
            <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.district} onChange={(e) => setField("district", e.target.value)}>
              <option value="">Select</option>
              {option(options?.districts)}
            </select>
          </div>
          <div className="md:row-span-2">
            <FieldLabel text="Present Address" />
            <textarea className="h-[80px] w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.present_address} onChange={(e) => setField("present_address", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="Map Longitude" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.map_longitude} onChange={(e) => setField("map_longitude", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="Upazila/Thana" />
            <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.upazila} onChange={(e) => setField("upazila", e.target.value)}>
              <option value="">Select</option>
              {option(options?.upazilas)}
            </select>
          </div>
          <div>
            <FieldLabel text="Email Address" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.email_address} onChange={(e) => setField("email_address", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="Road Number" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.road_no} onChange={(e) => setField("road_no", e.target.value)} />
          </div>
          <div>
            <FieldLabel text="House Number" />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.house_no} onChange={(e) => setField("house_no", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title={
        <span className="inline-flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span>Network & Product Information</span>
          <span className="font-normal">Fill Up All Required(<span className="text-red-400">*</span>) Field Data</span>
        </span>
      }>
        <div className="grid gap-3 md:grid-cols-4">
          <div><FieldLabel text="Server" required /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.server_id} onChange={(e) => { setField("server_id", e.target.value); loadServerProfiles(e.target.value); setUsernameAvailability(""); }}><option value="">Select</option>{option(options?.servers)}</select></div>
          <div><FieldLabel text="Protocol Type" required /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.protocol_type} onChange={(e) => setField("protocol_type", e.target.value)}><option value="">Select</option>{option(options?.protocol_types)}</select></div>
          <div><div className="mb-1 flex items-center justify-between"><FieldLabel text="Zone" required /><button type="button" onClick={() => openQuickModal("zone")} className="inline-flex items-center gap-1 rounded-xl bg-[#234a69] px-2 py-1 text-[10px] font-semibold text-white"><Plus className="h-3 w-3" />ZONE</button></div><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.zone} onChange={(e) => setField("zone", e.target.value)}><option value="">Select</option>{option(options?.zones)}</select></div>
          <div><div className="mb-1 flex items-center justify-between"><FieldLabel text="Sub Zone" required /><button type="button" onClick={() => openQuickModal("sub-zone")} className="inline-flex items-center gap-1 rounded-xl bg-[#234a69] px-2 py-1 text-[10px] font-semibold text-white"><Plus className="h-3 w-3" />SUB ZONE</button></div><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.sub_zone} onChange={(e) => setField("sub_zone", e.target.value)}><option value="">Select</option>{option(options?.sub_zones)}</select></div>
          <div><div className="mb-1 flex items-center justify-between"><FieldLabel text="Box" required /><button type="button" onClick={() => openQuickModal("box")} className="inline-flex items-center gap-1 rounded-xl bg-[#234a69] px-2 py-1 text-[10px] font-semibold text-white"><Plus className="h-3 w-3" />BOX</button></div><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.box} onChange={(e) => setField("box", e.target.value)}><option value="">Select</option>{option(options?.boxes)}</select></div>
          <div><FieldLabel text="Connection Type" required /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.connection_type} onChange={(e) => setField("connection_type", e.target.value)}><option value="">Select</option>{option(options?.connection_types)}</select></div>
          <div><FieldLabel text="Cable Requirement in Meter" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.cable_required_meter} onChange={(e) => setField("cable_required_meter", e.target.value)} /></div>
          <div><FieldLabel text="Fiber Code" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.fiber_code} onChange={(e) => setField("fiber_code", e.target.value)} /></div>
          <div><FieldLabel text="Number of Core" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.number_of_core} onChange={(e) => setField("number_of_core", e.target.value)} /></div>
          <div><FieldLabel text="Core Color" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.core_color} onChange={(e) => setField("core_color", e.target.value)} /></div>
          <div><FieldLabel text="Device" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.device} onChange={(e) => setField("device", e.target.value)} /></div>
          <div><FieldLabel text="Device/Mac Serial No" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.device_serial_no} onChange={(e) => setField("device_serial_no", e.target.value)} /></div>
          <div><FieldLabel text="Vendor" /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} /></div>
          <div><FieldLabel text="Purchase Date" /><input type="date" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.purchase_date} onChange={(e) => setField("purchase_date", e.target.value)} /></div>
        </div>
      </Section>

      <Section title={
        <span className="inline-flex items-center gap-2">
          <BriefcaseBusiness className="h-4 w-4" />
          <span>Service Information</span>
          <span className="font-normal">Fill Up All Required(<span className="text-red-400">*</span>) Field Data</span>
        </span>
      }>
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <FieldLabel text="Client Code" required />
              <button
                type="button"
                onClick={suggestClientCode}
                className="inline-flex items-center gap-1 rounded-xl bg-[#234a69] px-2 py-1 text-[10px] font-semibold text-white"
                title="Auto suggest unique client code"
              >
                <Plus className="h-3 w-3" />
                AUTO
              </button>
            </div>
            <input
              className="w-full rounded border border-slate-300 bg-[#eef3f7] px-3 py-2 text-sm"
              value={form.client_code}
              onChange={(e) => {
                const normalized = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                setField("client_code", normalized);
                if (clientCodeHint) setClientCodeHint("");
              }}
              placeholder="Example: C00001"
            />
            <div className="mt-1 text-xs text-slate-500">{clientCodeHint || "Manual entry supported. Must be unique."}</div>
          </div>
          <div><div className="mb-1 flex items-center justify-between"><FieldLabel text="Package" required /><button type="button" onClick={() => openQuickModal("package")} className="inline-flex items-center gap-1 rounded-xl bg-[#234a69] px-2 py-1 text-[10px] font-semibold text-white"><Plus className="h-3 w-3" />PACKAGE</button></div><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.package_id} onChange={(e) => { setField("package_id", e.target.value); const selected = options?.packages.find((pkg) => pkg.id === Number(e.target.value)); if (selected && !form.monthly_bill) setField("monthly_bill", selected.price); }}><option value="">Select</option>{options?.packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></div>
          <div><FieldLabel text="Profile" required /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.profile} onChange={(e) => setField("profile", e.target.value)}><option value="">{profileLoading ? "Loading..." : "Select"}</option>{serverProfiles.map((profile) => <option key={profile} value={profile}>{profile}</option>)}</select></div>
          <div><div className="mb-1 flex items-center justify-between"><FieldLabel text="Client Type" required /><button type="button" onClick={() => openQuickModal("client-type")} className="inline-flex items-center gap-1 rounded-xl bg-[#234a69] px-2 py-1 text-[10px] font-semibold text-white"><Plus className="h-3 w-3" />CLIENT TYPE</button></div><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.client_type} onChange={(e) => setField("client_type", e.target.value)}><option value="">Select</option>{option(options?.client_types)}</select></div>
          <div><FieldLabel text="Billing Status" required /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.billing_status} onChange={(e) => setField("billing_status", e.target.value)}><option value="">Select</option>{option(options?.billing_statuses)}</select></div>
          <div />
          <div><FieldLabel text="Username/IP" required /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.username} onChange={(e) => { setField("username", e.target.value); }} /><div className="mt-1 text-xs font-semibold">{usernameAvailability === "checking" ? <span className="text-slate-500">Checking...</span> : null}{usernameAvailability === "available" ? <span className="text-emerald-600">Available</span> : null}{usernameAvailability === "not_available" ? <span className="text-rose-600">Not Available</span> : null}</div></div>
          <div><FieldLabel text="Password" required /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.password} onChange={(e) => setField("password", e.target.value)} /></div>
          <div><FieldLabel text="Joining Date (No Relation in Billing)" required /><input type="date" max={getTodayIso()} className="w-full rounded border border-slate-300 bg-[#eef3f7] px-3 py-2 text-sm" value={form.owner_name_relation_in_billing} onChange={(e) => setField("owner_name_relation_in_billing", e.target.value)} /></div>
          <div><FieldLabel text="Monthly Bill" required /><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.monthly_bill || packagePrice} onChange={(e) => setField("monthly_bill", e.target.value)} /></div>
          <div />
          <div><FieldLabel text="Billing Start Month" required /><select className="w-full rounded border border-slate-300 bg-[#eef3f7] px-3 py-2 text-sm" value={form.ui_billing_start_month} onChange={(e) => setField("ui_billing_start_month", e.target.value)}><option value="">Select Month</option>{Object.keys(monthNameToNumber).map((month) => <option key={month} value={month}>{month}</option>)}</select></div>
          <div><FieldLabel text="Expire Date" required /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.ui_expire_days} onChange={(e) => setField("ui_expire_days", e.target.value)}><option value="">Select Date</option>{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => <option key={day} value={String(day)}>{day}</option>)}</select></div>
          <div><FieldLabel text="Reference By" /><select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={form.reference_by} onChange={(e) => setField("reference_by", e.target.value)}><option value="">Select</option>{option(options?.references)}</select></div>
          <div className="flex items-end pb-2 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={form.send_greetings_sms} onChange={(e) => setField("send_greetings_sms", e.target.checked)} />
              Send Greetings SMS?
            </label>
          </div>
        </div>
      </Section>

      {quickKind ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-3 pt-16">
          <div className="w-full max-w-[520px] rounded-md bg-[#f7f7f7] p-6 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-[40px] font-semibold text-slate-700">
                Add {quickKind === "sub-zone" ? "Sub Zone" : quickKind === "client-type" ? "Client Type" : quickKind === "package" ? "Package" : quickKind === "box" ? "Box" : "Zone"}
              </h3>
              <button type="button" className="text-slate-400" onClick={() => setQuickKind(null)}><X className="h-5 w-5" /></button>
            </div>

            {quickError ? <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{quickError}</div> : null}

            <div className="space-y-2">
              {(quickKind === "sub-zone" || quickKind === "box") ? (
                <div>
                  <FieldLabel text="Zone" required />
                  <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.zone_name} onChange={(e) => setQuickForm((prev) => ({ ...prev, zone_name: e.target.value, sub_zone_name: "" }))}>
                    <option value="">Select</option>
                    {options?.zones.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                  </select>
                </div>
              ) : null}

              {quickKind === "box" ? (
                <div>
                  <FieldLabel text="Sub Zone" required />
                  <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.sub_zone_name} onChange={(e) => setQuickForm((prev) => ({ ...prev, sub_zone_name: e.target.value }))}>
                    <option value="">Select</option>
                    {(options?.sub_zones ?? []).map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                  </select>
                </div>
              ) : null}

              {quickKind === "package" ? (
                <div>
                  <FieldLabel text="Client Type" />
                  <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.package_type} onChange={(e) => setQuickForm((prev) => ({ ...prev, package_type: e.target.value }))}>
                    <option value="">Select</option>
                    {(options?.client_types ?? []).map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                  </select>
                </div>
              ) : null}

              <div>
                <FieldLabel text={quickKind === "sub-zone" ? "Sub Zone" : quickKind === "client-type" ? "Client Type" : quickKind === "package" ? "Package Name" : quickKind === "box" ? "Box" : "Zone"} required />
                <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.name} onChange={(e) => setQuickForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>

              {quickKind === "package" ? (
                <>
                  <div>
                    <FieldLabel text="Price" required />
                    <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.price} onChange={(e) => setQuickForm((prev) => ({ ...prev, price: e.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel text="Bandwidth_Allocation MB" required />
                    <input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.bandwidth_allocation_mb} onChange={(e) => setQuickForm((prev) => ({ ...prev, bandwidth_allocation_mb: e.target.value }))} />
                  </div>
                </>
              ) : null}

              <div>
                <FieldLabel text="Details(Optional)" />
                <textarea className="h-[56px] w-full rounded border border-slate-300 px-3 py-2 text-sm" value={quickForm.details} onChange={(e) => setQuickForm((prev) => ({ ...prev, details: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" className="rounded bg-[#ff473a] px-3 py-2 text-sm font-semibold text-white" onClick={() => setQuickForm((prev) => ({ ...prev, name: "", details: "" }))}>Clear</button>
                <button type="button" disabled={quickSaving} onClick={saveQuickConfig} className="rounded bg-[#2a8fe5] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70">{quickSaving ? "Saving..." : "Save"}</button>
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" className="rounded bg-[#ff473a] px-6 py-2 text-sm font-semibold text-white" onClick={() => setQuickKind(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate("/admin/clients")} className="rounded-full bg-slate-500 px-4 py-2 text-xs font-semibold text-white">Go To List</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#1f4e6e] px-4 py-2 text-xs font-semibold text-white disabled:opacity-70">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save & Exit
        </button>
      </div>
    </form>
  );
}
  const monthNameToNumber: Record<string, string> = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12",
  };
