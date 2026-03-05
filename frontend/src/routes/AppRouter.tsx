import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import RequireAuth from "./RequireAuth";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminBilling from "../pages/admin/AdminBilling";
import AdminClients from "../pages/admin/AdminClients";
import AddNewClient from "../pages/admin/AddNewClient";
import AdminNetwork from "../pages/admin/AdminNetwork";
import MikrotikServer from "../pages/admin/MikrotikServer";
import ImportFromMikrotik from "../pages/admin/ImportFromMikrotik";
import OltManage from "../pages/admin/OltManage";
import OnuInventory from "../pages/admin/OnuInventory";
import ConfigurationMaster from "../pages/admin/ConfigurationMaster";
import LandingContentManager from "../pages/admin/LandingContentManager";
import ClientDashboard from "../pages/client/ClientDashboard";
import ClientInvoices from "../pages/client/ClientInvoices";
import ClientPayBill from "../pages/client/ClientPayBill";
import LoginPage from "../pages/auth/LoginPage";
import LandingPage from "../pages/public/LandingPage";
import NotFound from "../pages/public/NotFound";
import Forbidden from "../pages/public/Forbidden";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/app",
    element: <DashboardLayout />,
    children: [
      {
        element: <RequireAuth allowedRoles={["admin", "manager", "employee", "reseller"]} />,
        children: [
          { path: "admin", element: <AdminDashboard /> },
          { path: "admin/clients", element: <AdminClients /> },
          { path: "admin/section/client/client-list", element: <AdminClients /> },
          { path: "admin/section/client/add-new", element: <AddNewClient /> },
          { path: "admin/billing", element: <AdminBilling /> },
          { path: "admin/network", element: <AdminNetwork /> },
          { path: "admin/section/mikrotik-server/server", element: <MikrotikServer /> },
          { path: "admin/section/mikrotik-server/import-from-mikrotik", element: <ImportFromMikrotik /> },
          { path: "admin/section/configuration/zone", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/sub-zone", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/box", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/connection-type", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/client-type", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/protocol-type", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/billing-status", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/package", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/district", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/upazila", element: <ConfigurationMaster /> },
          { path: "admin/section/configuration/landing-content", element: <LandingContentManager /> },
          { path: "admin/section/olt-management/olt-list", element: <OltManage /> },
          { path: "admin/section/olt-management/onu-inventory", element: <OnuInventory /> },
        ],
      },
      {
        element: <RequireAuth allowedRoles={["client"]} />,
        children: [
          { path: "client", element: <ClientDashboard /> },
          { path: "client/invoices", element: <ClientInvoices /> },
          { path: "client/pay", element: <ClientPayBill /> },
        ],
      },
      { path: "forbidden", element: <Forbidden /> },
    ],
  },
  {
    path: "/admin",
    element: <DashboardLayout />,
    children: [
      {
        element: <RequireAuth allowedRoles={["admin", "manager", "employee", "reseller"]} />,
        children: [
          { path: "section/client/client-list", element: <AdminClients /> },
          { path: "section/mikrotik-server/server", element: <MikrotikServer /> },
          { path: "section/client/add-new", element: <AddNewClient /> },
          { path: "section/mikrotik-server/import-from-mikrotik", element: <ImportFromMikrotik /> },
          { path: "section/configuration/zone", element: <ConfigurationMaster /> },
          { path: "section/configuration/sub-zone", element: <ConfigurationMaster /> },
          { path: "section/configuration/box", element: <ConfigurationMaster /> },
          { path: "section/configuration/connection-type", element: <ConfigurationMaster /> },
          { path: "section/configuration/client-type", element: <ConfigurationMaster /> },
          { path: "section/configuration/protocol-type", element: <ConfigurationMaster /> },
          { path: "section/configuration/billing-status", element: <ConfigurationMaster /> },
          { path: "section/configuration/package", element: <ConfigurationMaster /> },
          { path: "section/configuration/district", element: <ConfigurationMaster /> },
          { path: "section/configuration/upazila", element: <ConfigurationMaster /> },
          { path: "section/configuration/landing-content", element: <LandingContentManager /> },
          { path: "section/olt-management/olt-list", element: <OltManage /> },
          { path: "section/olt-management/onu-inventory", element: <OnuInventory /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
