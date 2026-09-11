import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { pharmacistFeatureContent } from "../lib/feature-content";

interface PharmacistFeaturePageProps {
  title: string;
  description: string;
  status: string;
  safetyNote?: string;
}

export function PharmacistFeaturePage({ title, description, status, safetyNote }: PharmacistFeaturePageProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const content = pharmacistFeatureContent[title] ?? {
    actions: ["Xem thông tin"],
    fields: ["Thông tin"],
    columns: ["Thông tin", "Trạng thái"],
  };

  if (auth.user?.role !== "PHARMACIST") {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Dược sĩ</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300">PHARMACIST</span>
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
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 shadow-2xl shadow-slate-950/20 sm:p-9">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <h2 className="text-3xl font-bold">{title}</h2>
                  <p className="mt-3 leading-7 text-slate-400">{description}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {status}
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold text-slate-100">Thao tác chính</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {content.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled
                        title="Sẽ hoạt động khi API nghiệp vụ được kết nối"
                        className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-left text-sm font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold text-slate-100">Thông tin cần theo dõi</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {content.fields.map((field) => (
                      <div key={field} className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">{field}</p>
                        <p className="mt-2 text-sm text-slate-400">Chưa có dữ liệu</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-950/30 px-5 py-4">
                  <h3 className="font-bold text-slate-100">Danh sách dữ liệu</h3>
                  <span className="text-xs text-slate-500">Dữ liệu thật sẽ hiển thị tại đây</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-950/20 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {content.columns.map((column) => (
                          <th key={column} className="px-5 py-3">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={content.columns.length} className="px-5 py-10 text-center text-slate-500">
                          Chưa có dữ liệu để hiển thị.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {(content.note || safetyNote) && (
                <div className="mt-6 rounded-2xl border border-sky-700/30 bg-sky-950/25 px-5 py-4 text-sm leading-6 text-sky-200/90">
                  {content.note ?? safetyNote}
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/dashboard" className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
                  ← Về Dashboard
                </Link>
                <Link to="/pharmacist/medicines" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
                  Tra cứu thuốc
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
