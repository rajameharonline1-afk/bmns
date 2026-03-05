import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import type { UserRole } from "../features/auth/types";

interface RequireAuthProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRoles, redirectTo = "/login" }) => {
  const { isAuthenticated, hasRole, isLoading, isBootstrapping } = useAuth();

  if (isLoading || (isBootstrapping && !isAuthenticated)) {
    return <div className="p-10 text-sm text-slate-300">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/app/forbidden" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
