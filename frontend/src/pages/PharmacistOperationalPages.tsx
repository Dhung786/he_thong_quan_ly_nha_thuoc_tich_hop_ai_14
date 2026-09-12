import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import type { MedicineBatch } from "../lib/manager-api";
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
  pharmacistProfileRequest,
  pharmacistReportRequest,
  pharmacistSuppliersRequest,
} from "../lib/pharmacist-api";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}

function formatVnd(value: string | number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return `${new Intl.NumberFormat("vi-VN").format(parsed)} đ`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
}

function PharmacistShell({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.user?.role !== "PHARMACIST") return <Navigate to="/dashboard" replace />;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#081528] text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <PharmacistSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[82px] flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0b1a30] px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">Dữ liệu trực tiếp từ PostgreSQL qua FastAPI</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300">PHARMACIST</span>
            <button type="button" onClick={() => void logout()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>
        <main className="p-5 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-5 shadow-xl shadow-slate-950/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function QueryState({ pending, error }: { pending: boolean; error: unknown }) {
  if (pending) return <p className="py-8 text-center text-sm text-slate-500">Đang tải dữ liệu...</p>;
  if (error) return <p className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{errorText(error)}</p>;
  return null;
}

export function PharmacistInventoryPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [threshold, setThreshold] = useState(20);
  const inventory = useQuery({ queryKey: ["pharmacist-inventory"], queryFn: () => pharmacistInventoryRequest(token), enabled: Boolean(token) });
  const lowStock = useQuery({ queryKey: ["pharmacist-low-stock", threshold], queryFn: () => pharmacistInventoryRequest(token, threshold), enabled: Boolean(token) });
  const batches = useQuery({ queryKey: ["pharmacist-batches"], queryFn: () => pharmacistBatchesRequest(token), enabled: Boolean(token) });

  return (
    <PharmacistShell title="Tồn kho & lô thuốc">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Tổng đơn vị tồn" value={(inventory.data ?? []).reduce((sum, row) => sum + row.quantity_remaining, 0)} />
          <Metric label="Số lô còn hàng" value={inventory.data?.length ?? 0} />
          <Metric label={`Lô tồn ≤ ${threshold}`} value={lowStock.data?.length ?? 0} accent />
        </section>
        <Panel title="Ngưỡng cảnh báo tồn thấp" action={<input type="number" min={0} value={threshold} onChange={(event) => setThreshold(Number(event.target.value) || 0)} className="w-28 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm" />}>
          <p className="text-sm text-slate-400">Thay đổi ngưỡng để lọc các lô có tồn kho thấp.</p>
        </Panel>
        <Panel title="Danh sách tồn kho theo lô">
          <QueryState pending={inventory.isPending} error={inventory.error} />
          {!inventory.isPending && !inventory.error && <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Thuốc</th><th>Mã</th><th>Lô</th><th>Tồn</th><th>HSD</th><th>Giá bán</th></tr></thead><tbody className="divide-y divide-slate-800">{(inventory.data ?? []).map((row) => <tr key={row.batch_id}><td className="py-3 font-semibold">{row.medicine_name}</td><td>{row.medicine_code}</td><td>{row.batch_code}</td><td>{row.quantity_remaining}</td><td>{formatDate(row.expiry_date)}</td><td className="text-emerald-300">{formatVnd(row.selling_price)}</td></tr>)}</tbody></table>{(inventory.data?.length ?? 0) === 0 && <p className="py-8 text-center text-slate-500">Chưa có lô còn hàng.</p>}</div>}
        </Panel>
        <Panel title="Toàn bộ lô nhập">
          <QueryState pending={batches.isPending} error={batches.error} />
          {!batches.isPending && !batches.error && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(batches.data ?? []).map((batch) => <div key={batch.id} className="rounded-xl border border-slate-800 bg-slate-950/25 p-4"><p className="font-bold">{batch.medicine_name}</p><p className="mt-2 text-sm text-slate-400">Lô {batch.code} · NCC {batch.supplier_name}</p><p className="mt-1 text-sm text-slate-400">Nhập {batch.quantity_received} · Còn {batch.quantity_remaining}</p><p className="mt-1 text-sm text-slate-400">HSD {formatDate(batch.expiry_date)}</p></div>)}</div>}
        </Panel>
      </div>
    </PharmacistShell>
  );
}

export function PharmacistSuppliersPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const suppliers = useQuery({ queryKey: ["pharmacist-suppliers"], queryFn: () => pharmacistSuppliersRequest(token), enabled: Boolean(token) });
  return <PharmacistShell title="Nhà cung cấp"><Panel title="Danh sách nhà cung cấp"><QueryState pending={suppliers.isPending} error={suppliers.error} />{!suppliers.isPending && !suppliers.error && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(suppliers.data ?? []).map((supplier) => <article key={supplier.id} className="rounded-xl border border-slate-800 bg-slate-950/25 p-4"><h3 className="font-bold text-cyan-200">{supplier.name}</h3><p className="mt-3 text-sm text-slate-400">📞 {supplier.phone || "Chưa có số điện thoại"}</p><p className="mt-2 text-sm text-slate-400">📍 {supplier.address || "Chưa có địa chỉ"}</p><p className="mt-2 text-xs text-slate-500">{supplier.notes || "Không có ghi chú"}</p></article>)}</div>}</Panel></PharmacistShell>;
}

export function PharmacistAlertsPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [days, setDays] = useState(90);
  const [threshold, setThreshold] = useState(20);
  const expiring = useQuery({ queryKey: ["pharmacist-expiring", days], queryFn: () => pharmacistExpiringRequest(token, days), enabled: Boolean(token) });
  const expired = useQuery({ queryKey: ["pharmacist-expired"], queryFn: () => pharmacistExpiredRequest(token), enabled: Boolean(token) });
  const lowStock = useQuery({ queryKey: ["pharmacist-alert-low", threshold], queryFn: () => pharmacistInventoryRequest(token, threshold), enabled: Boolean(token) });
  return <PharmacistShell title="Cảnh báo"><div className="space-y-6"><section className="grid gap-4 sm:grid-cols-3"><Metric label="Tồn thấp" value={lowStock.data?.length ?? 0} accent /><Metric label={`Sắp hết hạn ${days} ngày`} value={expiring.data?.length ?? 0} accent /><Metric label="Đã hết hạn" value={expired.data?.length ?? 0} danger /></section><Panel title="Thiết lập cảnh báo" action={<div className="flex gap-2"><label className="text-xs text-slate-400">Tồn ≤ <input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value) || 0)} className="ml-1 w-20 rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-1.5" /></label><label className="text-xs text-slate-400">HSD ≤ <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} className="ml-1 w-20 rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-1.5" /> ngày</label></div>}><p className="text-sm text-slate-400">Cảnh báo được tính trực tiếp từ số lượng tồn và hạn sử dụng của từng lô.</p></Panel><AlertTable title="Lô tồn thấp" rows={(lowStock.data ?? []).map((row) => [row.medicine_name, row.batch_code, String(row.quantity_remaining), formatDate(row.expiry_date)])} /><AlertTable title="Lô sắp hết hạn" rows={(expiring.data ?? []).map((row) => [row.medicine_name, row.batch_code, String(row.quantity_remaining), `${formatDate(row.expiry_date)} (${row.days_remaining} ngày)`])} /><AlertTable title="Lô đã hết hạn" rows={(expired.data ?? []).map((row) => [row.medicine_name, row.batch_code, String(row.quantity_remaining), formatDate(row.expiry_date)])} /></div></PharmacistShell>;
}

export function PharmacistSalesPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const client = useQueryClient();
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [code, setCode] = useState(`DS-${Date.now().toString().slice(-8)}`);
  const batches = useQuery({ queryKey: ["pharmacist-sales-batches"], queryFn: () => pharmacistBatchesRequest(token), enabled: Boolean(token) });
  const invoices = useQuery({ queryKey: ["pharmacist-own-invoices"], queryFn: () => pharmacistInvoicesRequest(token), enabled: Boolean(token) });
  const available = useMemo(() => (batches.data ?? []).filter((batch) => batch.quantity_remaining > 0 && new Date(`${batch.expiry_date}T23:59:59`) >= new Date()), [batches.data]);
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["pharmacist-own-invoices"] }), client.invalidateQueries({ queryKey: ["pharmacist-sales-batches"] }), client.invalidateQueries({ queryKey: ["pharmacist-dashboard"] })]); };
  const createInvoice = useMutation({ mutationFn: () => pharmacistCreateInvoiceRequest(token, { code: code.trim(), items: [{ batch_id: Number(batchId), quantity }] }), onSuccess: async () => { setCode(`DS-${Date.now().toString().slice(-8)}`); await refresh(); } });
  const finalize = useMutation({ mutationFn: (id: number) => pharmacistFinalizeInvoiceRequest(token, id), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: (id: number) => pharmacistCancelInvoiceRequest(token, id), onSuccess: refresh });

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!batchId || quantity < 1 || !code.trim()) return; createInvoice.mutate(); }

  return <PharmacistShell title="Hỗ trợ bán thuốc"><div className="grid gap-6 2xl:grid-cols-[0.8fr_1.2fr]"><Panel title="Tạo hóa đơn nháp"><form onSubmit={submit} className="space-y-4"><Field label="Mã hóa đơn"><input value={code} onChange={(e) => setCode(e.target.value)} className="input-field" required /></Field><Field label="Chọn lô thuốc"><select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input-field" required><option value="">-- Chọn lô còn hàng, còn hạn --</option>{available.map((batch) => <option key={batch.id} value={batch.id}>{batch.medicine_name} · {batch.code} · còn {batch.quantity_remaining} · {formatVnd(batch.selling_price)}</option>)}</select></Field><Field label="Số lượng"><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} className="input-field" /></Field><button type="submit" disabled={createInvoice.isPending || !batchId} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{createInvoice.isPending ? "Đang tạo..." : "Tạo hóa đơn nháp"}</button>{createInvoice.error && <p className="text-sm text-red-300">{errorText(createInvoice.error)}</p>}<p className="text-xs leading-5 text-slate-500">Dược sĩ chọn lô cụ thể. Hệ thống không tự suy đoán FIFO/FEFO. Chỉ khi bấm Chốt hóa đơn mới trừ tồn kho.</p></form></Panel><Panel title="Hóa đơn của tôi"><QueryState pending={invoices.isPending} error={invoices.error} /><div className="space-y-3">{(invoices.data ?? []).map((invoice) => <article key={invoice.id} className="rounded-xl border border-slate-800 bg-slate-950/25 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{invoice.code}</p><p className="mt-1 text-sm text-slate-400">{invoice.items.map((item) => `${item.medicine_name} (${item.batch_code}) × ${item.quantity}`).join(" · ")}</p></div><div className="text-right"><p className="font-black text-emerald-300">{formatVnd(invoice.total_amount)}</p><p className="mt-1 text-xs text-slate-400">{invoice.status}</p></div></div>{invoice.status === "DRAFT" && <div className="mt-4 flex gap-2"><button type="button" onClick={() => finalize.mutate(invoice.id)} disabled={finalize.isPending} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950">Chốt hóa đơn</button><button type="button" onClick={() => cancel.mutate(invoice.id)} disabled={cancel.isPending} className="rounded-lg border border-red-700 px-3 py-2 text-xs font-bold text-red-300">Hủy nháp</button></div>}</article>)}{!invoices.isPending && (invoices.data?.length ?? 0) === 0 && <p className="py-8 text-center text-slate-500">Chưa có hóa đơn do tài khoản này tạo.</p>}</div>{(finalize.error || cancel.error) && <p className="mt-3 text-sm text-red-300">{errorText(finalize.error ?? cancel.error)}</p>}</Panel></div></PharmacistShell>;
}

export function PharmacistAIPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [medicineId, setMedicineId] = useState("");
  const [warningDays, setWarningDays] = useState(30);
  const [message, setMessage] = useState("Quy trình bán thuốc và chốt hóa đơn như thế nào?");
  const [answer, setAnswer] = useState("");
  const status = useQuery({ queryKey: ["pharmacist-ai-status"], queryFn: () => pharmacistAIStatusRequest(token), enabled: Boolean(token) });
  const medicines = useQuery({ queryKey: ["pharmacist-ai-medicines"], queryFn: () => pharmacistMedicineLookupRequest(token), enabled: Boolean(token) });
  const summary = useMutation({ mutationFn: () => pharmacistMedicineSummaryRequest(token, Number(medicineId)), onSuccess: (data) => setAnswer(data.answer) });
  const expiry = useMutation({ mutationFn: () => pharmacistExpiryAIReportRequest(token, warningDays), onSuccess: (data) => setAnswer(data.answer) });
  const chat = useMutation({ mutationFn: () => pharmacistInternalChatRequest(token, message), onSuccess: (data) => setAnswer(data.answer) });
  const activeError = summary.error ?? expiry.error ?? chat.error;

  return <PharmacistShell title="AI Dược sĩ"><div className="space-y-6"><Panel title="Trạng thái AI" action={<span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">{status.data?.configured ? "Sẵn sàng" : "Đang kiểm tra"}</span>}><p className="text-sm text-slate-400">Provider: <strong className="text-slate-200">{status.data?.provider ?? "..."}</strong> · Model: <strong className="text-slate-200">{status.data?.model ?? "..."}</strong> · Scope Guard: <strong className="text-slate-200">{status.data?.scope_guard ?? "..."}</strong></p></Panel><div className="grid gap-6 xl:grid-cols-3"><Panel title="Tóm tắt thông tin thuốc"><select value={medicineId} onChange={(e) => setMedicineId(e.target.value)} className="input-field"><option value="">-- Chọn thuốc --</option>{(medicines.data ?? []).map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} ({medicine.code})</option>)}</select><button type="button" onClick={() => summary.mutate()} disabled={!medicineId || summary.isPending} className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Tóm tắt</button></Panel><Panel title="Báo cáo thuốc sắp hết hạn"><Field label="Khoảng cảnh báo (ngày)"><input type="number" min={1} max={365} value={warningDays} onChange={(e) => setWarningDays(Math.min(365, Math.max(1, Number(e.target.value) || 1)))} className="input-field" /></Field><button type="button" onClick={() => expiry.mutate()} disabled={expiry.isPending} className="mt-3 w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950">Tạo báo cáo AI</button></Panel><Panel title="Chatbot quy trình nội bộ"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="input-field resize-none" /><button type="button" onClick={() => chat.mutate()} disabled={message.trim().length < 2 || chat.isPending} className="mt-3 w-full rounded-xl bg-violet-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Hỏi AI</button></Panel></div><Panel title="Phản hồi AI"><div className="min-h-36 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/30 p-5 text-sm leading-7 text-slate-200">{answer || "Chọn một chức năng AI phía trên để bắt đầu."}</div>{activeError && <p className="mt-3 text-sm text-red-300">{errorText(activeError)}</p>}<p className="mt-4 text-xs leading-5 text-slate-500">AI chỉ hỗ trợ nghiệp vụ và dữ liệu hệ thống, không chẩn đoán, kê đơn hoặc tự động sửa tồn kho/hóa đơn.</p></Panel></div></PharmacistShell>;
}

export function PharmacistProcessPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [question, setQuestion] = useState("Quy trình kiểm kê tồn kho và lô thuốc là gì?");
  const [answer, setAnswer] = useState("");
  const chat = useMutation({ mutationFn: () => pharmacistInternalChatRequest(token, question), onSuccess: (data) => setAnswer(data.answer) });
  return <PharmacistShell title="Quy trình nội bộ"><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><Panel title="Hỏi quy trình"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={6} className="input-field resize-none" /><div className="mt-3 flex flex-wrap gap-2">{["Quy trình bán thuốc và hóa đơn", "Quy trình kiểm kê tồn kho", "Xử lý lô thuốc hết hạn", "Tra cứu nhà cung cấp"].map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-cyan-600">{item}</button>)}</div><button type="button" onClick={() => chat.mutate()} disabled={chat.isPending || question.trim().length < 2} className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Tra cứu quy trình</button></Panel><Panel title="Hướng dẫn"><div className="min-h-56 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/25 p-5 text-sm leading-7 text-slate-200">{answer || "Nhập câu hỏi về quy trình nhà thuốc để nhận hướng dẫn trong phạm vi an toàn."}</div>{chat.error && <p className="mt-3 text-sm text-red-300">{errorText(chat.error)}</p>}</Panel></div></PharmacistShell>;
}

export function PharmacistReportsPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [days, setDays] = useState(90);
  const report = useQuery({ queryKey: ["pharmacist-report", days], queryFn: () => pharmacistReportRequest(token, days), enabled: Boolean(token) });
  return <PharmacistShell title="Báo cáo"><div className="space-y-6"><Panel title="Khoảng báo cáo hạn dùng" action={<input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} className="w-28 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm" />}><p className="text-sm text-slate-400">Doanh thu và số hóa đơn chỉ tính các hóa đơn đã chốt bởi tài khoản Dược sĩ hiện tại.</p></Panel><QueryState pending={report.isPending} error={report.error} />{report.data && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Hóa đơn đã chốt" value={report.data.finalized_invoice_count} /><Metric label="Doanh thu của tôi" value={formatVnd(report.data.revenue)} /><Metric label="Tổng đơn vị tồn" value={report.data.inventory_units} /><Metric label="Lô sắp hết hạn" value={report.data.expiring_lots ?? 0} accent /><Metric label="Lô đã hết hạn" value={report.data.expired_lots} danger /></section>}</div></PharmacistShell>;
}

export function PharmacistProfilePage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const profile = useQuery({ queryKey: ["pharmacist-profile"], queryFn: () => pharmacistProfileRequest(token), enabled: Boolean(token) });
  return <PharmacistShell title="Hồ sơ"><Panel title="Thông tin tài khoản"><QueryState pending={profile.isPending} error={profile.error} />{profile.data && <div className="grid gap-4 sm:grid-cols-2"><ProfileItem label="Tên đăng nhập" value={profile.data.username} /><ProfileItem label="Vai trò" value={profile.data.role} /><ProfileItem label="Trạng thái" value={profile.data.is_active ? "Đang hoạt động" : "Đã khóa"} /><ProfileItem label="Ngày tạo" value={new Date(profile.data.created_at).toLocaleString("vi-VN")} /></div>}</Panel></PharmacistShell>;
}

function Metric({ label, value, accent = false, danger = false }: { label: string; value: string | number; accent?: boolean; danger?: boolean }) {
  const valueClass = danger ? "text-red-300" : accent ? "text-amber-300" : "text-cyan-200";
  return <div className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-5"><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</p></div>;
}

function AlertTable({ title, rows }: { title: string; rows: string[][] }) {
  return <Panel title={title}><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Thuốc</th><th>Lô</th><th>Tồn</th><th>Hạn sử dụng</th></tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row) => <tr key={`${row[0]}-${row[1]}`}>{row.map((cell) => <td key={cell} className="py-3 pr-4 text-slate-300">{cell}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <p className="py-8 text-center text-slate-500">Không có cảnh báo trong nhóm này.</p>}</div></Panel>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span>{children}</label>;
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-bold text-slate-100">{value}</p></div>;
}
