import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute() {
  return localStorage.getItem("access_token") ? <Outlet /> : <Navigate to="/login" replace />;
}
