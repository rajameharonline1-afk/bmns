import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

type ClientRef = { client_code: string; customer_name: string; username: string };
type PortalPost = {
  id: number;
  post_type: "news" | "notice" | "message";
  title: string;
  body: string;
  image_path: string | null;
  target_client_code: string | null;
  published_at: string | null;
  display_order: number;
};
type Usage = { id: number; client_code: string; uptime_seconds: number; downloaded_gb: number; uploaded_gb: number };
type Ticket = { id: number; client_code: string; subject: string; details: string | null; status: "processing" | "pending" | "solved" };

const ENV_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([ENV_BASE, `http://${host}:8001`, "http://localhost:8001", "http://127.0.0.1:8001"]));
})();

const tabs = [
  { key: "posts", label: "News/Notices/Message" },
  { key: "tickets", label: "Support Tickets" },
  { key: "usage", label: "Usage Stats" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const postKinds: Array<PortalPost["post_type"]> = ["news", "notice", "message"];

const defaultPostForm = {
  post_type: "news" as PortalPost["post_type"],
  title: "",
  body: "",
  image_path: "",
  target_client_code: "",
  display_order: "0",
};

const defaultUsageForm = {
  client_code: "",
  uptime_seconds: "0",
  downloaded_gb: "0",
  uploaded_gb: "0",
};

const defaultTicketForm = {
  client_code: "",
  subject: "",
  details: "",
  status: "processing" as Ticket["status"],
};

const AdminClientPortalManager = () => {
  const { token } = useAuth();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [apiBase, setApiBase] = useState(API_BASES.find((b) => b.includes(":8001")) || API_BASES[0] || "");
  const [tab, setTab] = useState<TabKey>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientRef[]>([]);
  const [posts, setPosts] = useState<PortalPost[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);

  const [postForm, setPostForm] = useState(defaultPostForm);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);

  const [usageForm, setUsageForm] = useState(defaultUsageForm);

  const [ticketForm, setTicketForm] = useState(defaultTicketForm);
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);

  const request = async (path: string, options?: RequestInit) => {
    let lastError: Error | null = null;
    for (const base of API_BASES) {
      if (!base) continue;
      try {
        const response = await fetch(`${base}${path}`, { cache: "no-store", ...options });
        if (response.ok) {
          setApiBase(base);
          if (response.status === 204) return null;
          return response.json();
        }
        const text = await response.text();
        lastError = new Error(text || response.statusText || "Request failed");
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Failed to fetch");
      }
    }
    throw lastError ?? new Error("Failed to fetch");
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsRes, postsRes, ticketsRes, usageRes] = await Promise.all([
        request("/api/client-portal/clients", { headers: authHeader }),
        request("/api/client-portal/posts", { headers: authHeader }),
        request("/api/client-portal/tickets", { headers: authHeader }),
        request("/api/client-portal/usage", { headers: authHeader }),
      ]);
      setClients((clientsRes as ClientRef[]) ?? []);
      setPosts((postsRes as PortalPost[]) ?? []);
      setTickets((ticketsRes as Ticket[]) ?? []);
      setUsage((usageRes as Usage[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client portal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const uploadImage = async (file: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = (await request("/api/client-portal/upload-image", {
        method: "POST",
        headers: authHeader,
        body: fd,
      })) as { file_path: string };
      setPostForm((prev) => ({ ...prev, image_path: data.file_path }));
      setNotice("Image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    }
  };

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!postForm.title.trim() || !postForm.body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setError(null);
    try {
      const payload = {
        post_type: postForm.post_type,
        title: postForm.title.trim(),
        body: postForm.body.trim(),
        image_path: postForm.image_path || null,
        target_client_code: postForm.target_client_code || null,
        display_order: Number(postForm.display_order || "0"),
      };
      if (editingPostId) {
        await request(`/api/client-portal/posts/${editingPostId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        setNotice("Post updated.");
      } else {
        await request("/api/client-portal/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        setNotice("Post created.");
      }
      setPostForm(defaultPostForm);
      setEditingPostId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    }
  };

  const editPost = (row: PortalPost) => {
    setEditingPostId(row.id);
    setPostForm({
      post_type: row.post_type,
      title: row.title,
      body: row.body,
      image_path: row.image_path || "",
      target_client_code: row.target_client_code || "",
      display_order: String(row.display_order ?? 0),
    });
  };

  const deletePost = async (id: number) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await request(`/api/client-portal/posts/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      setNotice("Post deleted.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const submitUsage = async (event: FormEvent) => {
    event.preventDefault();
    if (!usageForm.client_code) {
      setError("Client code is required.");
      return;
    }
    try {
      await request(`/api/client-portal/usage/${usageForm.client_code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          client_code: usageForm.client_code,
          uptime_seconds: Number(usageForm.uptime_seconds || "0"),
          downloaded_gb: Number(usageForm.downloaded_gb || "0"),
          uploaded_gb: Number(usageForm.uploaded_gb || "0"),
        }),
      });
      setNotice("Usage saved.");
      setUsageForm(defaultUsageForm);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save usage");
    }
  };

  const submitTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticketForm.client_code || !ticketForm.subject.trim()) {
      setError("Client code and subject are required.");
      return;
    }
    try {
      const payload = {
        client_code: ticketForm.client_code,
        subject: ticketForm.subject.trim(),
        details: ticketForm.details.trim() || null,
        status: ticketForm.status,
      };
      if (editingTicketId) {
        await request(`/api/client-portal/tickets/${editingTicketId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ subject: payload.subject, details: payload.details, status: payload.status }),
        });
        setNotice("Ticket updated.");
      } else {
        await request("/api/client-portal/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        setNotice("Ticket created.");
      }
      setTicketForm(defaultTicketForm);
      setEditingTicketId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ticket");
    }
  };

  const editTicket = (row: Ticket) => {
    setEditingTicketId(row.id);
    setTicketForm({
      client_code: row.client_code,
      subject: row.subject,
      details: row.details || "",
      status: row.status,
    });
  };

  const deleteTicket = async (id: number) => {
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await request(`/api/client-portal/tickets/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      setNotice("Ticket deleted.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete ticket");
    }
  };

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.client_code, label: `${c.client_code} - ${c.customer_name}` })),
    [clients]
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold text-[#123b5b]">Client Portal Content Manager</h2>
        <div className="text-xs text-slate-500">Configuration &gt; Client Portal Content</div>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}

      <div className="ds-card p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${tab === item.key ? "bg-[#1f4e6e] text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => void loadAll()} className="ml-auto rounded bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
            Refresh
          </button>
        </div>

        {loading ? <div className="py-6 text-center text-sm text-slate-500">Loading...</div> : null}

        {!loading && tab === "posts" ? (
          <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <form onSubmit={submitPost} className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-700">{editingPostId ? "Edit" : "Create"} Post</h3>
              <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={postForm.post_type} onChange={(e) => setPostForm((p) => ({ ...p, post_type: e.target.value as PortalPost["post_type"] }))}>
                {postKinds.map((kind) => <option key={kind} value={kind}>{kind.toUpperCase()}</option>)}
              </select>
              <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Title" value={postForm.title} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} />
              <textarea className="h-28 w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Body" value={postForm.body} onChange={(e) => setPostForm((p) => ({ ...p, body: e.target.value }))} />
              <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={postForm.target_client_code} onChange={(e) => setPostForm((p) => ({ ...p, target_client_code: e.target.value }))}>
                <option value="">All Clients</option>
                {clientOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Display order" value={postForm.display_order} onChange={(e) => setPostForm((p) => ({ ...p, display_order: e.target.value }))} />
                <label className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-2 py-2 text-xs">
                  <Upload className="h-4 w-4" />
                  Upload image
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => void uploadImage(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="text-xs text-slate-500">{postForm.image_path || "No image"}</div>
              <div className="flex items-center gap-2">
                <button type="submit" className="rounded bg-[#1f4e6e] px-3 py-2 text-sm font-semibold text-white">
                  <Save className="mr-1 inline h-4 w-4" /> Save
                </button>
                <button type="button" onClick={() => { setEditingPostId(null); setPostForm(defaultPostForm); }} className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Clear</button>
              </div>
            </form>

            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="ds-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="px-2 py-2 text-left">Client Code</th>
                    <th className="px-2 py-2 text-left">Title</th>
                    <th className="px-2 py-2 text-left">Order</th>
                    <th className="px-2 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((row) => (
                    <tr key={row.id} className="border-b border-slate-200 bg-white">
                      <td className="px-2 py-2 uppercase">{row.post_type}</td>
                      <td className="px-2 py-2">{row.target_client_code || "ALL"}</td>
                      <td className="px-2 py-2">{row.title}</td>
                      <td className="px-2 py-2">{row.display_order}</td>
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => editPost(row)} className="mr-2 text-emerald-600"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void deletePost(row.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && tab === "tickets" ? (
          <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <form onSubmit={submitTicket} className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-700">{editingTicketId ? "Edit" : "Create"} Ticket</h3>
              <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={ticketForm.client_code} onChange={(e) => setTicketForm((p) => ({ ...p, client_code: e.target.value }))}>
                <option value="">Select client code</option>
                {clientOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Subject" value={ticketForm.subject} onChange={(e) => setTicketForm((p) => ({ ...p, subject: e.target.value }))} />
              <textarea className="h-24 w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Details" value={ticketForm.details} onChange={(e) => setTicketForm((p) => ({ ...p, details: e.target.value }))} />
              <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={ticketForm.status} onChange={(e) => setTicketForm((p) => ({ ...p, status: e.target.value as Ticket["status"] }))}>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="solved">Solved</option>
              </select>
              <div className="flex items-center gap-2">
                <button type="submit" className="rounded bg-[#1f4e6e] px-3 py-2 text-sm font-semibold text-white">
                  <Plus className="mr-1 inline h-4 w-4" /> Save
                </button>
                <button type="button" onClick={() => { setEditingTicketId(null); setTicketForm(defaultTicketForm); }} className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Clear</button>
              </div>
            </form>

            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="ds-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left">Client Code</th>
                    <th className="px-2 py-2 text-left">Subject</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((row) => (
                    <tr key={row.id} className="border-b border-slate-200 bg-white">
                      <td className="px-2 py-2 font-semibold">{row.client_code}</td>
                      <td className="px-2 py-2">{row.subject}</td>
                      <td className="px-2 py-2 uppercase">{row.status}</td>
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => editTicket(row)} className="mr-2 text-emerald-600"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void deleteTicket(row.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && tab === "usage" ? (
          <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <form onSubmit={submitUsage} className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-700">Upsert Usage by Client Code</h3>
              <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={usageForm.client_code} onChange={(e) => setUsageForm((p) => ({ ...p, client_code: e.target.value }))}>
                <option value="">Select client code</option>
                {clientOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Uptime seconds" value={usageForm.uptime_seconds} onChange={(e) => setUsageForm((p) => ({ ...p, uptime_seconds: e.target.value }))} />
              <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Downloaded GB" value={usageForm.downloaded_gb} onChange={(e) => setUsageForm((p) => ({ ...p, downloaded_gb: e.target.value }))} />
              <input className="w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Uploaded GB" value={usageForm.uploaded_gb} onChange={(e) => setUsageForm((p) => ({ ...p, uploaded_gb: e.target.value }))} />
              <button type="submit" className="rounded bg-[#1f4e6e] px-3 py-2 text-sm font-semibold text-white">Save Usage</button>
            </form>

            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="ds-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left">Client Code</th>
                    <th className="px-2 py-2 text-left">Uptime(s)</th>
                    <th className="px-2 py-2 text-left">Downloaded GB</th>
                    <th className="px-2 py-2 text-left">Uploaded GB</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((row) => (
                    <tr key={row.id} className="border-b border-slate-200 bg-white">
                      <td className="px-2 py-2 font-semibold">{row.client_code}</td>
                      <td className="px-2 py-2">{row.uptime_seconds}</td>
                      <td className="px-2 py-2">{row.downloaded_gb}</td>
                      <td className="px-2 py-2">{row.uploaded_gb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div className="text-xs text-slate-500">API base: {apiBase}</div>
    </section>
  );
};

export default AdminClientPortalManager;
