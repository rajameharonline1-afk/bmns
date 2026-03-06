import { Outlet } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar";
import Topbar from "../components/navigation/Topbar";

const DashboardLayout = () => {
  return (
    <div className="ds-shell min-h-screen text-slate-900">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-[280px]">
        <Topbar />
        <main className="ds-shell flex-1 px-3 py-4 lg:px-6">
          <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
