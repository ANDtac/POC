import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth.jsx";

export default function RequireAuth() {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
