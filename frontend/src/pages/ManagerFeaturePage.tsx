import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";

interface ManagerFeaturePageProps {
  title: string;
  eyebrow: string;
  description: string;
  backendStatus: string;
}

export function ManagerFeaturePage({
  title,
  eyebrow,
  description,
  backendStatus,
}: ManagerFeaturePageProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.user?.role !== "MANAGER") {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <ManagerSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">{eyebrow}</p>
            <h1 className="mt-1 text-xl font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-300">
              MANAGER
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold transition hover:border-red-700 hover:text-red-300"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-5xl">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 shadow-2xl shadow-slate-950/20 sm:p-9">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">
                    GIAO DIỆN ĐÃ MỞ
                  </span>
                  <h2 className="mt-4 text-3xl font-bold">{title}</h2>
                  <p className="mt-3 max-w-2xl leading-7 text-slate-400">{description}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Backend: {backendStatus}
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-dashed border-slate-600 bg-slate-950/30 p-6">
                <h3 className="font-semibold text-slate-200">Trạng thái triển khai</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Route và giao diện quản lý đã được tạo. Chức năng chỉ kết nối dữ liệu thật khi API nghiệp vụ tương ứng được triển khai và kiểm thử. Không có số liệu giả hoặc thao tác giả được ghi vào PostgreSQL.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
                >
                  ← Về Dashboard
                </Link>
                <Link
                  to="/catalog"
                  className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Mở quản lý thuốc
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
