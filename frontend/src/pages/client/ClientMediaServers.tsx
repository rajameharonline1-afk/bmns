import ClientPlaceholderPage from "./ClientPlaceholderPage";

const servers = [
  { name: "FTP Server", url: "ftp://media.bmns.local" },
  { name: "Live TV", url: "http://tv.bmns.local" },
  { name: "Movie Hub", url: "http://movies.bmns.local" },
];

const ClientMediaServers = () => (
  <ClientPlaceholderPage title="Media Servers" subtitle="Local media and entertainment services for clients.">
    <div className="grid gap-3 md:grid-cols-3">
      {servers.map((server) => (
        <div key={server.name} className="rounded-md border border-[#d6dee8] bg-[#f8fbfe] p-4">
          <h3 className="text-base font-semibold text-[#1f4e6e]">{server.name}</h3>
          <p className="mt-2 text-xs text-slate-500">{server.url}</p>
          <button className="mt-3 rounded-md bg-[#0f7fbc] px-3 py-1.5 text-xs font-semibold text-white">Open</button>
        </div>
      ))}
    </div>
  </ClientPlaceholderPage>
);

export default ClientMediaServers;
