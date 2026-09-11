import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { ApiError, medicinesRequest } from "../lib/api";
import { formatVnd } from "../lib/demo-data";
import {
  accountsRequest,
  advancedMedicineLookupRequest,
  batchesRequest,
  cancelInvoiceRequest,
  changeAccountActiveRequest,
  changeAccountRoleRequest,
  createAccountRequest,
  createBatchRequest,
  createInvoiceRequest,
  createSupplierRequest,
  expiredBatchesRequest,
  expiringBatchesRequest,
  finalizeInvoiceRequest,
  inventoryRequest,
  invoicesRequest,
  reportSummaryRequest,
  resetAccountPasswordRequest,
  suppliersRequest,
  type MedicineBatch,
} from "../lib/manager-api";

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    const support = error.correlationId ? ` · mã hỗ trợ ${error.correlationId}` : "";
    return `${error.message}${support}`;
  }
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi không xác định";
}

function ManagerShell({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children: ReactNode;
}) {
  const auth = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <ManagerSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[84px] flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0d152a] px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-xs font-semibold text-emerald-400">{status}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-sky-700/60 bg-sky-900/20 px-3 py-2 text-xs font-semibold text-sky-300">
              MANAGER
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.user?.role !== "MANAGER") return <Navigate to="/dashboard" replace />;
  return children;
}

function Feedback({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-5 rounded-xl border border-sky-700/40 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
      {text}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#18253a] p-5 shadow-xl shadow-slate-950/10 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/35 px-3 py-2.5 text-sm outline-none focus:border-sky-500";
const buttonClass =
  "rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50";

export function ManagerImportsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? "";
  const [feedback, setFeedback] = useState<string | null>(null);
  const [supplier, setSupplier] = useState({ name: "", phone: "", address: "" });
  const [batch, setBatch] = useState({
    code: "",
    medicineId: "",
    supplierId: "",
    quantity: "",
    receivedDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    purchasePrice: "",
    sellingPrice: "",
  });

  const suppliers = useQuery({
    queryKey: ["manager-suppliers"],
    queryFn: () => suppliersRequest(token),
    enabled: Boolean(token),
  });
  const batches = useQuery({
    queryKey: ["manager-batches"],
    queryFn: () => batchesRequest(token),
    enabled: Boolean(token),
  });
  const medicines = useQuery({
    queryKey: ["manager-import-medicines"],
    queryFn: () => medicinesRequest(token),
    enabled: Boolean(token),
  });

  const addSupplier = useMutation({
    mutationFn: () => createSupplierRequest(token, supplier),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-suppliers"] });
      setSupplier({ name: "", phone: "", address: "" });
      setFeedback("Đã thêm nhà cung cấp vào PostgreSQL.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const addBatch = useMutation({
    mutationFn: () =>
      createBatchRequest(token, {
        code: batch.code.trim(),
        medicine_id: Number(batch.medicineId),
        supplier_id: Number(batch.supplierId),
        quantity_received: Number(batch.quantity),
        received_date: batch.receivedDate,
        expiry_date: batch.expiryDate,
        purchase_price: Number(batch.purchasePrice),
        selling_price: Number(batch.sellingPrice),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-batches"] });
      setBatch((current) => ({
        ...current,
        code: "",
        quantity: "",
        expiryDate: "",
        purchasePrice: "",
        sellingPrice: "",
      }));
      setFeedback("Đã lưu lô nhập và giá thuốc vào PostgreSQL.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  function submitSupplier(event: FormEvent) {
    event.preventDefault();
    if (!supplier.name.trim()) return setFeedback("Hãy nhập tên nhà cung cấp.");
    addSupplier.mutate();
  }

  function submitBatch(event: FormEvent) {
    event.preventDefault();
    if (
      !batch.code.trim() ||
      !batch.medicineId ||
      !batch.supplierId ||
      Number(batch.quantity) <= 0 ||
      !batch.receivedDate ||
      !batch.expiryDate
    ) {
      return setFeedback("Hãy nhập đầy đủ thông tin lô thuốc.");
    }
    addBatch.mutate();
  }

  return (
    <Guard>
      <ManagerShell title="Quản lý nhập thuốc" status="API lô nhập và nhà cung cấp đã kết nối">
        <Feedback text={feedback} />
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Thêm nhà cung cấp">
            <form onSubmit={submitSupplier} className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Tên nhà cung cấp"
                value={supplier.name}
                onChange={(event) => setSupplier({ ...supplier, name: event.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Số điện thoại"
                value={supplier.phone}
                onChange={(event) => setSupplier({ ...supplier, phone: event.target.value })}
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                placeholder="Địa chỉ"
                value={supplier.address}
                onChange={(event) => setSupplier({ ...supplier, address: event.target.value })}
              />
              <button className={buttonClass} disabled={addSupplier.isPending} type="submit">
                {addSupplier.isPending ? "Đang lưu..." : "Lưu nhà cung cấp"}
              </button>
            </form>
          </Panel>

          <Panel title="Thêm lô nhập">
            <form onSubmit={submitBatch} className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Mã lô"
                value={batch.code}
                onChange={(event) => setBatch({ ...batch, code: event.target.value })}
              />
              <select
                className={inputClass}
                value={batch.medicineId}
                onChange={(event) => setBatch({ ...batch, medicineId: event.target.value })}
              >
                <option value="">Chọn thuốc</option>
                {medicines.data?.map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {medicine.code} · {medicine.name}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={batch.supplierId}
                onChange={(event) => setBatch({ ...batch, supplierId: event.target.value })}
              >
                <option value="">Chọn nhà cung cấp</option>
                {suppliers.data?.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                className={inputClass}
                type="number"
                min="1"
                placeholder="Số lượng"
                value={batch.quantity}
                onChange={(event) => setBatch({ ...batch, quantity: event.target.value })}
              />
              <label className="text-xs text-slate-400">
                Ngày nhập
                <input
                  className={`${inputClass} mt-1`}
                  type="date"
                  value={batch.receivedDate}
                  onChange={(event) => setBatch({ ...batch, receivedDate: event.target.value })}
                />
              </label>
              <label className="text-xs text-slate-400">
                Hạn sử dụng
                <input
                  className={`${inputClass} mt-1`}
                  type="date"
                  value={batch.expiryDate}
                  onChange={(event) => setBatch({ ...batch, expiryDate: event.target.value })}
                />
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="Giá nhập (đ)"
                value={batch.purchasePrice}
                onChange={(event) => setBatch({ ...batch, purchasePrice: event.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="Giá bán (đ)"
                value={batch.sellingPrice}
                onChange={(event) => setBatch({ ...batch, sellingPrice: event.target.value })}
              />
              <button className={buttonClass} disabled={addBatch.isPending} type="submit">
                {addBatch.isPending ? "Đang lưu..." : "Lưu lô nhập"}
              </button>
            </form>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title={`Nhà cung cấp (${suppliers.data?.length ?? 0})`}>
            <div className="space-y-2">
              {suppliers.data?.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/25 p-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.phone || "Chưa có SĐT"} · {item.address || "Chưa có địa chỉ"}
                  </p>
                </div>
              ))}
              {!suppliers.isPending && !suppliers.data?.length && (
                <p className="text-sm text-slate-500">Chưa có nhà cung cấp.</p>
              )}
            </div>
          </Panel>
          <Panel title={`Danh sách lô nhập (${batches.data?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Mã lô</th>
                    <th className="px-3 py-2">Thuốc</th>
                    <th className="px-3 py-2">NCC</th>
                    <th className="px-3 py-2">Còn lại</th>
                    <th className="px-3 py-2">HSD</th>
                    <th className="px-3 py-2">Giá nhập</th>
                    <th className="px-3 py-2">Giá bán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {batches.data?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-mono text-xs text-sky-300">{item.code}</td>
                      <td className="px-3 py-3">{item.medicine_name}</td>
                      <td className="px-3 py-3 text-slate-300">{item.supplier_name}</td>
                      <td className="px-3 py-3">{item.quantity_remaining}/{item.quantity_received}</td>
                      <td className="px-3 py-3">{item.expiry_date}</td>
                      <td className="px-3 py-3">{formatVnd(Number(item.purchase_price))}</td>
                      <td className="px-3 py-3 font-semibold text-emerald-300">{formatVnd(Number(item.selling_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerSalesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? "";
  const [feedback, setFeedback] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const batches = useQuery({
    queryKey: ["manager-batches"],
    queryFn: () => batchesRequest(token),
    enabled: Boolean(token),
  });
  const invoices = useQuery({
    queryKey: ["manager-invoices"],
    queryFn: () => invoicesRequest(token),
    enabled: Boolean(token),
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      createInvoiceRequest(token, {
        code: code.trim(),
        items: [{ batch_id: Number(batchId), quantity: Number(quantity) }],
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-invoices"] });
      setCode("");
      setFeedback("Đã tạo hóa đơn nháp. Tồn kho chưa bị trừ cho tới khi chốt hóa đơn.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const finalize = useMutation({
    mutationFn: (invoiceId: number) => finalizeInvoiceRequest(token, invoiceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["manager-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-inventory"] }),
      ]);
      setFeedback("Đã chốt hóa đơn và trừ tồn của lô được chọn.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const cancel = useMutation({
    mutationFn: (invoiceId: number) => cancelInvoiceRequest(token, invoiceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-invoices"] });
      setFeedback("Đã hủy hóa đơn nháp.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || !batchId || Number(quantity) <= 0) {
      return setFeedback("Hãy nhập mã hóa đơn, chọn lô và số lượng hợp lệ.");
    }
    createInvoice.mutate();
  }

  const availableBatches = batches.data?.filter((item) => item.quantity_remaining > 0) ?? [];

  return (
    <Guard>
      <ManagerShell title="Bán thuốc & hóa đơn" status="API bán thuốc và hóa đơn đã kết nối">
        <Feedback text={feedback} />
        <Panel title="Tạo hóa đơn nháp">
          <div className="mb-4 rounded-xl border border-amber-600/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            Chọn lô thủ công cho từng dòng bán. Hệ thống chưa tự áp dụng FIFO/FEFO khi quy tắc chọn lô chưa được chốt.
          </div>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
            <input
              className={inputClass}
              placeholder="Mã hóa đơn"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <select className={inputClass} value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              <option value="">Chọn lô thuốc</option>
              {availableBatches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.medicine_name} · còn {item.quantity_remaining} · {formatVnd(Number(item.selling_price))}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              type="number"
              min="1"
              placeholder="Số lượng"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <button className={buttonClass} disabled={createInvoice.isPending} type="submit">Tạo hóa đơn nháp</button>
          </form>
        </Panel>

        <div className="mt-5">
          <Panel title={`Hóa đơn (${invoices.data?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Mã</th>
                    <th className="px-3 py-2">Trạng thái</th>
                    <th className="px-3 py-2">Chi tiết</th>
                    <th className="px-3 py-2">Tổng tiền</th>
                    <th className="px-3 py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.data?.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-3 font-mono text-sky-300">{invoice.code}</td>
                      <td className="px-3 py-3">{invoice.status}</td>
                      <td className="px-3 py-3 text-slate-300">
                        {invoice.items.map((item) => `${item.medicine_name} (${item.batch_code}) × ${item.quantity}`).join(", ")}
                      </td>
                      <td className="px-3 py-3 font-bold text-emerald-300">{formatVnd(Number(invoice.total_amount))}</td>
                      <td className="px-3 py-3">
                        {invoice.status === "DRAFT" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950"
                              onClick={() => finalize.mutate(invoice.id)}
                            >
                              Chốt hóa đơn
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-300"
                              onClick={() => cancel.mutate(invoice.id)}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerInventoryPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [thresholdInput, setThresholdInput] = useState("");
  const [threshold, setThreshold] = useState<number | undefined>(undefined);

  const inventory = useQuery({
    queryKey: ["manager-inventory", threshold],
    queryFn: () => inventoryRequest(token, threshold),
    enabled: Boolean(token),
  });

  return (
    <Guard>
      <ManagerShell title="Tồn kho" status="API tồn kho đã kết nối">
        <Panel title="Lọc tồn kho">
          <form
            className="flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setThreshold(thresholdInput === "" ? undefined : Number(thresholdInput));
            }}
          >
            <input
              className={inputClass}
              type="number"
              min="0"
              placeholder="Ngưỡng tồn thấp, ví dụ 20"
              value={thresholdInput}
              onChange={(event) => setThresholdInput(event.target.value)}
            />
            <button className={buttonClass} type="submit">Áp dụng</button>
            <button
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm"
              type="button"
              onClick={() => {
                setThresholdInput("");
                setThreshold(undefined);
              }}
            >
              Tất cả
            </button>
          </form>
        </Panel>
        <div className="mt-5">
          <Panel title={`Tồn theo lô (${inventory.data?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Thuốc</th>
                    <th className="px-3 py-2">Lô</th>
                    <th className="px-3 py-2">Tồn</th>
                    <th className="px-3 py-2">HSD</th>
                    <th className="px-3 py-2">Giá bán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {inventory.data?.map((row) => (
                    <tr key={row.batch_id}>
                      <td className="px-3 py-3">{row.medicine_code} · {row.medicine_name}</td>
                      <td className="px-3 py-3 font-mono text-sky-300">{row.batch_code}</td>
                      <td className="px-3 py-3 text-xl font-black">{row.quantity_remaining}</td>
                      <td className="px-3 py-3">{row.expiry_date}</td>
                      <td className="px-3 py-3">{formatVnd(Number(row.selling_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerExpiryPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [daysInput, setDaysInput] = useState("90");
  const [days, setDays] = useState(90);

  const expiring = useQuery({
    queryKey: ["manager-expiring", days],
    queryFn: () => expiringBatchesRequest(token, days),
    enabled: Boolean(token),
  });
  const expired = useQuery({
    queryKey: ["manager-expired"],
    queryFn: () => expiredBatchesRequest(token),
    enabled: Boolean(token),
  });

  return (
    <Guard>
      <ManagerShell title="Hạn sử dụng & cảnh báo" status="API hạn sử dụng và cảnh báo đã kết nối">
        <Panel title="Khoảng cảnh báo">
          <form
            className="flex max-w-lg gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setDays(Math.max(0, Number(daysInput) || 0));
            }}
          >
            <input
              className={inputClass}
              type="number"
              min="0"
              max="3650"
              value={daysInput}
              onChange={(event) => setDaysInput(event.target.value)}
            />
            <button className={buttonClass} type="submit">Xem cảnh báo</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Ngưỡng {days} ngày do Quản lý lựa chọn, không bị hệ thống tự đặt cố định.</p>
        </Panel>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <ExpiryTable title={`Sắp hết hạn trong ${days} ngày`} rows={expiring.data ?? []} />
          <ExpiryTable title="Đã hết hạn" rows={expired.data ?? []} />
        </div>
      </ManagerShell>
    </Guard>
  );
}

function ExpiryTable({ title, rows }: { title: string; rows: Awaited<ReturnType<typeof expiredBatchesRequest>> }) {
  return (
    <Panel title={`${title} (${rows.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Thuốc</th>
              <th className="px-3 py-2">Lô</th>
              <th className="px-3 py-2">HSD</th>
              <th className="px-3 py-2">Còn lại</th>
              <th className="px-3 py-2">SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr key={row.batch_id}>
                <td className="px-3 py-3">{row.medicine_name}</td>
                <td className="px-3 py-3 font-mono text-sky-300">{row.batch_code}</td>
                <td className="px-3 py-3">{row.expiry_date}</td>
                <td className={`px-3 py-3 font-bold ${row.days_remaining < 0 ? "text-red-400" : "text-amber-300"}`}>
                  {row.days_remaining} ngày
                </td>
                <td className="px-3 py-3">{row.quantity_remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ManagerReportsPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [daysInput, setDaysInput] = useState("90");
  const [days, setDays] = useState(90);
  const report = useQuery({
    queryKey: ["manager-report-summary", days],
    queryFn: () => reportSummaryRequest(token, days),
    enabled: Boolean(token),
  });

  return (
    <Guard>
      <ManagerShell title="Báo cáo - Thống kê" status="API báo cáo đã kết nối">
        <Panel title="Thiết lập báo cáo">
          <form
            className="flex max-w-lg gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setDays(Math.max(0, Number(daysInput) || 0));
            }}
          >
            <input
              className={inputClass}
              type="number"
              min="0"
              value={daysInput}
              onChange={(event) => setDaysInput(event.target.value)}
              placeholder="Số ngày cảnh báo HSD"
            />
            <button className={buttonClass} type="submit">Tạo báo cáo</button>
          </form>
        </Panel>
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <ReportMetric label="Doanh thu hóa đơn đã chốt" value={formatVnd(Number(report.data?.revenue ?? 0))} />
          <ReportMetric label="Hóa đơn đã chốt" value={report.data?.finalized_invoice_count ?? 0} />
          <ReportMetric label="Tổng tồn" value={report.data?.inventory_units ?? 0} />
          <ReportMetric label="Lô đã hết hạn" value={report.data?.expired_lots ?? 0} />
          <ReportMetric label={`Lô hết hạn ≤ ${days} ngày`} value={report.data?.expiring_lots ?? 0} />
        </section>
      </ManagerShell>
    </Guard>
  );
}

function ReportMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black text-slate-50">{value}</p>
      <p className="mt-2 text-[11px] text-emerald-400">Dữ liệu PostgreSQL</p>
    </div>
  );
}

export function ManagerLookupPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const medicines = useQuery({
    queryKey: ["manager-advanced-lookup", query],
    queryFn: () => advancedMedicineLookupRequest(token, query),
    enabled: Boolean(token),
  });

  return (
    <Guard>
      <ManagerShell title="Tra cứu thuốc" status="Danh mục thuốc đã có dữ liệu · Tra cứu nâng cao đã kết nối">
        <Panel title="Tra cứu nâng cao">
          <form
            className="flex max-w-2xl gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(input.trim());
            }}
          >
            <input
              className={inputClass}
              placeholder="Tên thuốc hoặc mã thuốc"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className={buttonClass} type="submit">Tra cứu</button>
          </form>
        </Panel>
        <div className="mt-5">
          <Panel title={`Kết quả (${medicines.data?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Mã</th>
                    <th className="px-3 py-2">Tên thuốc</th>
                    <th className="px-3 py-2">Nhóm</th>
                    <th className="px-3 py-2">ĐVT</th>
                    <th className="px-3 py-2">Tồn</th>
                    <th className="px-3 py-2">Giá bán</th>
                    <th className="px-3 py-2">HSD gần nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {medicines.data?.map((medicine) => (
                    <tr key={medicine.medicine_id}>
                      <td className="px-3 py-3 font-mono text-sky-300">{medicine.code}</td>
                      <td className="px-3 py-3 font-semibold">{medicine.name}</td>
                      <td className="px-3 py-3">{medicine.group_name}</td>
                      <td className="px-3 py-3">{medicine.unit_name}</td>
                      <td className="px-3 py-3 text-lg font-bold">{medicine.available_quantity}</td>
                      <td className="px-3 py-3">
                        {medicine.min_selling_price === null
                          ? "—"
                          : medicine.min_selling_price === medicine.max_selling_price
                            ? formatVnd(Number(medicine.min_selling_price))
                            : `${formatVnd(Number(medicine.min_selling_price))} - ${formatVnd(Number(medicine.max_selling_price))}`}
                      </td>
                      <td className="px-3 py-3">{medicine.nearest_expiry ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerUsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? "";
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "PHARMACIST" });

  const accounts = useQuery({
    queryKey: ["manager-accounts"],
    queryFn: () => accountsRequest(token),
    enabled: Boolean(token),
  });

  const createAccount = useMutation({
    mutationFn: () => createAccountRequest(token, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-accounts"] });
      setForm({ username: "", password: "", role: "PHARMACIST" });
      setFeedback("Đã tạo tài khoản.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      changeAccountRoleRequest(token, userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-accounts"] });
      setFeedback("Đã cập nhật vai trò.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const changeActive = useMutation({
    mutationFn: ({ userId, active }: { userId: number; active: boolean }) =>
      changeAccountActiveRequest(token, userId, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-accounts"] });
      setFeedback("Đã cập nhật trạng thái tài khoản.");
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  async function resetPassword(userId: number) {
    const password = window.prompt("Nhập mật khẩu mới (ít nhất 8 ký tự):");
    if (!password) return;
    if (password.length < 8) return setFeedback("Mật khẩu phải có ít nhất 8 ký tự.");
    try {
      await resetAccountPasswordRequest(token, userId, password);
      setFeedback("Đã đặt lại mật khẩu và thu hồi refresh token cũ.");
    } catch (error) {
      setFeedback(errorText(error));
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.username.trim().length < 3 || form.password.length < 8) {
      return setFeedback("Tên đăng nhập cần ít nhất 3 ký tự và mật khẩu ít nhất 8 ký tự.");
    }
    createAccount.mutate();
  }

  return (
    <Guard>
      <ManagerShell title="Tài khoản / Phân quyền" status="API quản trị tài khoản đã kết nối">
        <Feedback text={feedback} />
        <Panel title="Tạo tài khoản">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
            <input
              className={inputClass}
              placeholder="Tên đăng nhập"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
            <input
              className={inputClass}
              type="password"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="MANAGER">Quản lý</option>
              <option value="PHARMACIST">Dược sĩ</option>
              <option value="CUSTOMER">Khách hàng</option>
            </select>
            <button className={buttonClass} disabled={createAccount.isPending} type="submit">Tạo tài khoản</button>
          </form>
        </Panel>
        <div className="mt-5">
          <Panel title={`Danh sách tài khoản (${accounts.data?.length ?? 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Tài khoản</th>
                    <th className="px-3 py-2">Vai trò</th>
                    <th className="px-3 py-2">Trạng thái</th>
                    <th className="px-3 py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {accounts.data?.map((account) => (
                    <tr key={account.id}>
                      <td className="px-3 py-3 font-semibold">{account.username}</td>
                      <td className="px-3 py-3">
                        <select
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
                          value={account.role}
                          onChange={(event) => changeRole.mutate({ userId: account.id, role: event.target.value })}
                        >
                          <option value="MANAGER">MANAGER</option>
                          <option value="PHARMACIST">PHARMACIST</option>
                          <option value="CUSTOMER">CUSTOMER</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <span className={account.is_active ? "text-emerald-300" : "text-red-400"}>
                          {account.is_active ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs"
                            onClick={() => changeActive.mutate({ userId: account.id, active: !account.is_active })}
                          >
                            {account.is_active ? "Khóa" : "Mở khóa"}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-sky-700 px-3 py-1.5 text-xs text-sky-300"
                            onClick={() => void resetPassword(account.id)}
                          >
                            Đặt lại mật khẩu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerAiPage() {
  return (
    <Guard>
      <ManagerShell title="Trợ lý AI" status="AI chưa được cấu hình">
        <Panel title="Trạng thái AI">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 p-6">
            <p className="text-xl font-bold text-amber-200">AI chưa được cấu hình</p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Các chức năng tóm tắt thông tin thuốc, báo cáo thuốc sắp hết hạn và chatbot quy trình nội bộ sẽ được kích hoạt sau khi cấu hình AI provider và kiểm thử Scope Guard.
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              "AI tóm tắt thông tin thuốc",
              "AI báo cáo thuốc sắp hết hạn",
              "Chatbot quy trình nội bộ",
            ].map((label) => (
              <button key={label} disabled className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-4 text-left text-sm text-slate-500">
                {label}
              </button>
            ))}
          </div>
        </Panel>
        <Link to="/dashboard" className="mt-5 inline-block text-sm font-semibold text-sky-300 hover:underline">← Về Dashboard</Link>
      </ManagerShell>
    </Guard>
  );
}

export function selectedBatchLabel(batch: MedicineBatch): string {
  return `${batch.code} · ${batch.medicine_name}`;
}
