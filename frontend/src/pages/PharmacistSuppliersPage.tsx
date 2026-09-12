import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { suppliersRequest } from "../lib/manager-api";

type SupplierFilter = "all" | "with-phone" | "without-phone";

export function PharmacistSuppliersPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const token = auth.accessToken ?? "";
  const [filter, setFilter] = useState<SupplierFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  const suppliers = useQuery({
    queryKey: ["pharmacist-suppliers"],
    queryFn: () => suppliersRequest(token),
    enabled: auth.user?.role === "PHARMACIST" && Boolean(token),
    retry: false,
  });

  const filteredSuppliers = useMemo(() => {
    const needle = searchTerm.trim().toLocaleLowerCase("vi");
    return (suppliers.data ?? []).filter((supplier) => {
      if (filter === "with-phone" && !supplier.phone?.trim()) return false;
      if (filter === "without-phone" && supplier.phone?.trim()) return false;
      if (!needle) return true;
      return [supplier.name, supplier.phone, supplier.address, supplier.notes]
        .some((value) => String(value ?? "").toLocaleLowerCase("vi").includes(needle));
    });
  }, [suppliers.data, filter, searchTerm]);

  useEffect(() => {
    if (!filteredSuppliers.length) {
      setSelectedSupplierId(null);
      return;
    }
    const stillVisible = filteredSuppliers.some((supplier) => supplier.id === selectedSupplierId);
    if (!stillVisible) setSelectedSupplierId(filteredSuppliers[0].id);
  }, [filteredSuppliers, selectedSupplierId]);

  if (auth.user?.role !== "PHARMACIST") return <Navigate to="/dashboard" replace />;

  const selectedSupplier =
    filteredSuppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  function selectFilter(nextFilter: SupplierFilter) {
    setFilter(nextFilter);
    setSelectedSupplierId(null);
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">Nhà cung cấp</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Dược sĩ</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300">
              PHARMACIST
            </span>
            <button type="button" onClick={() => void logout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 shadow-2xl shadow-slate-950/20 sm:p-9">
              <div>
                <h2 className="text-3xl font-bold">Nhà cung cấp</h2>
                <p className="mt-3 leading-7 text-slate-400">
                  Tra cứu danh sách nhà cung cấp và chọn từng nhà cung cấp để xem thông tin chi tiết.
                </p>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold">Lọc danh sách</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <FilterButton active={filter === "all"} onClick={() => selectFilter("all")}>Tất cả nhà cung cấp</FilterButton>
                    <FilterButton active={filter === "with-phone"} onClick={() => selectFilter("with-phone")}>Có số điện thoại</FilterButton>
                    <FilterButton active={filter === "without-phone"} onClick={() => selectFilter("without-phone")}>Thiếu số điện thoại</FilterButton>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Dùng ô tìm kiếm bên dưới để tra cứu theo tên, số điện thoại, địa chỉ hoặc ghi chú.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">Thông tin nhà cung cấp đang chọn</h3>
                    <span className="text-xs text-slate-500">{filteredSuppliers.length} kết quả</span>
                  </div>
                  {selectedSupplier ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoCard label="Tên nhà cung cấp" value={selectedSupplier.name} />
                      <InfoCard label="Số điện thoại" value={selectedSupplier.phone || "Chưa có"} />
                      <InfoCard label="Địa chỉ" value={selectedSupplier.address || "Chưa có"} />
                      <InfoCard label="Ghi chú" value={selectedSupplier.notes || "Không có ghi chú"} />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
                      Không có nhà cung cấp phù hợp để hiển thị.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm tên nhà cung cấp, số điện thoại, địa chỉ..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500"
                />
                <button type="button" onClick={() => void suppliers.refetch()} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:border-cyan-500 hover:text-cyan-200">
                  Làm mới
                </button>
              </div>

              {suppliers.isError && (
                <div className="mt-6 rounded-2xl border border-red-700/40 bg-red-950/30 px-5 py-4 text-sm text-red-200">
                  Không thể tải danh sách nhà cung cấp. Hãy thử lại.
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700">
                <div className="border-b border-slate-700 bg-slate-950/30 px-5 py-4">
                  <h3 className="font-bold">Danh sách nhà cung cấp</h3>
                  <p className="mt-1 text-xs text-slate-500">Bấm vào một dòng để xem nhà cung cấp đó ở khung thông tin phía trên.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-950/20 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Nhà cung cấp</th>
                        <th className="px-5 py-3">Số điện thoại</th>
                        <th className="px-5 py-3">Địa chỉ</th>
                        <th className="px-5 py-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {suppliers.isPending ? (
                        <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                      ) : filteredSuppliers.length ? (
                        filteredSuppliers.map((supplier) => {
                          const selected = supplier.id === selectedSupplierId;
                          return (
                            <tr
                              key={supplier.id}
                              onClick={() => setSelectedSupplierId(supplier.id)}
                              className={`cursor-pointer transition ${selected ? "bg-cyan-500/10" : "hover:bg-slate-900/35"}`}
                            >
                              <td className={`px-5 py-4 font-semibold ${selected ? "text-cyan-200" : "text-slate-200"}`}>{supplier.name}</td>
                              <td className="px-5 py-4 text-slate-300">{supplier.phone || "Chưa có"}</td>
                              <td className="px-5 py-4 text-slate-300">{supplier.address || "Chưa có"}</td>
                              <td className="px-5 py-4 text-slate-400">{supplier.notes || "—"}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Không có nhà cung cấp phù hợp.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-sky-700/30 bg-sky-950/25 px-5 py-4 text-sm leading-6 text-sky-200/90">
                Dược sĩ được tra cứu thông tin nhà cung cấp. Việc thêm mới hoặc chỉnh sửa nhà cung cấp thuộc quyền Quản lý.
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/50"}`}>
      {children}
    </button>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}
