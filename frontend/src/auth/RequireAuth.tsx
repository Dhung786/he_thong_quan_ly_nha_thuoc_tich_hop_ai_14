import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-context";

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4">
          Đang kiểm tra phiên đăng nhập...
        </div>
      </main>
    );
  }

  if (auth.status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
