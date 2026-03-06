import { useAuth } from "../../contexts/AuthContext";
import ClientPlaceholderPage from "./ClientPlaceholderPage";

const ClientProfile = () => {
  const { user } = useAuth();

  return (
    <ClientPlaceholderPage title="My Profile" subtitle="View and update your account profile information.">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" defaultValue={user?.name || ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" defaultValue={user?.email || ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
          <input className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" placeholder="01XXXXXXXXX" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <input className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" placeholder="Address" />
        </div>
      </div>
      <button className="mt-4 rounded-md bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white">Update Personal Info</button>
    </ClientPlaceholderPage>
  );
};

export default ClientProfile;
