import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import {
  advancedMedicineLookupRequest,
  type AdvancedMedicine,
} from "../lib/manager-api";

const actions = ["Tra cứu thuốc", "Kiểm tra tồn", "Chuẩn bị thông tin tư vấn"] as const;
type Action = (typeof actions)[number];

function formatMoney(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? `${parsed.toLocaleString("vi-VN")} đ` : "—";
}

export function PharmacistSalesSupportPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const token = auth.accessToken ?? "";
  const [action, setAction] = useState<Action>("Tra cứu thuốc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState(1);

  const medicines = useQuery({
    queryKey: ["pharmacist-sales-support", searchTerm],
    queryFn: () => advancedMedicineLookupRequest(token, searchTerm),
    enabled: auth.user?.role === "PHARMACIST" && Boolean(token),
    retry: false,
  });

  const visibleRows = useMemo(() => {
    const rows = medicines.data ?? [];
    if (action === "Kiểm tra tồn") return rows.filter((row) => row.available_quantity > 0);
    return rows;
  }, [medicines.data, action]);

  const selected = useMemo<AdvancedMedicine | null>(() => {
    if (!visibleRows.length) return null;
    return visibleRows.find((row) => row.medicine_id === selectedMedicineId) ?? visibleRows[0];
  }, [visibleRows, selectedMedicineId]);

  useEffect(() => {
    if (!visibleRows.length) {
      setSelectedMedicineId(null);
      return;
    }
    if (!visibleRows.some((row) => row.medicine_id === selectedMedicineId)) {
      setSelectedMedicineId(visibleRows[0].medicine_id);
    }
  }, [visibleRows, selectedMedicineId]);

  if (auth.user?.role !== "PHARMACIST") return <Navigate to="/dashboard" replace />;

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  const enoughStock = Boolean(selected && requestedQuantity > 0 && selected.available_quantity >= requestedQuantity);

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">Hỗ trợ bán thuốc</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Dược sĩ</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300">PHARMACIST</span>
            <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 sm:p-9">
              <h2 className="text-3xl font-bold">Hỗ trợ bán thuốc</h2>
              <p className="mt-3 text-slate-400">Tra cứu thuốc, kiểm tra tồn và chuẩn bị thông tin cần thiết trước khi hỗ trợ khách.</p>

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold">Thao tác chính</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {actions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAction(item)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${action === item ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold">Thông tin cần theo dõi</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Info label="Thuốc" value={selected?.name ?? "—"} />
                    <Info label="Tồn khả dụng" value={selected?.available_quantity ?? "—"} />
                    <Info label="Giá bán từ" value={selected?.min_selling_price ? formatMoney(selected.min_selling_price) : "—"} />
                    <Info label="Giá bán đến" value={selected?.max_selling_price ? formatMoney(selected.max_selling_price) : "—"} />
                    <Info label="Hạn dùng gần nhất" value={selected?.nearest_expiry ?? "—"} />
                    <Info
                      label="Trạng thái"
                      value={
                        !selected
                          ? "—"
                          : action === "Chuẩn bị thông tin tư vấn"
                            ? enoughStock
                              ? "Đủ số lượng dự kiến"
                              : "Không đủ số lượng dự kiến"
                            : selected.available_quantity > 0
                              ? "Còn hàng"
                              : "Hết hàng"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên hoặc mã thuốc..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500"
                />

                {action === "Chuẩn bị thông tin tư vấn" && (
                  <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-400">
                    Số lượng dự kiến
                    <input
                      type="number"
                      min={1}
                      value={requestedQuantity}
                      onChange={(event) => setRequestedQuantity(Math.max(1, Number(event.target.value) || 1))}
                      className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-slate-100 outline-none focus:border-cyan-500"
                    />
                  </label>
                )}
              </div>

              {action === "Kiểm tra tồn" && selected && (
                <div className="mt-5 rounded-2xl border border-cyan-700/30 bg-cyan-950/20 px-5 py-4 text-sm leading-6 text-cyan-100">
                  <strong>{selected.name}</strong> hiện còn <strong>{selected.available_quantity}</strong> đơn vị khả dụng.
                  {selected.nearest_expiry ? ` Hạn dùng gần nhất: ${selected.nearest_expiry}.` : ""}
                </div>
              )}

              {action === "Chuẩn bị thông tin tư vấn" && selected && (
                <div className={`mt-5 rounded-2xl border px-5 py-4 text-sm leading-6 ${enoughStock ? "border-emerald-700/30 bg-emerald-950/20 text-emerald-100" : "border-amber-700/30 bg-amber-950/20 text-amber-100"}`}>
                  <p><strong>Thông tin chuẩn bị:</strong> {selected.name} ({selected.code})</p>
                  <p>Tồn khả dụng: {selected.available_quantity} · Số lượng dự kiến: {requestedQuantity}</p>
                  <p>Khoảng giá bán: {selected.min_selling_price ? formatMoney(selected.min_selling_price) : "—"}{selected.max_selling_price && selected.max_selling_price !== selected.min_selling_price ? ` - ${formatMoney(selected.max_selling_price)}` : ""}</p>
                  <p>Hạn dùng gần nhất: {selected.nearest_expiry ?? "—"}</p>
                  <p className="mt-2 font-semibold">{enoughStock ? "Có thể tiếp tục hỗ trợ bán theo số lượng dự kiến." : "Số lượng dự kiến vượt quá tồn khả dụng. Hãy giảm số lượng hoặc chọn thuốc khác."}</p>
                </div>
              )}

              {medicines.isError && (
                <div className="mt-5 rounded-2xl border border-red-700/40 bg-red-950/30 px-5 py-4 text-sm text-red-200">Không thể tải danh sách thuốc. Hãy thử lại.</div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/30 px-5 py-4">
                  <h3 className="font-bold">Danh sách thuốc</h3>
                  <button type="button" onClick={() => void medicines.refetch()} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500 hover:text-cyan-200">Làm mới</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-950/20 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Mã</th>
                        <th className="px-5 py-3">Thuốc</th>
                        <th className="px-5 py-3">Nhóm</th>
                        <th className="px-5 py-3">Tồn</th>
                        <th className="px-5 py-3">Giá từ</th>
                        <th className="px-5 py-3">HSD gần nhất</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {medicines.isPending ? (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                      ) : visibleRows.length ? (
                        visibleRows.map((row) => (
                          <tr
                            key={row.medicine_id}
                            onClick={() => setSelectedMedicineId(row.medicine_id)}
                            className={`cursor-pointer transition ${selected?.medicine_id === row.medicine_id ? "bg-cyan-500/10" : "hover:bg-slate-900/35"}`}
                          >
                            <td className="px-5 py-4 font-mono text-xs text-cyan-300">{row.code}</td>
                            <td className="px-5 py-4 font-semibold text-slate-100">{row.name}</td>
                            <td className="px-5 py-4 text-slate-300">{row.group_name}</td>
                            <td className="px-5 py-4">{row.available_quantity}</td>
                            <td className="px-5 py-4">{row.min_selling_price ? formatMoney(row.min_selling_price) : "—"}</td>
                            <td className="px-5 py-4">{row.nearest_expiry ?? "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Không có thuốc phù hợp.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}
