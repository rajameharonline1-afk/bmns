import { Bell, Headphones, Monitor, Search, UserCircle } from "lucide-react";

const Topbar = () => {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 bg-[#1f4e6e] px-4 py-3 text-white lg:px-6">
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
