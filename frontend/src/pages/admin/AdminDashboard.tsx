import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CircleDot,
  CreditCard,
  FileBarChart2,
  FileText,
  Monitor,
  Network,
  Percent,
  Receipt,
  ShieldAlert,
  Signal,
  Ticket,
  Users,
  UserX
} from "lucide-react";
import StatCard from "../../components/dashboard/StatCard";
import ChartSection from "../../components/dashboard/ChartSection";
import { useAuth } from "../../features/auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type DashboardSummary = {
  kpi_cards: Array<{ title: string; value: string; subtitle: string }>;
  finance_cards: Array<{ title: string; value: string; subtitle: string }>;
  unpaid_clients: Array<{ user: string; mobile: string; bill: string; due: string }>;
  monthly_new_clients: Array<{ month: string; value: number }>;
  performance: Array<{ month: string; active: number; growth: number }>;
  tickets: {
    pending_tickets: number;
    processing_tickets: number;
    pending_tasks: number;
    processing_tasks: number;
  };
};

const defaultKpiCards = [
  { title: "Total Client", value: "692", subtitle: "Number of all clients at present", tone: "teal", icon: <Users className="h-5 w-5" /> },
  { title: "Running Clients", value: "642", subtitle: "Clients without left out status", tone: "green", icon: <Signal className="h-5 w-5" /> },
  { title: "Inactive Clients", value: "115", subtitle: "Clients whose status are inactive", tone: "purple", icon: <ShieldAlert className="h-5 w-5" /> },
  { title: "Waiver Clients", value: "50", subtitle: "Free/personal clients", tone: "slate", icon: <BadgeCheck className="h-5 w-5" /> },
  { title: "New Client", value: "13", subtitle: "Monthly number of new clients", tone: "blue", icon: <Users className="h-5 w-5" /> },
  { title: "Renewed Clients", value: "31", subtitle: "Monthly number of renewed clients", tone: "teal", icon: <CalendarCheck className="h-5 w-5" /> },
  { title: "Deactivated Clients", value: "35", subtitle: "Monthly number of deactivated clients", tone: "purple", icon: <UserX className="h-5 w-5" /> },
  { title: "Left Clients", value: "50", subtitle: "Clients those are not exist", tone: "slate", icon: <UserX className="h-5 w-5" /> },
  { title: "Billing Clients", value: "520", subtitle: "Clients with generated bill", tone: "teal", icon: <Receipt className="h-5 w-5" /> },
  { title: "Paid Clients", value: "493", subtitle: "Clients fully paid", tone: "green", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Partially Paid", value: "5", subtitle: "Clients partially paid", tone: "purple", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Unpaid Clients", value: "22", subtitle: "Clients fully unpaid", tone: "slate", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Online Clients", value: "550", subtitle: "Clients currently connected", tone: "blue", icon: <Monitor className="h-5 w-5" /> },
  { title: "Blocked Clients", value: "0", subtitle: "Clients disabled by rule", tone: "green", icon: <ShieldAlert className="h-5 w-5" /> },
  { title: "Bill Date Expire", value: "18", subtitle: "Billing date expired clients", tone: "purple", icon: <CalendarClock className="h-5 w-5" /> },
  { title: "Unpaid Extension", value: "0", subtitle: "Expired but extended clients", tone: "slate", icon: <CalendarClock className="h-5 w-5" /> },
  { title: "Total Pop", value: "1", subtitle: "Total number of POPs", tone: "teal", icon: <Network className="h-5 w-5" /> },
  { title: "Total Pop Clients", value: "247", subtitle: "Exported & unexported POP clients", tone: "green", icon: <Network className="h-5 w-5" /> },
  { title: "Enabled Pop Clients", value: "247", subtitle: "Exported POP clients enabled", tone: "purple", icon: <Network className="h-5 w-5" /> },
  { title: "Disabled Pop Clients", value: "247", subtitle: "Exported POP clients disabled", tone: "slate", icon: <Network className="h-5 w-5" /> }
];

const donutColors = ["#1ea7c9", "#2fc1c4", "#f6c13d", "#f05a7d"];

const zoneProblemData = [
  { name: "Cholash", value: 40 },
  { name: "Chatuli", value: 25 },
  { name: "Rajamehar", value: 20 },
  { name: "Monikandi", value: 15 }
];

const subZoneProblemData = [
  { name: "Uttar para", value: 35 },
  { name: "Gobindopur", value: 28 },
  { name: "Moullovipara", value: 22 },
  { name: "Pich para", value: 15 }
];

const monthlyProblemData = [
  { name: "Wifi Password Change", value: 38 },
  { name: "Onu red light show", value: 34 },
  { name: "Internet Service Off", value: 28 }
];

const solverData = [
  { name: "MD Yeasin Arafat", value: 7 },
  { name: "Arif", value: 5 },
  { name: "Mahfuz", value: 4 },
  { name: "Rasel", value: 3 }
];

const defaultNewClientData = [
  { month: "Jan", value: 16 },
  { month: "Feb", value: 13 },
  { month: "Mar", value: 18 },
  { month: "Apr", value: 14 },
  { month: "May", value: 20 }
];

const defaultPerformanceData = [
  { month: "Mar", active: 420, growth: 40 },
  { month: "Apr", active: 430, growth: 32 },
  { month: "May", active: 438, growth: 34 },
  { month: "Jun", active: 450, growth: 28 },
  { month: "Jul", active: 458, growth: 30 },
  { month: "Aug", active: 470, growth: 36 },
  { month: "Sep", active: 482, growth: 28 },
  { month: "Oct", active: 490, growth: 34 },
  { month: "Nov", active: 498, growth: 40 },
  { month: "Dec", active: 508, growth: 28 },
  { month: "Jan", active: 520, growth: 32 },
  { month: "Feb", active: 512, growth: 30 }
];

const defaultUnpaidClients = [
  { user: "R3545455", mobile: "01922268904", bill: "500.00", due: "5500.00" },
  { user: "R3545001", mobile: "+8801875764029", bill: "500.00", due: "2500.00" },
  { user: "R3545057", mobile: "01811311785", bill: "500.00", due: "2000.00" },
  { user: "R3545247", mobile: "01990687325", bill: "500.00", due: "2000.00" },
  { user: "R3545552", mobile: "01623358699", bill: "500.00", due: "1500.00" },
  { user: "R3545556", mobile: "01762160016", bill: "500.00", due: "1500.00" }
];

const defaultFinanceCards = [
  { title: "Monthly Bill", value: "260810", subtitle: "Current month customer bill", tone: "teal", icon: <FileText className="h-4 w-4" /> },
  { title: "Collected Bill", value: "208550", subtitle: "Current month received amount", tone: "green", icon: <Receipt className="h-4 w-4" /> },
  { title: "Discount", value: "600", subtitle: "Current month discount amount", tone: "purple", icon: <Percent className="h-4 w-4" /> },
  { title: "Total Due", value: "32200", subtitle: "Total due bill of client", tone: "slate", icon: <CreditCard className="h-4 w-4" /> },
  { title: "Service Sales Invoice", value: "500", subtitle: "Installation fee & services", tone: "teal", icon: <FileText className="h-4 w-4" /> },
  { title: "Product Sales Invoice", value: "0", subtitle: "Current month product sales", tone: "green", icon: <FileText className="h-4 w-4" /> },
  { title: "Income", value: "0", subtitle: "Current month income amount", tone: "purple", icon: <FileBarChart2 className="h-4 w-4" /> },
  { title: "Expense", value: "0", subtitle: "Current month expense amount", tone: "slate", icon: <FileBarChart2 className="h-4 w-4" /> },
  { title: "Credited Amount", value: "130", subtitle: "Monthly credited amount of POPs", tone: "teal", icon: <CircleDot className="h-4 w-4" /> },
  { title: "POP Fund", value: "0", subtitle: "Monthly fund amount to POPs", tone: "green", icon: <CircleDot className="h-4 w-4" /> },
  { title: "POP Bill", value: "0", subtitle: "Monthly received from POPs", tone: "purple", icon: <CircleDot className="h-4 w-4" /> },
  { title: "Receivable Amount", value: "0", subtitle: "Monthly receivable from POPs", tone: "slate", icon: <CircleDot className="h-4 w-4" /> },
  { title: "B.Width Provider Bill", value: "0", subtitle: "Monthly paid to providers", tone: "teal", icon: <Monitor className="h-4 w-4" /> },
  { title: "B.Width Provider Due", value: "347835.95", subtitle: "Providers payable due", tone: "green", icon: <Monitor className="h-4 w-4" /> },
  { title: "B.Width POP Bill", value: "0", subtitle: "Monthly received from POPs", tone: "purple", icon: <Monitor className="h-4 w-4" /> },
  { title: "Paid Salary", value: "0", subtitle: "Current month paid salary", tone: "slate", icon: <BadgeCheck className="h-4 w-4" /> },
  { title: "SMS Balance", value: "0.13", subtitle: "Total sms balance", tone: "teal", icon: <Ticket className="h-4 w-4" /> },
  { title: "Purchase Payable Due", value: "-100", subtitle: "Inventory purchase due", tone: "green", icon: <Receipt className="h-4 w-4" /> },
  { title: "Purchase Paid Amount", value: "0", subtitle: "Inventory purchase paid", tone: "purple", icon: <Receipt className="h-4 w-4" /> },
  { title: "Cash On Hand", value: "209050", subtitle: "Current month cash on hand", tone: "slate", icon: <CreditCard className="h-4 w-4" /> }
];

const StatusCard = ({ title, value, tone }: { title: string; value: string | number; tone: "red" | "orange" }) => {
  const toneClass = tone === "red" ? "bg-[#e8584b]" : "bg-[#f19a1b]";
  return (
    <div className={`rounded-md ${toneClass} px-3 py-3 text-white shadow-[0_6px_12px_rgba(15,23,42,0.2)]`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide">{title}</div>
      <div className="mt-1 text-[20px] font-extrabold">{value}</div>
      <div className="text-[10px] text-white/90">Number of tickets/tasks</div>
    </div>
  );
};

export default function AdminDashboard() {
  const { token } = useAuth();
  const [liveSummary, setLiveSummary] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`${API_BASE}/api/dashboard/admin-summary`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json() as Promise<DashboardSummary>;
      })
      .then((payload) => {
        setLiveSummary(payload);
        setLoadError(null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Failed to load dashboard summary");
      });

    return () => controller.abort();
  }, [token]);

  const kpiCards = useMemo(() => {
    if (!liveSummary) return defaultKpiCards;
    const byTitle = new Map(liveSummary.kpi_cards.map((item) => [item.title, item]));
    return defaultKpiCards.map((card) => {
      const live = byTitle.get(card.title);
      if (!live) return card;
      return { ...card, value: live.value, subtitle: live.subtitle };
    });
  }, [liveSummary]);

  const financeCards = useMemo(() => {
    if (!liveSummary) return defaultFinanceCards;
    const byTitle = new Map(liveSummary.finance_cards.map((item) => [item.title, item]));
    return defaultFinanceCards.map((card) => {
      const live = byTitle.get(card.title);
      if (!live) return card;
      return { ...card, value: live.value, subtitle: live.subtitle };
    });
  }, [liveSummary]);

  const unpaidClients = liveSummary?.unpaid_clients.length ? liveSummary.unpaid_clients : defaultUnpaidClients;
  const newClientData = liveSummary?.monthly_new_clients?.length ? liveSummary.monthly_new_clients : defaultNewClientData;
  const performanceData = liveSummary?.performance?.length ? liveSummary.performance : defaultPerformanceData;
  const tickets = liveSummary?.tickets ?? {
    pending_tickets: 0,
    processing_tickets: 0,
    pending_tasks: 0,
    processing_tasks: 0,
  };

  return (
    <section className="space-y-4">
      {loadError ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_1.05fr_0.9fr_1fr]">
        <ChartSection title="Zone Wise Problem Occurrence">
          <div className="flex items-center gap-4">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={zoneProblemData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {zoneProblemData.map((entry, index) => (
                      <Cell key={entry.name} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-[10px] text-[#4a6071]">
              {zoneProblemData.map((item, index) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        </ChartSection>

        <ChartSection title="Sub-Zone Wise Problem Occurrence">
          <div className="flex items-center gap-4">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subZoneProblemData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {subZoneProblemData.map((entry, index) => (
                      <Cell key={entry.name} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-[10px] text-[#4a6071]">
              {subZoneProblemData.map((item, index) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        </ChartSection>

        <div className="space-y-2">
          <StatusCard title="Pending Tickets" value={tickets.pending_tickets} tone="red" />
          <StatusCard title="Processing Tickets" value={tickets.processing_tickets} tone="orange" />
          <StatusCard title="Pending Task" value={tickets.pending_tasks} tone="red" />
          <StatusCard title="Processing Task" value={tickets.processing_tasks} tone="orange" />
        </div>

        <ChartSection title="Monthly Problem Occurrence">
          <div className="flex items-center gap-4">
            <div className="h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={monthlyProblemData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {monthlyProblemData.map((entry, index) => (
                      <Cell key={entry.name} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-[10px] text-[#4a6071]">
              {monthlyProblemData.map((item, index) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        </ChartSection>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartSection title="Most Problem Solver (Quantity)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={solverData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1ea7c9" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="Monthly New Client">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={newClientData} margin={{ left: 0, right: 10 }}>
                <defs>
                  <linearGradient id="colorNewClient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1ea7c9" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#1ea7c9" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#1ea7c9" fillOpacity={1} fill="url(#colorNewClient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartSection title="Company Performance (Active Client)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ left: 0, right: 8, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="active" stackId="a" fill="#1ea7c9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="growth" stackId="a" fill="#7b55dd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="TOP 20 UNPAID CLIENT" className="overflow-hidden">
          <div className="overflow-hidden rounded-md border border-[#204f74]">
            <div className="bg-[#15527e] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
              Top 20 Unpaid Client
            </div>
            <table className="min-w-full text-[10px]">
              <thead className="bg-[#204f74] text-white">
                <tr>
                  <th className="border-r border-white/20 px-2 py-1 text-left">User Name</th>
                  <th className="border-r border-white/20 px-2 py-1 text-left">Mobile</th>
                  <th className="border-r border-white/20 px-2 py-1 text-left">Bill Amount</th>
                  <th className="px-2 py-1 text-left">Due Amount</th>
                </tr>
              </thead>
              <tbody>
                {unpaidClients.map((row) => (
                  <tr key={row.user} className="border-b border-[#e7edf2] text-[#24384a] odd:bg-white even:bg-[#f8fafc]">
                    <td className="px-2 py-1.5">{row.user}</td>
                    <td className="px-2 py-1.5">{row.mobile}</td>
                    <td className="px-2 py-1.5">{row.bill}</td>
                    <td className="px-2 py-1.5">{row.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartSection>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {financeCards.map((card) => (
          <StatCard key={card.title} {...card} size="compact" />
        ))}
      </div>
    </section>
  );
}
