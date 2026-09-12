import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { CashierSidebar } from "../components/CashierSidebar";
import {
  cashierAssistantRequest,
  cashierCancelInvoiceRequest,
  cashierCreateInvoiceRequest,
  cashierFinalizeInvoiceRequest,
  cashierInventoryRequest,
  cashierInvoicesRequest,
  type CashierInventoryRow,
  type CashierInvoice,
} from "../lib/cashier-api";

function money(value: string | number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} đ`;
}

function daysUntil(dateValue: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function CashierShell({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  if (auth.user?.role !== "CASHIER") return <Navigate to="/dashboard" replace />;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <CashierSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[82px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-1 text-xs text-slate-500">Thu ngân · {auth.user?.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">CASHIER</span>
            <button onClick={() => void logout()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
    </div>
  );
}

type CartRow = CashierInventoryRow & { quantity: number };

export function CashierEnhancedSalesPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inventory = useQuery({ queryKey: ["cashier-inventory"], queryFn: () => cashierInventoryRequest(token), enabled: Boolean(token) });

  const sorted = useMemo(() => [...(inventory.data ?? [])].sort((a, b) => {
    const nameCompare = a.medicine_name.localeCompare(b.medicine_name, "vi");
    if (nameCompare !== 0) return nameCompare;
    return a.expiry_date.localeCompare(b.expiry_date);
  }), [inventory.data]);

  const earliestBatchByMedicine = useMemo(() => {
    const map = new Map<number, number>();
    sorted.forEach((row) => { if (!map.has(row.medicine_id)) map.set(row.medicine_id, row.batch_id); });
    return map;
  }, [sorted]);

  const visible = sorted.filter((row) =>
    `${row.medicine_name} ${row.medicine_code} ${row.batch_code}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const total = useMemo(() => cart.reduce((sum, row) => sum + Number(row.selling_price) * row.quantity, 0), [cart]);

  function add(row: CashierInventoryRow) {
    const remainingDays = daysUntil(row.expiry_date);
    if (remainingDays < 0) {
      setFeedback(`Không thể bán lô ${row.batch_code} vì đã hết hạn.`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.batch_id === row.batch_id);
      if (existing) {
        if (existing.quantity >= existing.quantity_remaining) {
          setFeedback(`Lô ${row.batch_code} chỉ còn ${row.quantity_remaining} sản phẩm.`);
          return current;
        }
        return current.map((item) => item.batch_id === row.batch_id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...row, quantity: 1 }];
    });
    if (remainingDays <= 30) setFeedback(`Lưu ý: lô ${row.batch_code} còn ${remainingDays} ngày đến hạn sử dụng.`);
  }

  function addFirstMatch() {
    if (!search.trim()) return;
    const exact = visible.find((row) => row.batch_code.toLowerCase() === search.trim().toLowerCase() || row.medicine_code.toLowerCase() === search.trim().toLowerCase());
    const target = exact ?? visible[0];
    if (target) {
      add(target);
      setSearch("");
    } else {
      setFeedback("Không tìm thấy thuốc hoặc mã lô phù hợp.");
    }
  }

  const sell = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error("Chưa có thuốc trong hóa đơn.");
      const invalid = cart.find((row) => row.quantity > row.quantity_remaining || daysUntil(row.expiry_date) < 0);
      if (invalid) throw new Error(`Lô ${invalid.batch_code} không đủ điều kiện bán.`);
      const code = `HD-${Date.now()}`;
      const draft = await cashierCreateInvoiceRequest(token, { code, items: cart.map((row) => ({ batch_id: row.batch_id, quantity: row.quantity })) });
      return cashierFinalizeInvoiceRequest(token, draft.id);
    },
    onSuccess: async (invoice) => {
      setFeedback(`Thanh toán thành công ${invoice.code} · ${money(invoice.total_amount)}`);
      setCart([]);
      await qc.invalidateQueries({ queryKey: ["cashier-inventory"] });
      await qc.invalidateQueries({ queryKey: ["cashier-invoices"] });
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Không thể thanh toán."),
  });

  return (
    <CashierShell title="Bán thuốc tại quầy">
      {feedback && <div className="mb-5 rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">{feedback}</div>}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-3xl border border-slate-700 bg-[#18253a] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-lg font-bold">Chọn thuốc / lô bán</h2><p className="mt-1 text-xs text-slate-500">Ưu tiên FEFO: lô còn hạn và hết hạn sớm hơn được đề xuất trước.</p></div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">FEFO bật</span>
          </div>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addFirstMatch(); }}
            placeholder="Quét/nhập mã thuốc, mã lô hoặc tên thuốc rồi nhấn Enter..."
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 outline-none focus:border-cyan-500"
          />
          <div className="mt-4 max-h-[570px] space-y-2 overflow-y-auto">
            {visible.map((row) => {
              const days = daysUntil(row.expiry_date);
              const isFefo = earliestBatchByMedicine.get(row.medicine_id) === row.batch_id;
              return (
                <button key={row.batch_id} type="button" onClick={() => add(row)} className={`w-full rounded-xl border p-4 text-left transition hover:border-cyan-500 ${isFefo ? "border-emerald-700/60 bg-emerald-950/15" : "border-slate-700 bg-slate-950/20"}`}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{row.medicine_name}</p>{isFefo && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">FEFO đề xuất</span>}</div>
                      <p className="mt-1 text-xs text-slate-500">{row.medicine_code} · Lô {row.batch_code} · HSD {row.expiry_date}</p>
                      {days <= 30 && <p className="mt-1 text-xs font-semibold text-amber-300">⚠ Còn {days} ngày đến hạn</p>}
                    </div>
                    <div className="text-right"><p className="font-bold text-emerald-300">{money(row.selling_price)}</p><p className="mt-1 text-xs text-slate-500">Tồn {row.quantity_remaining}</p></div>
                  </div>
                </button>
              );
            })}
            {!visible.length && <p className="py-10 text-center text-sm text-slate-500">Không có thuốc/lô phù hợp.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-[#18253a] p-5">
          <h2 className="text-lg font-bold">Hóa đơn hiện tại</h2>
          <div className="mt-4 space-y-3">
            {cart.map((row) => <div key={row.batch_id} className="rounded-xl border border-slate-700 bg-slate-950/20 p-3">
              <div className="flex justify-between gap-3"><div><p className="font-semibold">{row.medicine_name}</p><p className="text-xs text-slate-500">Lô {row.batch_code} · tồn {row.quantity_remaining}</p></div><button onClick={() => setCart((c) => c.filter((x) => x.batch_id !== row.batch_id))} className="text-xs text-red-300">Xóa</button></div>
              <div className="mt-3 flex items-center justify-between"><input type="number" min={1} max={row.quantity_remaining} value={row.quantity} onChange={(e) => {
                const raw = Number(e.target.value) || 1;
                const next = Math.max(1, Math.min(raw, row.quantity_remaining));
                if (raw > row.quantity_remaining) setFeedback(`Số lượng vượt tồn của lô ${row.batch_code}. Tối đa ${row.quantity_remaining}.`);
                setCart((c) => c.map((x) => x.batch_id === row.batch_id ? { ...x, quantity: next } : x));
              }} className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5" /><span className="font-bold">{money(Number(row.selling_price) * row.quantity)}</span></div>
            </div>)}
            {!cart.length && <p className="py-8 text-center text-sm text-slate-500">Chưa có thuốc trong hóa đơn.</p>}
          </div>
          <div className="mt-6 border-t border-slate-700 pt-5">
            <div className="flex justify-between text-lg font-black"><span>Tổng tiền</span><span className="text-emerald-300">{money(total)}</span></div>
            <button disabled={!cart.length || sell.isPending} onClick={() => sell.mutate()} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-slate-950 disabled:opacity-40">{sell.isPending ? "Đang thanh toán..." : "Thanh toán & chốt hóa đơn"}</button>
          </div>
        </section>
      </div>
    </CashierShell>
  );
}

function statusText(status: string) {
  if (status === "FINALIZED") return "Đã thanh toán";
  if (status === "DRAFT") return "Nháp";
  return "Đã hủy";
}

function printInvoice(invoice: CashierInvoice) {
  const rows = invoice.items.map((item) => `<tr><td>${item.medicine_name}</td><td>${item.batch_code}</td><td>${item.quantity}</td><td>${money(item.unit_price)}</td><td>${money(item.line_total)}</td></tr>`).join("");
  const win = window.open("", "_blank", "width=850,height=700");
  if (!win) return;
  win.document.write(`<html><head><title>${invoice.code}</title><style>body{font-family:Arial;padding:28px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}.total{font-size:20px;font-weight:700;text-align:right;margin-top:20px}</style></head><body><h2>HÓA ĐƠN NHÀ THUỐC</h2><p>Mã: ${invoice.code}</p><p>Thời gian: ${new Date(invoice.created_at).toLocaleString("vi-VN")}</p><table><thead><tr><th>Thuốc</th><th>Lô</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Tổng: ${money(invoice.total_amount)}</p></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function exportInvoiceCsv(invoice: CashierInvoice) {
  const lines = ["Thuốc,Mã lô,Số lượng,Đơn giá,Thành tiền", ...invoice.items.map((item) => [item.medicine_name, item.batch_code, item.quantity, item.unit_price, item.line_total].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")), `,,,Tổng,${invoice.total_amount}`];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.code}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CashierEnhancedInvoicesPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const invoices = useQuery({ queryKey: ["cashier-invoices"], queryFn: () => cashierInvoicesRequest(token), enabled: Boolean(token) });
  const cancel = useMutation({
    mutationFn: (id: number) => cashierCancelInvoiceRequest(token, id),
    onSuccess: async () => { setFeedback("Đã hủy hóa đơn nháp."); await qc.invalidateQueries({ queryKey: ["cashier-invoices"] }); },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Không thể hủy hóa đơn."),
  });

  const filtered = (invoices.data ?? []).filter((invoice) => {
    const searchOk = !q.trim() || invoice.code.toLowerCase().includes(q.trim().toLowerCase()) || invoice.items.some((item) => item.medicine_name.toLowerCase().includes(q.trim().toLowerCase()));
    const statusOk = status === "ALL" || invoice.status === status;
    const dateOk = !dateFilter || invoice.created_at.slice(0, 10) === dateFilter;
    return searchOk && statusOk && dateOk;
  });

  return <CashierShell title="Hóa đơn của tôi">
    {feedback && <div className="mb-5 rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-4 py-3 text-sm">{feedback}</div>}
    <div className="rounded-3xl border border-slate-700 bg-[#18253a] p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_190px]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã hóa đơn hoặc tên thuốc..." className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 outline-none focus:border-cyan-500" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3"><option value="ALL">Tất cả trạng thái</option><option value="FINALIZED">Đã thanh toán</option><option value="DRAFT">Nháp</option><option value="CANCELLED">Đã hủy</option></select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3" />
      </div>
      <div className="mt-5 space-y-3">
        {filtered.map((invoice) => <div key={invoice.id} className="rounded-xl border border-slate-700 bg-slate-950/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setExpanded(expanded === invoice.id ? null : invoice.id)} className="text-left"><p className="font-bold text-cyan-200">{invoice.code}</p><p className="mt-1 text-xs text-slate-500">{new Date(invoice.created_at).toLocaleString("vi-VN")} · {invoice.items.length} dòng thuốc</p></button>
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${invoice.status === "FINALIZED" ? "bg-emerald-500/10 text-emerald-300" : invoice.status === "DRAFT" ? "bg-amber-500/10 text-amber-200" : "bg-slate-700 text-slate-300"}`}>{statusText(invoice.status)}</span><span className="font-black">{money(invoice.total_amount)}</span><button onClick={() => setExpanded(expanded === invoice.id ? null : invoice.id)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs">Chi tiết</button>{invoice.status === "FINALIZED" && <><button onClick={() => printInvoice(invoice)} className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs text-cyan-300">In hóa đơn</button><button onClick={() => exportInvoiceCsv(invoice)} className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs text-emerald-300">Xuất CSV</button></>}{invoice.status === "DRAFT" && <button disabled={cancel.isPending} onClick={() => cancel.mutate(invoice.id)} className="rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-300">Hủy hóa đơn nháp</button>}</div>
          </div>
          {expanded === invoice.id && <div className="mt-4 overflow-x-auto border-t border-slate-700 pt-4"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Thuốc</th><th>Lô</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody className="divide-y divide-slate-800">{invoice.items.map((item) => <tr key={item.id}><td className="py-3 font-semibold">{item.medicine_name}</td><td>{item.batch_code}</td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.line_total)}</td></tr>)}</tbody></table></div>}
        </div>)}
        {!filtered.length && <p className="py-10 text-center text-sm text-slate-500">Không có hóa đơn phù hợp.</p>}
      </div>
    </div>
  </CashierShell>;
}

export function CashierShiftSummaryPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const invoices = useQuery({ queryKey: ["cashier-invoices"], queryFn: () => cashierInvoicesRequest(token), enabled: Boolean(token) });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const rows = (invoices.data ?? []).filter((invoice) => invoice.created_at.slice(0, 10) === date);
  const finalized = rows.filter((invoice) => invoice.status === "FINALIZED");
  const revenue = finalized.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const units = finalized.reduce((sum, invoice) => sum + invoice.items.reduce((s, item) => s + item.quantity, 0), 0);
  const drafts = rows.filter((invoice) => invoice.status === "DRAFT").length;
  const cancelled = rows.filter((invoice) => invoice.status === "CANCELLED").length;

  return <CashierShell title="Tổng kết ca bán hàng">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">Tổng hợp theo hóa đơn của tài khoản Thu ngân đang đăng nhập.</p><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2.5" /></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Hóa đơn đã thanh toán" value={finalized.length} /><Summary label="Doanh thu" value={money(revenue)} /><Summary label="Số lượng thuốc đã bán" value={units} /><Summary label="Nháp / Đã hủy" value={`${drafts} / ${cancelled}`} /></section>
    <section className="mt-6 rounded-3xl border border-slate-700 bg-[#18253a] p-5"><h2 className="font-bold">Giao dịch trong ca</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Mã hóa đơn</th><th>Thời gian</th><th>Trạng thái</th><th>Số dòng</th><th>Tổng tiền</th></tr></thead><tbody className="divide-y divide-slate-800">{rows.map((invoice) => <tr key={invoice.id}><td className="py-3 font-semibold text-cyan-200">{invoice.code}</td><td>{new Date(invoice.created_at).toLocaleTimeString("vi-VN")}</td><td>{statusText(invoice.status)}</td><td>{invoice.items.length}</td><td>{money(invoice.total_amount)}</td></tr>)}</tbody></table></div></section>
  </CashierShell>;
}

export function CashierAssistantPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const assistant = useMutation({
    mutationFn: () => cashierAssistantRequest(token, message),
    onSuccess: (result) => setAnswer(result.answer),
    onError: (error) => setAnswer(error instanceof Error ? error.message : "Không thể nhận phản hồi AI."),
  });

  const samples = ["Quy trình bán thuốc tại quầy gồm các bước nào?", "Thu ngân nên chọn lô theo FEFO như thế nào?", "Khi hóa đơn nháp cần hủy thì làm gì?", "Cách kiểm tra tồn kho trước khi thanh toán?"];

  return <CashierShell title="AI hỗ trợ Thu ngân">
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <section className="rounded-3xl border border-slate-700 bg-[#18253a] p-5"><h2 className="font-bold">Câu hỏi gợi ý</h2><div className="mt-4 space-y-2">{samples.map((sample) => <button key={sample} onClick={() => setMessage(sample)} className="w-full rounded-xl border border-slate-700 bg-slate-950/20 p-3 text-left text-sm hover:border-cyan-500">{sample}</button>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">AI chỉ hỗ trợ quy trình nghiệp vụ. Câu hỏi chẩn đoán, kê đơn hoặc liều dùng phải chuyển cho Dược sĩ/Bác sĩ.</p></section>
      <section className="rounded-3xl border border-slate-700 bg-[#18253a] p-5"><textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hỏi về bán hàng, hóa đơn, FEFO, mã vạch, tồn kho, ca bán..." className="w-full rounded-xl border border-slate-700 bg-slate-950/30 p-4 outline-none focus:border-cyan-500" /><button disabled={message.trim().length < 2 || assistant.isPending} onClick={() => assistant.mutate()} className="mt-3 rounded-xl bg-cyan-500 px-5 py-2.5 font-bold text-slate-950 disabled:opacity-40">{assistant.isPending ? "Đang hỏi..." : "Hỏi AI"}</button>{answer && <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950/25 p-4 text-sm leading-7 text-slate-200">{answer}</div>}</section>
    </div>
  </CashierShell>;
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-cyan-200">{value}</p></div>;
}
