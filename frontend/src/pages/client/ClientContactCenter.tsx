import ClientPlaceholderPage from "./ClientPlaceholderPage";

const ClientContactCenter = () => (
  <ClientPlaceholderPage title="Contact Center" subtitle="Reach BMNS support center quickly.">
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
        <p className="text-xs uppercase text-slate-500">Hotline</p>
        <p className="mt-1 text-lg font-semibold text-[#1f4e6e]">+88 09611430403</p>
      </div>
      <div className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
        <p className="text-xs uppercase text-slate-500">Email</p>
        <p className="mt-1 text-lg font-semibold text-[#1f4e6e]">info@incomitbd.com</p>
      </div>
      <div className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
        <p className="text-xs uppercase text-slate-500">Office Hours</p>
        <p className="mt-1 text-lg font-semibold text-[#1f4e6e]">24/7 NOC</p>
      </div>
    </div>
  </ClientPlaceholderPage>
);

export default ClientContactCenter;
