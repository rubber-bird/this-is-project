import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./AuthContext";

export function RedirectIfAuthed() {
  const { user, checked } = useAuth();
  if (!checked) return null;
  if (user) return <Navigate to="/projects" replace />;
  return <Outlet />;
}
