import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";

export function PharmacistMedicineLookupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken ?? "";
  const [search, setSearch] = useState("");

  const medicines = useQuery({
    queryKey: ["pharmacist-medicine-lookup", search],
    queryFn: () => pharmacistMedicineLookupRequest(accessToken, search),
    enabled: auth.user?.role === "PHARMACIST" && Boolean(accessToken),
    retry: false,
  });

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
          <h1 className="text-xl font-bold sm:text-2xl">Tra cứu thuốc</h1>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300 sm:inline-flex">
              PHARMACIST · CHỈ XEM
            </span>
            <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold transition hover:border-red-700 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Tìm thông tin thuốc</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Tìm theo mã hoặc tên thuốc. Dược sĩ có thể xem thông tin thuốc, nhóm thuốc và đơn vị tính nhưng không chỉnh sửa danh mục.
                </p>
              </div>
              <div className="w-full lg:max-w-md">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="medicine-search">Từ khóa</label>
                <input
                  id="medicine-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nhập mã hoặc tên thuốc"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-700/70">
              <div className="grid grid-cols-[0.8fr_1.4fr_1fr_0.8fr] gap-3 bg-slate-950/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Mã thuốc</span><span>Tên thuốc</span><span>Nhóm thuốc</span><span>Đơn vị</span>
              </div>

              {medicines.isPending ? (
                <StateMessage title="Đang tải dữ liệu..." />
              ) : medicines.isError ? (
                <StateMessage title="Không tải được dữ liệu thuốc" />
              ) : medicines.data.length === 0 ? (
                <StateMessage title="Không tìm thấy thuốc phù hợp" />
              ) : (
                <div className="divide-y divide-slate-700/60">
                  {medicines.data.map((medicine) => (
                    <div key={medicine.id} className="grid grid-cols-[0.8fr_1.4fr_1fr_0.8fr] gap-3 px-4 py-4 text-sm">
                      <span className="font-mono text-sky-300">{medicine.code}</span>
                      <span className="font-semibold text-slate-100">{medicine.name}</span>
                      <span className="text-slate-400">{medicine.group_name}</span>
                      <span className="text-slate-400">{medicine.unit_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StateMessage({ title }: { title: string }) {
  return <div className="px-6 py-10 text-center text-sm text-slate-500">{title}</div>;
}
