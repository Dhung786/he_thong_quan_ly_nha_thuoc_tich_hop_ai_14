import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { ApiError, medicinesRequest } from "../lib/api";
import { formatVnd } from "../lib/demo-data";
import {
  advancedMedicineLookupRequest,
  batchesRequest,
  cancelInvoiceRequest,
  createBatchRequest,
  createInvoiceRequest,
  createSupplierRequest,
  expiredBatchesRequest,
  expiringBatchesRequest,
  finalizeInvoiceRequest,
  inventoryRequest,
  invoicesRequest,
  reportSummaryRequest,
  suppliersRequest,
  type ExpiryRow,
} from "../lib/manager-api";
import {
  boundedInteger,
  dateIsPast,
  nonBlank,
  validateBatchForm,
  validateInvoiceForm,
} from "../lib/manager-validation";

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

function Feedback({ text, tone = "info" }: { text: string | null; tone?: "info" | "error" | "success" }) {
  if (!text) return null;
  const classes =
    tone === "error"
      ? "border-red-700/50 bg-red-950/30 text-red-200"
      : tone === "success"
        ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-200"
        : "border-sky-700/40 bg-sky-950/30 text-sky-200";
  return <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${classes}`}>{text}</div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#18253a] p-5 shadow-xl shadow-slate-950/10 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-4 py-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/35 px-3 py-2.5 text-sm outline-none focus:border-sky-500";
const buttonClass =
  "rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40";

export function ManagerValidatedImportsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? "";
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error" | "success">("info");
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
    mutationFn: () =>
      createSupplierRequest(token, {
        name: supplier.name.trim(),
        phone: supplier.phone.trim() || undefined,
        address: supplier.address.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-suppliers"] });
      setSupplier({ name: "", phone: "", address: "" });
      setFeedbackTone("success");
      setFeedback("Đã lưu nhà cung cấp. Bạn có thể chọn nhà cung cấp này khi tạo lô nhập.");
    },
    onError: (error) => {
      setFeedbackTone("error");
      setFeedback(errorText(error));
    },
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["manager-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-advanced-lookup"] }),
      ]);
      setBatch({
        code: "",
        medicineId: "",
        supplierId: "",
        quantity: "",
        receivedDate: new Date().toISOString().slice(0, 10),
        expiryDate: "",
        purchasePrice: "",
        sellingPrice: "",
      });
      setFeedbackTone("success");
      setFeedback("Đã lưu lô nhập. Tồn kho và giá bán đã được cập nhật từ dữ liệu thật.");
    },
    onError: (error) => {
      setFeedbackTone("error");
      setFeedback(errorText(error));
    },
  });

  function submitSupplier(event: FormEvent) {
    event.preventDefault();
    if (!nonBlank(supplier.name)) {
      setFeedbackTone("error");
      setFeedback("Không thể lưu: hãy nhập tên nhà cung cấp.");
      return;
    }
    addSupplier.mutate();
  }

  function submitBatch(event: FormEvent) {
    event.preventDefault();
    if (!medicines.data?.length) {
      setFeedbackTone("error");
      setFeedback("Chưa có thuốc trong danh mục. Hãy tạo thuốc trước khi nhập lô.");
      return;
    }
    if (!suppliers.data?.length) {
      setFeedbackTone("error");
      setFeedback("Chưa có nhà cung cấp. Hãy tạo nhà cung cấp trước khi nhập lô.");
      return;
    }
    const validation = validateBatchForm(batch);
    if (validation) {
      setFeedbackTone("error");
      setFeedback(`Không thể lưu: ${validation}`);
      return;
    }
    addBatch.mutate();
  }

  const batchValidation = validateBatchForm(batch);
  const canSaveBatch =
    !batchValidation && Boolean(medicines.data?.length) && Boolean(suppliers.data?.length);

  const queryError = suppliers.error ?? batches.error ?? medicines.error;

  return (
    <Guard>
      <ManagerShell title="Quản lý nhập thuốc" status="API lô nhập và nhà cung cấp đã kết nối">
        {queryError && <Feedback text={errorText(queryError)} tone="error" />}
        <Feedback text={feedback} tone={feedbackTone} />
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Thêm nhà cung cấp">
            <form onSubmit={submitSupplier} className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Tên nhà cung cấp *"
                value={supplier.name}
                onChange={(event) => setSupplier({ ...supplier, name: event.target.value })}
                required
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
              <button
                className={buttonClass}
                disabled={addSupplier.isPending || !nonBlank(supplier.name)}
                type="submit"
              >
                {addSupplier.isPending ? "Đang lưu..." : "Lưu nhà cung cấp"}
              </button>
            </form>
          </Panel>

          <Panel title="Thêm lô nhập">
            {!medicines.isPending && !medicines.data?.length && (
              <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-sm text-amber-200">
                Chưa có thuốc trong danh mục nên chưa thể lưu lô nhập.
              </div>
            )}
            {!suppliers.isPending && !suppliers.data?.length && (
              <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-sm text-amber-200">
                Chưa có nhà cung cấp nên chưa thể lưu lô nhập.
              </div>
            )}
            <form onSubmit={submitBatch} className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Mã lô *"
                value={batch.code}
                onChange={(event) => setBatch({ ...batch, code: event.target.value })}
                required
              />
              <select
                className={inputClass}
                value={batch.medicineId}
                onChange={(event) => setBatch({ ...batch, medicineId: event.target.value })}
                required
              >
                <option value="">Chọn thuốc *</option>
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
                required
              >
                <option value="">Chọn nhà cung cấp *</option>
                {suppliers.data?.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                placeholder="Số lượng *"
                value={batch.quantity}
                onChange={(event) => setBatch({ ...batch, quantity: event.target.value })}
                required
              />
              <label className="text-xs text-slate-400">
                Ngày nhập *
                <input
                  className={`${inputClass} mt-1`}
                  type="date"
                  value={batch.receivedDate}
                  onChange={(event) => setBatch({ ...batch, receivedDate: event.target.value })}
                  required
                />
              </label>
              <label className="text-xs text-slate-400">
                Hạn sử dụng *
                <input
                  className={`${inputClass} mt-1`}
                  type="date"
                  min={batch.receivedDate || undefined}
                  value={batch.expiryDate}
                  onChange={(event) => setBatch({ ...batch, expiryDate: event.target.value })}
                  required
                />
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                placeholder="Giá nhập (đ) *"
                value={batch.purchasePrice}
                onChange={(event) => setBatch({ ...batch, purchasePrice: event.target.value })}
                required
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                placeholder="Giá bán (đ) *"
                value={batch.sellingPrice}
                onChange={(event) => setBatch({ ...batch, sellingPrice: event.target.value })}
                required
              />
              <button
                className={`${buttonClass} sm:col-span-2`}
                disabled={addBatch.isPending || !canSaveBatch}
                type="submit"
              >
                {addBatch.isPending ? "Đang lưu..." : "Lưu lô nhập"}
              </button>
              {batchValidation && (
                <p className="sm:col-span-2 text-xs text-amber-300">{batchValidation}</p>
              )}
            </form>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title={`Nhà cung cấp (${suppliers.data?.length ?? 0})`}>
            {suppliers.isPending ? (
              <p className="text-sm text-slate-400">Đang tải...</p>
            ) : suppliers.data?.length ? (
              <div className="space-y-2">
                {suppliers.data.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/25 p-3">
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.phone || "Chưa có SĐT"} · {item.address || "Chưa có địa chỉ"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>Chưa có nhà cung cấp. Hãy nhập thông tin ở biểu mẫu phía trên.</EmptyState>
            )}
          </Panel>

          <Panel title={`Danh sách lô nhập (${batches.data?.length ?? 0})`}>
            {batches.isPending ? (
              <p className="text-sm text-slate-400">Đang tải...</p>
            ) : batches.data?.length ? (
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
                    {batches.data.map((item) => (
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
            ) : (
              <EmptyState>Chưa có lô nhập. Sau khi lưu lô, dữ liệu sẽ xuất hiện tại đây.</EmptyState>
            )}
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerValidatedSalesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const token = auth.accessToken ?? "";
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error" | "success">("info");
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

  const availableBatches =
    batches.data?.filter((item) => item.quantity_remaining > 0 && !dateIsPast(item.expiry_date)) ?? [];
  const selectedBatch = availableBatches.find((item) => item.id === Number(batchId));
  const invoiceValidation = validateInvoiceForm({
    code,
    batchId,
    quantity,
    remaining: selectedBatch?.quantity_remaining,
    expiryDate: selectedBatch?.expiry_date,
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
      setBatchId("");
      setQuantity("1");
      setFeedbackTone("success");
      setFeedback("Đã tạo hóa đơn nháp. Tồn kho chỉ thay đổi sau khi bạn xác nhận chốt hóa đơn.");
    },
    onError: (error) => {
      setFeedbackTone("error");
      setFeedback(errorText(error));
    },
  });

  const finalize = useMutation({
    mutationFn: (invoiceId: number) => finalizeInvoiceRequest(token, invoiceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["manager-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-inventory"] }),
      ]);
      setFeedbackTone("success");
      setFeedback("Đã chốt hóa đơn và trừ tồn của đúng lô đã chọn.");
    },
    onError: (error) => {
      setFeedbackTone("error");
      setFeedback(errorText(error));
    },
  });

  const cancel = useMutation({
    mutationFn: (invoiceId: number) => cancelInvoiceRequest(token, invoiceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manager-invoices"] });
      setFeedbackTone("success");
      setFeedback("Đã hủy hóa đơn nháp. Tồn kho không thay đổi.");
    },
    onError: (error) => {
      setFeedbackTone("error");
      setFeedback(errorText(error));
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!availableBatches.length) {
      setFeedbackTone("error");
      setFeedback("Không thể tạo hóa đơn: chưa có lô thuốc còn hạn và còn tồn.");
      return;
    }
    if (invoiceValidation) {
      setFeedbackTone("error");
      setFeedback(`Không thể tạo hóa đơn: ${invoiceValidation}`);
      return;
    }
    createInvoice.mutate();
  }

  function confirmFinalize(invoiceId: number) {
    if (!window.confirm("Chốt hóa đơn sẽ trừ tồn kho của lô đã chọn. Bạn chắc chắn muốn tiếp tục?")) return;
    finalize.mutate(invoiceId);
  }

  function confirmCancel(invoiceId: number) {
    if (!window.confirm("Bạn chắc chắn muốn hủy hóa đơn nháp này?")) return;
    cancel.mutate(invoiceId);
  }

  const queryError = batches.error ?? invoices.error;

  return (
    <Guard>
      <ManagerShell title="Bán thuốc & hóa đơn" status="API bán thuốc và hóa đơn đã kết nối">
        {queryError && <Feedback text={errorText(queryError)} tone="error" />}
        <Feedback text={feedback} tone={feedbackTone} />
        <Panel title="Tạo hóa đơn nháp">
          {!batches.isPending && !availableBatches.length && (
            <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-sm text-amber-200">
              Chưa có lô thuốc còn hạn và còn tồn. Hãy nhập lô thuốc trước khi bán.
            </div>
          )}
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
            <input
              className={inputClass}
              placeholder="Mã hóa đơn *"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <select
              className={inputClass}
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              required
            >
              <option value="">Chọn lô thuốc còn hạn *</option>
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
              max={selectedBatch?.quantity_remaining}
              step="1"
              placeholder="Số lượng *"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
            <button
              className={buttonClass}
              disabled={createInvoice.isPending || Boolean(invoiceValidation) || !availableBatches.length}
              type="submit"
            >
              {createInvoice.isPending ? "Đang tạo..." : "Tạo hóa đơn nháp"}
            </button>
          </form>
          {selectedBatch && (
            <p className="mt-3 text-xs text-slate-400">
              Lô {selectedBatch.code}: còn {selectedBatch.quantity_remaining}, HSD {selectedBatch.expiry_date}, giá {formatVnd(Number(selectedBatch.selling_price))}.
            </p>
          )}
          {invoiceValidation && <p className="mt-2 text-xs text-amber-300">{invoiceValidation}</p>}
        </Panel>

        <div className="mt-5">
          <Panel title={`Hóa đơn (${invoices.data?.length ?? 0})`}>
            {invoices.isPending ? (
              <p className="text-sm text-slate-400">Đang tải...</p>
            ) : invoices.data?.length ? (
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
                    {invoices.data.map((invoice) => (
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
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-40"
                                disabled={finalize.isPending || cancel.isPending}
                                onClick={() => confirmFinalize(invoice.id)}
                              >
                                Chốt hóa đơn
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-300 disabled:opacity-40"
                                disabled={finalize.isPending || cancel.isPending}
                                onClick={() => confirmCancel(invoice.id)}
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
            ) : (
              <EmptyState>Chưa có hóa đơn. Hãy chọn lô thuốc và tạo hóa đơn nháp.</EmptyState>
            )}
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

export function ManagerValidatedInventoryPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [thresholdInput, setThresholdInput] = useState("");
  const [threshold, setThreshold] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState<string | null>(null);

  const inventory = useQuery({
    queryKey: ["manager-inventory", threshold],
    queryFn: () => inventoryRequest(token, threshold),
    enabled: Boolean(token),
  });

  function applyThreshold(event: FormEvent) {
    event.preventDefault();
    const parsed = boundedInteger(thresholdInput, 0, 1_000_000_000);
    if (parsed === null) {
      setFeedback("Hãy nhập ngưỡng tồn là số nguyên từ 0 trở lên, hoặc bấm “Tất cả”.");
      return;
    }
    setFeedback(null);
    setThreshold(parsed);
  }

  return (
    <Guard>
      <ManagerShell title="Tồn kho" status="API tồn kho đã kết nối">
        {inventory.error && <Feedback text={errorText(inventory.error)} tone="error" />}
        <Feedback text={feedback} tone="error" />
        <Panel title="Lọc tồn kho">
          <form className="flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={applyThreshold}>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
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
                setFeedback(null);
              }}
            >
              Tất cả
            </button>
          </form>
        </Panel>
        <div className="mt-5">
          <Panel title={`Tồn theo lô (${inventory.data?.length ?? 0})`}>
            {inventory.isPending ? (
              <p className="text-sm text-slate-400">Đang tải...</p>
            ) : inventory.data?.length ? (
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
                    {inventory.data.map((row) => (
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
            ) : (
              <EmptyState>
                {threshold === undefined
                  ? "Chưa có tồn kho. Hãy nhập lô thuốc trước."
                  : `Không có lô nào có tồn nhỏ hơn hoặc bằng ${threshold}.`}
              </EmptyState>
            )}
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}

function ExpiryTable({ title, rows }: { title: string; rows: ExpiryRow[] }) {
  return (
    <Panel title={`${title} (${rows.length})`}>
      {rows.length ? (
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
      ) : (
        <EmptyState>Không có dữ liệu phù hợp với điều kiện này.</EmptyState>
      )}
    </Panel>
  );
}

export function ManagerValidatedExpiryPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [daysInput, setDaysInput] = useState("90");
  const [days, setDays] = useState(90);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  function applyDays(event: FormEvent) {
    event.preventDefault();
    const parsed = boundedInteger(daysInput, 0, 3650);
    if (parsed === null) {
      setFeedback("Khoảng cảnh báo phải là số nguyên từ 0 đến 3650 ngày.");
      return;
    }
    setFeedback(null);
    setDays(parsed);
  }

  const queryError = expiring.error ?? expired.error;

  return (
    <Guard>
      <ManagerShell title="Hạn sử dụng & cảnh báo" status="API hạn sử dụng và cảnh báo đã kết nối">
        {queryError && <Feedback text={errorText(queryError)} tone="error" />}
        <Feedback text={feedback} tone="error" />
        <Panel title="Khoảng cảnh báo">
          <form className="flex max-w-lg gap-3" onSubmit={applyDays}>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="3650"
              step="1"
              value={daysInput}
              onChange={(event) => setDaysInput(event.target.value)}
              required
            />
            <button className={buttonClass} type="submit">Xem cảnh báo</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Đang xem các lô sẽ hết hạn trong tối đa {days} ngày.</p>
        </Panel>

        {expiring.isPending || expired.isPending ? (
          <p className="mt-5 text-sm text-slate-400">Đang tải cảnh báo...</p>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ExpiryTable title={`Sắp hết hạn trong ${days} ngày`} rows={expiring.data ?? []} />
            <ExpiryTable title="Đã hết hạn" rows={expired.data ?? []} />
          </div>
        )}
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

export function ManagerValidatedReportsPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [daysInput, setDaysInput] = useState("90");
  const [days, setDays] = useState(90);
  const [feedback, setFeedback] = useState<string | null>(null);

  const report = useQuery({
    queryKey: ["manager-report-summary", days],
    queryFn: () => reportSummaryRequest(token, days),
    enabled: Boolean(token),
  });

  function generateReport(event: FormEvent) {
    event.preventDefault();
    const parsed = boundedInteger(daysInput, 0, 3650);
    if (parsed === null) {
      setFeedback("Không thể tạo báo cáo: số ngày cảnh báo phải từ 0 đến 3650.");
      return;
    }
    setFeedback(null);
    if (parsed === days) {
      void report.refetch();
    } else {
      setDays(parsed);
    }
  }

  return (
    <Guard>
      <ManagerShell title="Báo cáo - Thống kê" status="API báo cáo đã kết nối">
        {report.error && <Feedback text={errorText(report.error)} tone="error" />}
        <Feedback text={feedback} tone="error" />
        <Panel title="Thiết lập báo cáo">
          <form className="flex max-w-lg gap-3" onSubmit={generateReport}>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="3650"
              step="1"
              value={daysInput}
              onChange={(event) => setDaysInput(event.target.value)}
              placeholder="Số ngày cảnh báo HSD"
              required
            />
            <button className={buttonClass} type="submit" disabled={report.isFetching}>
              {report.isFetching ? "Đang tạo..." : "Tạo báo cáo"}
            </button>
          </form>
        </Panel>
        {report.isPending ? (
          <p className="mt-5 text-sm text-slate-400">Đang tải báo cáo...</p>
        ) : report.data ? (
          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ReportMetric label="Doanh thu hóa đơn đã chốt" value={formatVnd(Number(report.data.revenue))} />
            <ReportMetric label="Hóa đơn đã chốt" value={report.data.finalized_invoice_count} />
            <ReportMetric label="Tổng tồn" value={report.data.inventory_units} />
            <ReportMetric label="Lô đã hết hạn" value={report.data.expired_lots} />
            <ReportMetric label={`Lô hết hạn ≤ ${days} ngày`} value={report.data.expiring_lots ?? 0} />
          </section>
        ) : (
          <div className="mt-5"><EmptyState>Chưa có dữ liệu báo cáo.</EmptyState></div>
        )}
      </ManagerShell>
    </Guard>
  );
}

export function ManagerValidatedLookupPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const medicines = useQuery({
    queryKey: ["manager-advanced-lookup", query],
    queryFn: () => advancedMedicineLookupRequest(token, query),
    enabled: Boolean(token) && nonBlank(query),
  });

  function submitLookup(event: FormEvent) {
    event.preventDefault();
    const term = input.trim();
    if (!term) {
      setFeedback("Hãy nhập tên thuốc hoặc mã thuốc trước khi tra cứu.");
      return;
    }
    setFeedback(null);
    if (term === query) {
      void medicines.refetch();
    } else {
      setQuery(term);
    }
  }

  function clearLookup() {
    setInput("");
    setQuery("");
    setFeedback(null);
  }

  return (
    <Guard>
      <ManagerShell title="Tra cứu thuốc" status="Danh mục thuốc đã có dữ liệu · Tra cứu nâng cao đã kết nối">
        {medicines.error && <Feedback text={errorText(medicines.error)} tone="error" />}
        <Feedback text={feedback} tone="error" />
        <Panel title="Tra cứu nâng cao">
          <form className="flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={submitLookup}>
            <input
              className={inputClass}
              placeholder="Tên thuốc hoặc mã thuốc *"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className={buttonClass} type="submit" disabled={!nonBlank(input) || medicines.isFetching}>
              {medicines.isFetching ? "Đang tìm..." : "Tra cứu"}
            </button>
            <button
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm"
              type="button"
              onClick={clearLookup}
            >
              Xóa
            </button>
          </form>
        </Panel>
        <div className="mt-5">
          <Panel title={`Kết quả (${query ? medicines.data?.length ?? 0 : 0})`}>
            {!query ? (
              <EmptyState>Nhập tên hoặc mã thuốc rồi bấm Tra cứu để xem kết quả.</EmptyState>
            ) : medicines.isPending || medicines.isFetching ? (
              <p className="text-sm text-slate-400">Đang tra cứu...</p>
            ) : medicines.data?.length ? (
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
                    {medicines.data.map((medicine) => (
                      <tr key={medicine.medicine_id}>
                        <td className="px-3 py-3 font-mono text-sky-300">{medicine.code}</td>
                        <td className="px-3 py-3 font-semibold">{medicine.name}</td>
                        <td className="px-3 py-3">{medicine.group_name}</td>
                        <td className="px-3 py-3">{medicine.unit_name}</td>
                        <td className="px-3 py-3 text-lg font-bold">{medicine.available_quantity}</td>
                        <td className="px-3 py-3">
                          {medicine.min_selling_price === null
                            ? "Chưa có giá"
                            : medicine.min_selling_price === medicine.max_selling_price
                              ? formatVnd(Number(medicine.min_selling_price))
                              : `${formatVnd(Number(medicine.min_selling_price))} - ${formatVnd(Number(medicine.max_selling_price))}`}
                        </td>
                        <td className="px-3 py-3">{medicine.nearest_expiry ?? "Chưa có lô"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>Không tìm thấy thuốc phù hợp với “{query}”. Hãy kiểm tra lại tên hoặc mã thuốc.</EmptyState>
            )}
          </Panel>
        </div>
      </ManagerShell>
    </Guard>
  );
}
