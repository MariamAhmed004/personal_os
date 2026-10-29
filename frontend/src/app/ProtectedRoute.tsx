import { Navigate, Outlet } from "react-router-dom";
import { isDemoMode } from "../demo/config";

export function ProtectedRoute() {
  return isDemoMode || localStorage.getItem("access_token") ? <Outlet /> : <Navigate to="/login" replace />;
}
