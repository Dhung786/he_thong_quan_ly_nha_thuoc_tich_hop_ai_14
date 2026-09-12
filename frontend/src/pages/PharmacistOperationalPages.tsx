import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import type { ExpiryRow, InventoryRow, Invoice, MedicineBatch, ReportSummary } from "../lib/manager-api";
import {
  pharmacistAIStatusRequest,
  pharmacistBatchesRequest,
  pharmacistCancelInvoiceRequest,
  pharmacistCreateInvoiceRequest,
  pharmacistExpiredRequest,
  pharmacistExpiringRequest,
  pharmacistExpiryAIReportRequest,
  pharmacistFinalizeInvoiceRequest,
  pharmacistInternalChatRequest,
  pharmacistInventoryRequest,
  pharmacistInvoicesRequest,
  pharmacistMedicineLookupRequest,
  pharmacistMedicineSummaryRequest,
  pharmacistReportSummaryRequest,
  type PharmacistAIStatus,
  type PharmacistAITextResponse,
} from "../lib/pharmacist-api";
import type { Medicine } from "../lib/api";

function formatMoney(value: string | number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(numberValue)
    : "—";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("vi-VN");
}

function PharmacistShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.user?.role !== "PHARMACIST") return <Navigate to="/dashboard" replace />;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300 sm:inline-flex">PHARMACIST</span>
            <button type="button" onClick={() => void logout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

function StatusBox({ error, busy, message }: { error: string | null; busy: boolean; message?: string | null }) {
  return (
    <>
      {busy && <div className="rounded-xl border border-sky-700/40 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">Đang tải dữ liệu...</div>}
      {error && <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{message}</div>}
    </>
  );
}

export function PharmacistInventoryPage() {
  const auth = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [threshold, setThreshold] = useState("20");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = auth.accessToken;

  async function load(limit?: number) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const [inventory, batchRows] = await Promise.all([
        pharmacistInventoryRequest(token, limit),
        pharmacistBatchesRequest(token),
      ]);
      setRows(inventory);
      setBatches(batchRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải tồn kho.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token && auth.user?.role === "PHARMACIST") void load();
  }, [token, auth.user?.role]);

  const totalUnits = rows.reduce((sum, row) => sum + row.quantity_remaining, 0);

  return (
    <PharmacistShell title="Tồn kho & lô thuốc" subtitle="Dữ liệu thật từ API tồn kho và PostgreSQL">
      <div className="mx-auto max-w-7xl space-y-5">
        <StatusBox error={error} busy={busy} />
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">Dòng tồn kho</p><p className="mt-2 text-3xl font-bold">{rows.length}</p></div>
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">Tổng đơn vị đang hiển thị</p><p className="mt-2 text-3xl font-bold">{totalUnits}</p></div>
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">Tổng lô</p><p className="mt-2 text-3xl font-bold">{batches.length}</p></div>
        </section>
        <section className="rounded-2xl border border-slate-700 bg-[#18253a] p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-slate-300">Ngưỡng tồn thấp
              <input type="number" min={0} value={threshold} onChange={(event) => setThreshold(event.target.value)} className="mt-2 block w-44 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" />
            </label>
            <button type="button" onClick={() => void load(Math.max(0, Number(threshold) || 0))} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950">Lọc tồn thấp</button>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold">Xem tất cả</button>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#18253a]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-slate-950/35 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Thuốc</th><th className="px-5 py-3">Lô</th><th className="px-5 py-3">Tồn</th><th className="px-5 py-3">Hạn sử dụng</th><th className="px-5 py-3">Giá bán</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => <tr key={row.batch_id}><td className="px-5 py-4"><p className="font-semibold">{row.medicine_name}</p><p className="text-xs text-slate-500">{row.medicine_code}</p></td><td className="px-5 py-4">{row.batch_code}</td><td className="px-5 py-4 font-bold">{row.quantity_remaining}</td><td className="px-5 py-4">{formatDate(row.expiry_date)}</td><td className="px-5 py-4">{formatMoney(row.selling_price)}</td></tr>)}
                {!rows.length && !busy && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Không có dữ liệu phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PharmacistShell>
  );
}

export function PharmacistAlertsPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [threshold, setThreshold] = useState("20");
  const [days, setDays] = useState("90");
  const [lowStock, setLowStock] = useState<InventoryRow[]>([]);
  const [expiring, setExpiring] = useState<ExpiryRow[]>([]);
  const [expired, setExpired] = useState<ExpiryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAlerts() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const [stockRows, expiringRows, expiredRows] = await Promise.all([
        pharmacistInventoryRequest(token, Math.max(0, Number(threshold) || 0)),
        pharmacistExpiringRequest(token, Math.max(0, Number(days) || 0)),
        pharmacistExpiredRequest(token),
      ]);
      setLowStock(stockRows);
      setExpiring(expiringRows);
      setExpired(expiredRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải cảnh báo.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token && auth.user?.role === "PHARMACIST") void loadAlerts();
  }, [token, auth.user?.role]);

  return (
    <PharmacistShell title="Cảnh báo" subtitle="Tồn thấp, sắp hết hạn và đã hết hạn">
      <div className="mx-auto max-w-7xl space-y-5">
        <StatusBox error={error} busy={busy} />
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><p className="text-sm text-amber-200">Tồn thấp</p><p className="mt-2 text-3xl font-bold">{lowStock.length}</p></div>
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5"><p className="text-sm text-orange-200">Sắp hết hạn</p><p className="mt-2 text-3xl font-bold">{expiring.length}</p></div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5"><p className="text-sm text-red-200">Đã hết hạn</p><p className="mt-2 text-3xl font-bold">{expired.length}</p></div>
        </section>
        <section className="rounded-2xl border border-slate-700 bg-[#18253a] p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold">Ngưỡng tồn thấp<input type="number" min={0} value={threshold} onChange={(event) => setThreshold(event.target.value)} className="mt-2 block w-40 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold">Cảnh báo trước (ngày)<input type="number" min={0} max={3650} value={days} onChange={(event) => setDays(event.target.value)} className="mt-2 block w-40 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" /></label>
            <button type="button" onClick={() => void loadAlerts()} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950">Áp dụng</button>
          </div>
        </section>
        <section className="grid gap-5 xl:grid-cols-2">
          <AlertTable title="Lô sắp hết hạn" rows={expiring} />
          <AlertTable title="Lô đã hết hạn" rows={expired} />
        </section>
      </div>
    </PharmacistShell>
  );
}

function AlertTable({ title, rows }: { title: string; rows: ExpiryRow[] }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#18253a]"><div className="border-b border-slate-700 px-5 py-4 font-bold">{title}</div><div className="max-h-[430px] overflow-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 bg-slate-950/90 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Thuốc</th><th className="px-4 py-3">Lô</th><th className="px-4 py-3">Tồn</th><th className="px-4 py-3">HSD</th><th className="px-4 py-3">Còn lại</th></tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row) => <tr key={row.batch_id}><td className="px-4 py-3">{row.medicine_name}</td><td className="px-4 py-3">{row.batch_code}</td><td className="px-4 py-3">{row.quantity_remaining}</td><td className="px-4 py-3">{formatDate(row.expiry_date)}</td><td className="px-4 py-3">{row.days_remaining} ngày</td></tr>)}{!rows.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu.</td></tr>}</tbody></table></div></div>;
}

export function PharmacistSalesPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const [batchRows, invoiceRows] = await Promise.all([
        pharmacistBatchesRequest(token),
        pharmacistInvoicesRequest(token),
      ]);
      setBatches(batchRows);
      setInvoices(invoiceRows);
      const firstAvailable = batchRows.find((batch) => batch.quantity_remaining > 0 && batch.expiry_date >= new Date().toISOString().slice(0, 10));
      if (firstAvailable && !batchId) setBatchId(String(firstAvailable.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu bán thuốc.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token && auth.user?.role === "PHARMACIST") void reload();
  }, [token, auth.user?.role]);

  const saleableBatches = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return batches.filter((batch) => batch.quantity_remaining > 0 && batch.expiry_date >= today);
  }, [batches]);

  async function createDraft() {
    if (!token || !batchId) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Số lượng phải là số nguyên lớn hơn 0.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const code = `PH-${Date.now()}`;
      const invoice = await pharmacistCreateInvoiceRequest(token, {
        code,
        items: [{ batch_id: Number(batchId), quantity: qty }],
      });
      setMessage(`Đã tạo hóa đơn nháp ${invoice.code}.`);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo hóa đơn.");
      setBusy(false);
    }
  }

  async function changeInvoice(invoiceId: number, action: "finalize" | "cancel") {
    if (!token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = action === "finalize"
        ? await pharmacistFinalizeInvoiceRequest(token, invoiceId)
        : await pharmacistCancelInvoiceRequest(token, invoiceId);
      setMessage(`${updated.code}: ${updated.status}.`);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cập nhật hóa đơn.");
      setBusy(false);
    }
  }

  return (
    <PharmacistShell title="Hỗ trợ bán thuốc" subtitle="Tạo, chốt và hủy hóa đơn nháp bằng API Dược sĩ">
      <div className="mx-auto max-w-7xl space-y-5">
        <StatusBox error={error} busy={busy} message={message} />
        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5">
            <h2 className="text-lg font-bold">Tạo hóa đơn nháp</h2>
            <label className="mt-4 block text-sm font-semibold">Chọn lô còn hàng, còn hạn</label>
            <select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5">
              {saleableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.medicine_name} · {batch.code} · tồn {batch.quantity_remaining} · {formatMoney(batch.selling_price)}</option>)}
            </select>
            <label className="mt-4 block text-sm font-semibold">Số lượng</label>
            <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" />
            <button type="button" disabled={!saleableBatches.length || busy} onClick={() => void createDraft()} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-40">Tạo hóa đơn nháp</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#18253a]">
            <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Hóa đơn gần đây</h2></div>
            <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-slate-950/90 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Số dòng</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-800">{invoices.slice(0, 20).map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-semibold">{invoice.code}</td><td className="px-4 py-3">{invoice.status}</td><td className="px-4 py-3">{formatMoney(invoice.total_amount)}</td><td className="px-4 py-3">{invoice.items.length}</td><td className="px-4 py-3">{invoice.status === "DRAFT" ? <div className="flex gap-2"><button type="button" onClick={() => void changeInvoice(invoice.id, "finalize")} className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950">Chốt</button><button type="button" onClick={() => void changeInvoice(invoice.id, "cancel")} className="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-bold text-red-300">Hủy</button></div> : <span className="text-xs text-slate-500">Đã xử lý</span>}</td></tr>)}{!invoices.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có hóa đơn.</td></tr>}</tbody></table></div>
          </div>
        </section>
      </div>
    </PharmacistShell>
  );
}

export function PharmacistReportsPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [days, setDays] = useState("90");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      setSummary(await pharmacistReportSummaryRequest(token, Math.max(0, Number(days) || 0)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải báo cáo.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token && auth.user?.role === "PHARMACIST") void load();
  }, [token, auth.user?.role]);

  return (
    <PharmacistShell title="Báo cáo" subtitle="Báo cáo đọc dành cho Dược sĩ">
      <div className="mx-auto max-w-6xl space-y-5">
        <StatusBox error={error} busy={busy} />
        <section className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><div className="flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Khoảng cảnh báo hạn dùng (ngày)<input type="number" min={0} value={days} onChange={(event) => setDays(event.target.value)} className="mt-2 block w-48 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" /></label><button type="button" onClick={() => void load()} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950">Tải báo cáo</button></div></section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Hóa đơn đã chốt" value={summary?.finalized_invoice_count ?? 0} />
          <Metric label="Doanh thu" value={summary ? formatMoney(summary.revenue) : "—"} />
          <Metric label="Đơn vị tồn" value={summary?.inventory_units ?? 0} />
          <Metric label="Lô hết hạn" value={summary?.expired_lots ?? 0} />
          <Metric label="Lô sắp hết hạn" value={summary?.expiring_lots ?? 0} />
        </section>
      </div>
    </PharmacistShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

export function PharmacistAIWorkspacePage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [status, setStatus] = useState<PharmacistAIStatus | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineId, setMedicineId] = useState("");
  const [warningDays, setWarningDays] = useState("90");
  const [message, setMessage] = useState("Quy trình xử lý thuốc sắp hết hạn là gì?");
  const [result, setResult] = useState<PharmacistAITextResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || auth.user?.role !== "PHARMACIST") return;
    void Promise.all([pharmacistAIStatusRequest(token), pharmacistMedicineLookupRequest(token)])
      .then(([aiStatus, medicineRows]) => {
        setStatus(aiStatus);
        setMedicines(medicineRows);
        if (medicineRows.length) setMedicineId((current) => current || String(medicineRows[0].id));
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Không thể tải AI."));
  }, [token, auth.user?.role]);

  async function run(task: () => Promise<PharmacistAITextResponse>) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await task());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể thực hiện yêu cầu AI.");
    } finally {
      setBusy(false);
    }
  }

  const configured = status?.configured ?? false;
  const isDemo = status?.provider === "demo";

  return (
    <PharmacistShell title="AI Dược sĩ" subtitle="Scope Guard bật · không chẩn đoán, kê đơn hoặc tự sửa dữ liệu">
      <div className="mx-auto max-w-7xl space-y-5">
        <StatusBox error={error} busy={busy} />
        <section className={`rounded-2xl border p-5 ${configured ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{configured ? "AI đã sẵn sàng" : "AI chưa được cấu hình"}</p><p className="mt-1 text-sm text-slate-300">Provider: {status?.provider ?? "đang kiểm tra"} · Model: {status?.model ?? "—"}</p></div><span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">Scope Guard: {status?.scope_guard ?? "..."}</span></div>
          {isDemo && <p className="mt-3 text-sm text-amber-100">Đang chạy chế độ AI demo an toàn để dự án hoạt động ngay. Muốn dùng mô hình AI thật, cấu hình AI_PROVIDER=openai_compatible cùng API key, base URL và model trong file .env; không đưa khóa lên GitHub.</p>}
        </section>
        <section className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><h2 className="font-bold">Tóm tắt thuốc</h2><select value={medicineId} onChange={(event) => setMedicineId(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5">{medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.code} · {medicine.name}</option>)}</select><button type="button" disabled={!configured || !medicineId || busy || !token} onClick={() => token && void run(() => pharmacistMedicineSummaryRequest(token, Number(medicineId)))} className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-2.5 font-bold text-slate-950 disabled:opacity-40">Tạo tóm tắt</button></div>
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><h2 className="font-bold">Báo cáo hạn dùng</h2><input type="number" min={1} max={3650} value={warningDays} onChange={(event) => setWarningDays(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" /><button type="button" disabled={!configured || busy || !token} onClick={() => token && void run(() => pharmacistExpiryAIReportRequest(token, Number(warningDays)))} className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-2.5 font-bold text-slate-950 disabled:opacity-40">Tạo báo cáo AI</button></div>
          <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><h2 className="font-bold">Hỏi quy trình nội bộ</h2><textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" /><button type="button" disabled={!configured || busy || message.trim().length < 2 || !token} onClick={() => token && void run(() => pharmacistInternalChatRequest(token, message.trim()))} className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-2.5 font-bold text-slate-950 disabled:opacity-40">Hỏi AI</button></div>
        </section>
        {result && <section className="rounded-2xl border border-slate-700 bg-[#18253a] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Kết quả</h2><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">{result.provider} · {result.scope_guard}</span></div><div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/30 p-5 leading-7">{result.answer}</div><p className="mt-4 text-xs leading-5 text-slate-500">{result.disclaimer}</p></section>}
      </div>
    </PharmacistShell>
  );
}
