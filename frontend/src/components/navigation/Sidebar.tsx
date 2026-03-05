import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Boxes,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  Cpu,
  Download,
  HandCoins,
  Headphones,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Network,
  Package,
  Radio,
  Receipt,
  Server,
  Settings,
  Settings2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  UsersRound
} from "lucide-react";
import rajameharLogo from "../../assets/rajamehar-online.png";

const menuSections = [
  { label: "Dashboard", to: "/" },
  { label: "Configuration", key: "configuration" },
  { label: "Client", key: "client" },
  { label: "Billing", key: "billing" },
  { label: "Mikrotik Server", key: "mikrotik-server" },
  { label: "HR & Payroll", key: "hr-payroll" },
  { label: "OLT Management", key: "olt-management" },
  { label: "Network Diagram", key: "network-diagram" },
  { label: "Leave Management", key: "leave-management" },
  { label: "POP", key: "pop" },
  { label: "Support & Ticketing", key: "support-ticketing" },
  { label: "Task Management", key: "task-management" },
  { label: "Bandwidth Buy", key: "bandwidth-buy" },
  { label: "Bandwidth Sale", key: "bandwidth-sale" },
  { label: "Purchase", key: "purchase" },
  { label: "Inventory", key: "inventory" },
  { label: "Assets", key: "assets" },
  { label: "Sales & Service", key: "sales-service" },
  { label: "Income", key: "income" },
  { label: "Expense", key: "expense" },
  { label: "Daily Account", key: "daily-account" },
  { label: "Accounting", key: "accounting" },
  { label: "Report", key: "report" },
  { label: "SMS Service", key: "sms-service" },
  { label: "System", key: "system" }
];

const submenuMap: Record<string, { label: string; to: string }[]> = {
  configuration: [
    { label: "Zone", to: "/admin/section/configuration/zone" },
    { label: "Sub Zone", to: "/admin/section/configuration/sub-zone" },
    { label: "Box", to: "/admin/section/configuration/box" },
    { label: "Connection Type", to: "/admin/section/configuration/connection-type" },
    { label: "Client Type", to: "/admin/section/configuration/client-type" },
    { label: "Protocol Type", to: "/admin/section/configuration/protocol-type" },
    { label: "Billing Status", to: "/admin/section/configuration/billing-status" },
    { label: "Package", to: "/admin/section/configuration/package" },
    { label: "Landing Content", to: "/admin/section/configuration/landing-content" },
    { label: "District", to: "/admin/section/configuration/district" },
    { label: "Upazila", to: "/admin/section/configuration/upazila" }
  ],
  client: [
    { label: "New Request", to: "/admin/section/client/new-request" },
    { label: "Add New", to: "/admin/section/client/add-new" },
    { label: "Client List", to: "/admin/section/client/client-list" },
    { label: "Left Client", to: "/admin/section/client/left-client" },
    { label: "Scheduler", to: "/admin/section/client/scheduler" },
    { label: "Change Request", to: "/admin/section/client/change-request" },
    { label: "Portal Manage", to: "/admin/section/client/portal-manage" }
  ],
  billing: [
    { label: "Billing List", to: "/admin/section/billing/billing-list" },
    { label: "Daily Bill Collection", to: "/admin/section/billing/daily-bill-collection" }
  ],
  "mikrotik-server": [
    { label: "Server", to: "/admin/section/mikrotik-server/server" },
    { label: "Server Backup", to: "/admin/section/mikrotik-server/server-backup" },
    { label: "Import from Mikrotik", to: "/admin/section/mikrotik-server/import-from-mikrotik" },
    { label: "Bulk Clients Import", to: "/admin/section/mikrotik-server/bulk-clients-import" }
  ],
  "hr-payroll": [
    { label: "Employee List", to: "/admin/section/hr-payroll/employee-list" },
    { label: "Attendance", to: "/admin/section/hr-payroll/attendance" },
    { label: "Payroll Sheet", to: "/admin/section/hr-payroll/payroll-sheet" }
  ],
  "olt-management": [
    { label: "OLT List", to: "/admin/section/olt-management/olt-list" },
    { label: "ONU Inventory", to: "/admin/section/olt-management/onu-inventory" },
    { label: "Signal Monitor", to: "/admin/section/olt-management/signal-monitor" }
  ],
  "network-diagram": [
    { label: "Diagram", to: "/admin/section/network-diagram/diagram" },
    { label: "Network POP", to: "/admin/section/network-diagram/network-pop" },
    { label: "Clients in Diagram", to: "/admin/section/network-diagram/clients-in-diagram" },
    { label: "Network Connections", to: "/admin/section/network-diagram/network-connections" },
    { label: "Distributed Inv. Items", to: "/admin/section/network-diagram/distributed-inv-items" },
    { label: "Network View in Map", to: "/admin/section/network-diagram/network-view-in-map" }
  ],
  "leave-management": [
    { label: "Category", to: "/admin/section/leave-management/category" },
    { label: "Setup", to: "/admin/section/leave-management/setup" },
    { label: "Apply", to: "/admin/section/leave-management/apply" },
    { label: "Approval", to: "/admin/section/leave-management/approval" }
  ],
  pop: [
    { label: "Package", to: "/admin/section/pop/package" },
    { label: "Tariff Config", to: "/admin/section/pop/tariff-config" },
    { label: "Add POP", to: "/admin/section/pop/add-pop" },
    { label: "POP List", to: "/admin/section/pop/pop-list" },
    { label: "POP Funding", to: "/admin/section/pop/pop-funding" },
    { label: "Client PGW Payments", to: "/admin/section/pop/client-pgw-payments" },
    { label: "PGW Transaction Settlement", to: "/admin/section/pop/pgw-transaction-settlement" },
    { label: "POP Notice", to: "/admin/section/pop/pop-notice" }
  ],
  "support-ticketing": [
    { label: "Support Category", to: "/admin/section/support-ticketing/support-category" },
    { label: "Client Support", to: "/admin/section/support-ticketing/client-support" },
    { label: "Support History", to: "/admin/section/support-ticketing/support-history" }
  ],
  "task-management": [
    { label: "Task Category", to: "/admin/section/task-management/task-category" },
    { label: "Task", to: "/admin/section/task-management/task" },
    { label: "Task History", to: "/admin/section/task-management/task-history" }
  ],
  "bandwidth-buy": [
    { label: "Item", to: "/admin/section/bandwidth-buy/item" },
    { label: "Item Category", to: "/admin/section/bandwidth-buy/item-category" },
    { label: "Provider", to: "/admin/section/bandwidth-buy/provider" },
    { label: "Purchase Bill", to: "/admin/section/bandwidth-buy/purchase-bill" }
  ],
  purchase: [
    { label: "Vendor", to: "/admin/section/purchase/vendor" },
    { label: "Requisition", to: "/admin/section/purchase/requisition" },
    { label: "Purchase", to: "/admin/section/purchase/purchase" },
    { label: "Purchase bill", to: "/admin/section/purchase/purchase-bill" }
  ],
  inventory: [
    { label: "Unit", to: "/admin/section/inventory/unit" },
    { label: "Store Location", to: "/admin/section/inventory/store-location" },
    { label: "Item Category", to: "/admin/section/inventory/item-category" },
    { label: "Item", to: "/admin/section/inventory/item" },
    { label: "Stock", to: "/admin/section/inventory/stock" }
  ],
  assets: [
    { label: "Asset List", to: "/admin/section/assets/asset-list" },
    { label: "Destroyed Items", to: "/admin/section/assets/destroyed-items" }
  ],
  "sales-service": [
    { label: "Product Invoice", to: "/admin/section/sales-service/product-invoice" },
    { label: "Service Invoice", to: "/admin/section/sales-service/service-invoice" },
    { label: "Installation Fee", to: "/admin/section/sales-service/installation-fee" }
  ],
  income: [
    { label: "Income Category", to: "/admin/section/income/income-category" },
    { label: "Daily Income", to: "/admin/section/income/daily-income" },
    { label: "Income History", to: "/admin/section/income/income-history" }
  ],
  expense: [
    { label: "Expense Category", to: "/admin/section/expense/expense-category" },
    { label: "Daily Expense", to: "/admin/section/expense/daily-expense" },
    { label: "Expense History", to: "/admin/section/expense/expense-history" }
  ],
  "daily-account": [
    { label: "Daily Total Income", to: "/admin/section/daily-total-income" },
    { label: "Daily Total Expense", to: "/admin/section/daily-total-expense" },
    { label: "Daily Account Closing", to: "/admin/section/daily-account/daily-account-closing" }
  ],
  accounting: [
    { label: "Accounting Dashboard", to: "/admin/section/accounting/accounting-dashboard" },
    { label: "Chart of Accounts", to: "/admin/section/accounting/chart-of-accounts" },
    { label: "Income", to: "/admin/section/accounting/income" },
    { label: "Expense", to: "/admin/section/accounting/expense" },
    { label: "Journal", to: "/admin/section/accounting/journal" },
    { label: "Accounting Transactions", to: "/admin/section/accounting/accounting-transactions" },
    { label: "Account Balances", to: "/admin/section/accounting/account-balances" },
    { label: "Balance Sheet", to: "/admin/section/accounting/balance-sheet" },
    { label: "Profit Loss", to: "/admin/section/accounting/profit-loss" },
    { label: "Compare Profit Loss", to: "/admin/section/accounting/compare-profit-loss" },
    { label: "Trial Balance", to: "/admin/section/accounting/trial-balance" },
    { label: "Cash Book", to: "/admin/section/accounting/cash-book" }
  ],
  report: [
    { label: "Bill Collection", to: "/admin/section/report/bill-collection" },
    { label: "Discount Report", to: "/admin/section/report/discount-report" },
    { label: "Customer Report", to: "/admin/section/report/customer-report" },
    { label: "Messages Report", to: "/admin/section/report/messages-report" },
    { label: "Due Customer SMS", to: "/admin/section/report/due-customer-sms" },
    { label: "Pay. Processing Fee", to: "/admin/section/report/pay-processing-fee" },
    { label: "BTRC Monthly Report", to: "/admin/section/report/btrc-monthly-report" },
    { label: "Financial Transactions", to: "/admin/section/report/financial-transactions" },
    { label: "All Report", to: "/admin/section/report/all-report" }
  ],
  "sms-service": [
    { label: "Individual SMS", to: "/admin/section/sms-service/individual-sms" },
    { label: "SMS Template", to: "/admin/section/sms-service/sms-template" },
    { label: "SMS Group", to: "/admin/section/sms-service/sms-group" },
    { label: "Send SMS", to: "/admin/section/sms-service/send-sms" },
    { label: "SMS Gateway", to: "/admin/section/sms-service/sms-gateway" }
  ],
  system: [
    { label: "App Users", to: "/admin/section/system/app-users" },
    { label: "Company SetUp", to: "/admin/section/system/company-setup" },
    { label: "Invoice SetUp", to: "/admin/section/system/invoice-setup" },
    { label: "Periods SetUp", to: "/admin/section/system/periods-setup" },
    { label: "Payment Gateways", to: "/admin/section/system/payment-gateways" },
    { label: "EMail SetUp", to: "/admin/section/system/email-setup" },
    { label: "System SetUp", to: "/admin/settings" },
    { label: "P.Processing Fee", to: "/admin/section/system/p-processing-fee" },
    { label: "VAT SetUp", to: "/admin/section/system/vat-setup" },
    { label: "Activity Loggers", to: "/admin/section/system/activity-loggers" },
    { label: "Automatic Process", to: "/admin/section/system/automatic-process" }
  ]
};

const iconMap: Record<string, any> = {
  Dashboard: LayoutDashboard,
  configuration: Settings,
  client: Users,
  billing: Receipt,
  "mikrotik-server": Server,
  "hr-payroll": UsersRound,
  "olt-management": Cpu,
  "network-diagram": Network,
  "leave-management": CalendarCheck,
  pop: Radio,
  "support-ticketing": Headphones,
  "task-management": ListTodo,
  "bandwidth-buy": Download,
  "bandwidth-sale": Upload,
  purchase: ShoppingCart,
  inventory: Boxes,
  assets: Package,
  "sales-service": HandCoins,
  income: TrendingUp,
  expense: TrendingDown,
  "daily-account": CalendarClock,
  accounting: BookOpen,
  report: BarChart3,
  "sms-service": MessageSquare,
  system: Settings2
};

const mainLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-white text-[#0f2d46] shadow"
      : "text-slate-200 hover:bg-white/10 hover:text-white"
  }`;

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-1.5 text-xs font-medium transition ${
    isActive
      ? "bg-white text-[#0f2d46]"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

const Sidebar = () => {
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const activeSectionKey = useMemo(() => {
    const path = location.pathname;
    return Object.keys(submenuMap).find((key) =>
      submenuMap[key].some((item) => path === item.to || path.startsWith(`${item.to}/`))
    );
  }, [location.pathname]);

  useEffect(() => {
    if (activeSectionKey) {
      setOpenSections((prev) => ({ ...prev, [activeSectionKey]: true }));
    }
  }, [activeSectionKey]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[280px] flex-col bg-[#1f4e6e] px-4 py-6 text-white lg:flex">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/90 p-1">
          <img src={rajameharLogo} alt="Rajamehar Online" className="h-full w-full object-contain" />
        </div>
        <div className="text-lg font-bold tracking-wide text-white">Rajamehar Online</div>
      </div>

      <div className="mt-4 rounded-md bg-white/10 px-3 py-2 text-xs text-slate-100/80">Main Menu</div>

      <nav className="hide-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto pr-2">
        {menuSections.map((item) => {
          const key = item.key ?? item.label;
          const Icon = iconMap[key] ?? LayoutDashboard;

          if (item.to) {
            return (
              <NavLink key={item.label} className={mainLinkClass} to={item.to} end>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          }

          const isOpen = Boolean(openSections[item.key ?? ""]);
          const isActiveSection = activeSectionKey === item.key;

          return (
            <div key={item.label} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(item.key ?? "")}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActiveSection
                    ? "bg-white/10 text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-1 border-l border-white/10 pl-6">
                  {submenuMap[item.key ?? ""]?.map((subItem) => (
                    <NavLink key={subItem.to} className={subLinkClass} to={subItem.to}>
                      {subItem.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
