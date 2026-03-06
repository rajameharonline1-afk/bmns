import { Bell, Headphones, Monitor, Search, UserCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Topbar = () => {
  const { user } = useAuth();
  const isClient = user?.role === "client";

  if (isClient) {
    return (
      <header className="sticky top-0 z-20 flex items-center justify-end gap-4 border-b border-white/10 bg-[#204b6a] px-4 py-2 text-white lg:px-6">
        <button className="relative rounded-full p-2 text-white/90 hover:bg-white/10" title="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-rose-500" />
        </button>
        <div className="h-10 w-px bg-white/20" />
        <div className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <UserCircle className="h-8 w-8 text-white" />
          </div>
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold">{user?.name || "Client"}</div>
            <div className="text-xs text-slate-200">Package: Basic</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 bg-[var(--bmns-topbar)] px-4 py-3 text-white lg:px-6">
      <div className="flex flex-1 items-center gap-3">
        <div className="w-full max-w-xs items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs hidden lg:flex">
          <Search className="h-4 w-4 text-white/80" />
          <input
            type="text"
            placeholder="Search Customer"
            className="w-full bg-transparent text-xs text-white placeholder:text-white/70 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        <button className="hidden items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold lg:flex">
          <Headphones className="h-4 w-4" />
          Open Support Ticket
        </button>
        <button className="hidden items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold lg:flex">
          <Monitor className="h-4 w-4" />
          Online Client Monitoring
        </button>
        <button className="relative rounded-full bg-white/15 p-2 text-xs">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold leading-4">
            1
          </span>
        </button>
        <button className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
          <UserCircle className="h-4 w-4" />
          admin
        </button>
      </div>
    </header>
  );
};

export default Topbar;
