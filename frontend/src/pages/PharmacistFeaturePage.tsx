import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { pharmacistDemoFeatureData } from "../lib/demo-data";
import { pharmacistFeatureContent } from "../lib/feature-content";
import {
  advancedMedicineLookupRequest,
  batchesRequest,
  expiredBatchesRequest,
  expiringBatchesRequest,
  inventoryRequest,
  suppliersRequest,
} from "../lib/manager-api";

interface PharmacistFeaturePageProps {
  title: string;
  description: string;
  status?: string;
  safetyNote?: string;
}

type CellValue = string | number;

interface FeatureDataset {
  columns: string[];
  rows: CellValue[][];
  fieldValues: Record<string, CellValue>;
}

const LIVE_FEATURES = new Set([
  "Tồn kho & lô thuốc",
  "Nhà cung cấp",
  "Cảnh báo",
  "Hỗ trợ bán thuốc",
  "Báo cáo",
]);

function formatMoney(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? `${parsed.toLocaleString("vi-VN")} đ` : "—";
}

function includesQuery(values: Array<string | number | null | undefined>, query: string) {
  if (!query.trim()) return true;
  const needle = query.trim().toLocaleLowerCase("vi");
  return values.some((value) => String(value ?? "").toLocaleLowerCase("vi").includes(needle));
}

async function loadLiveDataset(
  accessToken: string,
  title: string,
  action: string,
  query: string,
  lowStockThreshold: number,
  expiryDays: number,
): Promise<FeatureDataset> {
  if (title === "Tồn kho & lô thuốc") {
    if (action === "Tra cứu lô") {
      const batches = (await batchesRequest(accessToken)).filter((batch) =>
        includesQuery([batch.code, batch.medicine_name, batch.supplier_name], query),
      );
      return {
        columns: ["Thuốc", "Lô", "Tồn", "Hạn sử dụng", "Trạng thái"],
        rows: batches.map((batch) => [
          batch.medicine_name,
          batch.code,
          batch.quantity_remaining,
          batch.expiry_date,
          batch.quantity_remaining <= lowStockThreshold ? "Tồn thấp" : "Còn hàng",
        ]),
        fieldValues: {
          Thuốc: `${new Set(batches.map((batch) => batch.medicine_id)).size} thuốc`,
          "Mã lô": `${batches.length} lô`,
          "Tồn hiện tại": batches.reduce((sum, batch) => sum + batch.quantity_remaining, 0),
          "Ngưỡng tối thiểu": lowStockThreshold,
          "Hạn sử dụng": batches[0]?.expiry_date ?? "—",
        },
      };
    }

    const rows = await inventoryRequest(
      accessToken,
      action === "Lọc tồn thấp" ? lowStockThreshold : undefined,
    );
    const filtered = rows.filter((row) =>
      includesQuery([row.medicine_name, row.medicine_code, row.batch_code], query),
    );
    return {
      columns: ["Thuốc", "Lô", "Tồn", "Hạn sử dụng", "Trạng thái"],
      rows: filtered.map((row) => [
        row.medicine_name,
        row.batch_code,
        row.quantity_remaining,
        row.expiry_date,
        row.quantity_remaining <= lowStockThreshold ? "Tồn thấp" : "Còn hàng",
      ]),
      fieldValues: {
        Thuốc: `${new Set(filtered.map((row) => row.medicine_id)).size} thuốc`,
        "Mã lô": `${filtered.length} lô`,
        "Tồn hiện tại": filtered.reduce((sum, row) => sum + row.quantity_remaining, 0),
        "Ngưỡng tối thiểu": lowStockThreshold,
        "Hạn sử dụng": filtered[0]?.expiry_date ?? "—",
      },
    };
  }

  if (title === "Nhà cung cấp") {
    const suppliers = (await suppliersRequest(accessToken)).filter((supplier) => {
      if (action === "Lọc có liên hệ" && !supplier.phone) return false;
      return includesQuery([supplier.name, supplier.phone, supplier.address], query);
    });
    return {
      columns: ["Nhà cung cấp", "Liên hệ", "Địa chỉ", "Trạng thái"],
      rows: suppliers.map((supplier) => [
        supplier.name,
        supplier.phone ?? "—",
        supplier.address ?? "—",
        "Đang hoạt động",
      ]),
      fieldValues: {
        "Tên nhà cung cấp": suppliers[0]?.name ?? "—",
        "Số điện thoại": suppliers[0]?.phone ?? "—",
        "Địa chỉ": suppliers[0]?.address ?? "—",
        "Ghi chú": suppliers[0]?.notes ?? "—",
      },
    };
  }

  if (title === "Cảnh báo") {
    if (action === "Xem sắp hết hạn") {
      const rows = (await expiringBatchesRequest(accessToken, expiryDays)).filter((row) =>
        includesQuery([row.medicine_name, row.medicine_code, row.batch_code], query),
      );
      return {
        columns: ["Thuốc", "Lô", "Loại cảnh báo", "Thời điểm", "Trạng thái"],
        rows: rows.map((row) => [
          row.medicine_name,
          row.batch_code,
          "Sắp hết hạn",
          `${row.days_remaining} ngày`,
          "Cần theo dõi",
        ]),
        fieldValues: {
          Thuốc: `${rows.length} lô`,
          "Mã lô": rows[0]?.batch_code ?? "—",
          "Hạn sử dụng": rows[0]?.expiry_date ?? "—",
          "Mức cảnh báo": `Trong ${expiryDays} ngày`,
        },
      };
    }

    if (action === "Xem đã hết hạn") {
      const rows = (await expiredBatchesRequest(accessToken)).filter((row) =>
        includesQuery([row.medicine_name, row.medicine_code, row.batch_code], query),
      );
      return {
        columns: ["Thuốc", "Lô", "Loại cảnh báo", "Thời điểm", "Trạng thái"],
        rows: rows.map((row) => [
          row.medicine_name,
          row.batch_code,
          "Đã hết hạn",
          `${Math.abs(row.days_remaining)} ngày trước`,
          "Không được bán",
        ]),
        fieldValues: {
          Thuốc: `${rows.length} lô`,
          "Mã lô": rows[0]?.batch_code ?? "—",
          "Hạn sử dụng": rows[0]?.expiry_date ?? "—",
          "Mức cảnh báo": "Khẩn cấp",
        },
      };
    }

    const rows = (await inventoryRequest(accessToken, lowStockThreshold)).filter((row) =>
      includesQuery([row.medicine_name, row.medicine_code, row.batch_code], query),
    );
    return {
      columns: ["Thuốc", "Lô", "Loại cảnh báo", "Thời điểm", "Trạng thái"],
      rows: rows.map((row) => [
        row.medicine_name,
        row.batch_code,
        "Tồn thấp",
        `Còn ${row.quantity_remaining}`,
        "Cần nhập thêm",
      ]),
      fieldValues: {
        Thuốc: `${rows.length} lô`,
        "Mã lô": rows[0]?.batch_code ?? "—",
        "Hạn sử dụng": rows[0]?.expiry_date ?? "—",
        "Mức cảnh báo": `Tồn ≤ ${lowStockThreshold}`,
      },
    };
  }

  if (title === "Hỗ trợ bán thuốc") {
    const rows = await advancedMedicineLookupRequest(accessToken, query);
    const filtered = action === "Kiểm tra tồn"
      ? rows.filter((row) => row.available_quantity > 0)
      : rows;
    return {
      columns: ["Thuốc", "Tồn", "Giá bán", "Ghi chú"],
      rows: filtered.map((row) => [
        `${row.name} (${row.code})`,
        row.available_quantity,
        row.min_selling_price ? formatMoney(row.min_selling_price) : "—",
        row.available_quantity > 0
          ? `HSD gần nhất: ${row.nearest_expiry ?? "—"}`
          : "Hết hàng",
      ]),
      fieldValues: {
        Thuốc: filtered[0]?.name ?? "—",
        "Tồn khả dụng": filtered[0]?.available_quantity ?? 0,
        "Số lượng dự kiến": "—",
        "Ghi chú": action === "Chuẩn bị thông tin tư vấn"
          ? "Kiểm tra tên thuốc, tồn, giá và hạn dùng trước khi hỗ trợ khách"
          : "—",
      },
    };
  }

  if (title === "Báo cáo") {
    if (action === "Báo cáo tồn thấp") {
      const rows = await inventoryRequest(accessToken, lowStockThreshold);
      return {
        columns: ["Thuốc", "Tồn", "Lô", "Ghi chú"],
        rows: rows.map((row) => [
          row.medicine_name,
          row.quantity_remaining,
          row.batch_code,
          `Ngưỡng ${lowStockThreshold}`,
        ]),
        fieldValues: {
          "Loại báo cáo": "Tồn thấp",
          "Từ ngày": "Hiện tại",
          "Đến ngày": "Hiện tại",
        },
      };
    }

    if (action === "Báo cáo thuốc sắp hết hạn") {
      const rows = await expiringBatchesRequest(accessToken, expiryDays);
      return {
        columns: ["Thuốc", "Tồn", "Lô", "Còn lại"],
        rows: rows.map((row) => [
          row.medicine_name,
          row.quantity_remaining,
          row.batch_code,
          `${row.days_remaining} ngày`,
        ]),
        fieldValues: {
          "Loại báo cáo": "Thuốc sắp hết hạn",
          "Từ ngày": "Hôm nay",
          "Đến ngày": `${expiryDays} ngày tới`,
        },
      };
    }

    const rows = await inventoryRequest(accessToken);
    return {
      columns: ["Thuốc", "Tồn", "Lô", "Hạn sử dụng"],
      rows: rows.map((row) => [
        row.medicine_name,
        row.quantity_remaining,
        row.batch_code,
        row.expiry_date,
      ]),
      fieldValues: {
        "Loại báo cáo": "Tồn kho",
        "Từ ngày": "Hiện tại",
        "Đến ngày": "Hiện tại",
      },
    };
  }

  return { columns: [], rows: [], fieldValues: {} };
}

export function PharmacistFeaturePage({
  title,
  description,
  safetyNote,
}: PharmacistFeaturePageProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const content = pharmacistFeatureContent[title] ?? {
    actions: ["Xem thông tin"],
    fields: ["Thông tin"],
    columns: ["Thông tin", "Trạng thái"],
  };
  const demo = pharmacistDemoFeatureData[title];
  const [activeAction, setActiveAction] = useState(content.actions[0] ?? "Xem thông tin");
  const [searchTerm, setSearchTerm] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [expiryDays, setExpiryDays] = useState(30);
  const accessToken = auth.accessToken ?? "";
  const hasLiveApi = LIVE_FEATURES.has(title);

  const liveData = useQuery({
    queryKey: [
      "pharmacist-feature-live",
      title,
      activeAction,
      searchTerm,
      lowStockThreshold,
      expiryDays,
    ],
    queryFn: () =>
      loadLiveDataset(
        accessToken,
        title,
        activeAction,
        searchTerm,
        lowStockThreshold,
        expiryDays,
      ),
    enabled: auth.user?.role === "PHARMACIST" && Boolean(accessToken) && hasLiveApi,
    retry: false,
  });

  if (auth.user?.role !== "PHARMACIST") {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  function handleAction(action: string) {
    setActiveAction(action);
    if (action === "Xem tồn kho" || action === "Xem danh sách" || action === "Báo cáo tồn kho") {
      setSearchTerm("");
    }
  }

  const dataset: FeatureDataset = hasLiveApi && liveData.data
    ? liveData.data
    : {
        columns: content.columns,
        rows: demo?.rows ?? [],
        fieldValues: demo?.fieldValues ?? {},
      };

  const showThresholdControl =
    title === "Tồn kho & lô thuốc" ||
    (title === "Cảnh báo" && activeAction === "Xem tồn thấp") ||
    (title === "Báo cáo" && activeAction === "Báo cáo tồn thấp");

  const showExpiryControl =
    (title === "Cảnh báo" && activeAction === "Xem sắp hết hạn") ||
    (title === "Báo cáo" && activeAction === "Báo cáo thuốc sắp hết hạn");

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
            <span className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300">
              PHARMACIST
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
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 shadow-2xl shadow-slate-950/20 sm:p-9">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold">{title}</h2>
                <p className="mt-3 leading-7 text-slate-400">{description}</p>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold text-slate-100">Thao tác chính</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {content.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleAction(action)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          activeAction === action
                            ? "border-cyan-500 bg-cyan-500/15 text-cyan-200"
                            : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800"
                        }`}
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
                      <div
                        key={field}
                        className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3"
                      >
                        <p className="text-xs uppercase tracking-wide text-slate-500">{field}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-200">
                          {dataset.fieldValues[field] ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {hasLiveApi && (
                <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm theo tên thuốc, mã thuốc, mã lô, nhà cung cấp..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                  />

                  {showThresholdControl && (
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-400">
                      Ngưỡng tồn
                      <input
                        type="number"
                        min={0}
                        value={lowStockThreshold}
                        onChange={(event) =>
                          setLowStockThreshold(Math.max(0, Number(event.target.value) || 0))
                        }
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-slate-100 outline-none focus:border-cyan-500"
                      />
                    </label>
                  )}

                  {showExpiryControl && (
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-400">
                      Cảnh báo trước
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={expiryDays}
                        onChange={(event) =>
                          setExpiryDays(Math.min(3650, Math.max(1, Number(event.target.value) || 1)))
                        }
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-slate-100 outline-none focus:border-cyan-500"
                      />
                      ngày
                    </label>
                  )}
                </div>
              )}

              {liveData.isError && (
                <div className="mt-6 rounded-2xl border border-red-700/40 bg-red-950/30 px-5 py-4 text-sm text-red-200">
                  Không thể tải dữ liệu. Hãy kiểm tra lại kết nối hệ thống rồi thử lại.
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-950/30 px-5 py-4">
                  <h3 className="font-bold text-slate-100">Danh sách dữ liệu</h3>
                  {hasLiveApi && (
                    <button
                      type="button"
                      onClick={() => void liveData.refetch()}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-200"
                    >
                      Làm mới
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-950/20 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {dataset.columns.map((column) => (
                          <th key={column} className="px-5 py-3">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {liveData.isPending && hasLiveApi ? (
                        <tr>
                          <td
                            colSpan={dataset.columns.length || 1}
                            className="px-5 py-10 text-center text-slate-500"
                          >
                            Đang tải dữ liệu...
                          </td>
                        </tr>
                      ) : dataset.rows.length ? (
                        dataset.rows.map((row, rowIndex) => (
                          <tr key={`${title}-${rowIndex}`} className="hover:bg-slate-900/35">
                            {dataset.columns.map((column, columnIndex) => (
                              <td
                                key={`${column}-${columnIndex}`}
                                className="px-5 py-4 text-slate-300"
                              >
                                {row[columnIndex] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={dataset.columns.length || 1}
                            className="px-5 py-10 text-center text-slate-500"
                          >
                            Không có dữ liệu phù hợp.
                          </td>
                        </tr>
                      )}
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
                <Link
                  to="/dashboard"
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                  ← Về Dashboard
                </Link>
                <Link
                  to="/pharmacist/medicines"
                  className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
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
