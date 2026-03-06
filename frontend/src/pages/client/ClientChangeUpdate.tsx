import ClientPlaceholderPage from "./ClientPlaceholderPage";

const ClientChangeUpdate = () => (
  <ClientPlaceholderPage title="Change/Update" subtitle="Submit package migration or profile update requests.">
    <form className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Request Type</label>
        <select className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm">
          <option>Package Migration</option>
          <option>Address Update</option>
          <option>Device Replacement</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Preferred Date</label>
        <input type="date" className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">Details</label>
        <textarea rows={4} className="w-full rounded-md border border-[#d6dee8] px-3 py-2 text-sm" placeholder="Write your request..." />
      </div>
      <div className="md:col-span-2">
        <button type="button" className="rounded-md bg-[#1f4e6e] px-4 py-2 text-sm font-semibold text-white">Submit Request</button>
      </div>
    </form>
  </ClientPlaceholderPage>
);

export default ClientChangeUpdate;
