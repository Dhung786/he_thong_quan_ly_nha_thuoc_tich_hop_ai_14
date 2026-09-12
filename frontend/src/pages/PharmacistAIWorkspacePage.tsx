import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";
import {
  managerAIStatusRequest,
  managerExpiryAIReportRequest,
  managerInternalChatRequest,
  managerMedicineSummaryRequest,
  type ManagerAIStatus,
  type ManagerAITextResponse,
} from "../lib/manager-ai-api";

export function PharmacistAIWorkspacePage({ processOnly = false }: { processOnly?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ManagerAIStatus | null>(null);
  const [medicines, setMedicines] = useState<Array<{ id: number; code: string; name: string; group_name: string; unit_name: string }>>([]);
  const [medicineId, setMedicineId] = useState("");
  const [warningDays, setWarningDays] = useState("30");
  const [chatMessage, setChatMessage] = useState("");
  const [result, setResult] = useState<ManagerAITextResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = auth.accessToken;
  const configured = status?.configured ?? false;
  const selectedMedicine = useMemo(
    () => medicines.find((medicine) => medicine.id === Number(medicineId)),
    [medicines, medicineId],
  );

  useEffect(() => {
    if (!accessToken || auth.user?.role !== "PHARMACIST") return;
    void Promise.all([
      managerAIStatusRequest(accessToken),
      pharmacistMedicineLookupRequest(accessToken, ""),
    ])
      .then(([aiStatus, medicineRows]) => {
        setStatus(aiStatus);
        setMedicines(medicineRows);
        if (medicineRows.length) {
          setMedicineId((current) => current || String(medicineRows[0].id));
        }
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Không thể tải trạng thái AI.");
      });
  }, [accessToken, auth.user?.role]);

  if (auth.user?.role !== "PHARMACIST") return <Navigate to="/dashboard" replace />;

  async function run(task: () => Promise<ManagerAITextResponse>) {
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
            <h1 className="text-xl font-bold sm:text-2xl">{processOnly ? "Quy trình nội bộ" : "AI Dược sĩ"}</h1>
            <p className="mt-1 text-xs text-slate-500">AI chỉ hỗ trợ tham khảo · không chẩn đoán, kê đơn hoặc thay đổi dữ liệu</p>
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">
            Đăng xuất
          </button>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 sm:p-9">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">DƯỢC SĨ · AI CÓ KIỂM SOÁT</p>
                  <h2 className="mt-2 text-3xl font-bold">{processOnly ? "Hỏi đáp quy trình nhà thuốc" : "Trợ lý AI cho Dược sĩ"}</h2>
                  <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                    {processOnly
                      ? "Hỏi các quy trình nội bộ như kiểm kê, kiểm tra lô, xử lý thuốc hết hạn và thao tác nghiệp vụ được phép."
                      : "Tóm tắt dữ liệu thuốc, tạo báo cáo lô sắp hết hạn và hỏi đáp quy trình nội bộ dựa trên dữ liệu hệ thống."}
                  </p>
                </div>
                <div className={`rounded-2xl border px-5 py-4 ${configured ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                  <p className={`text-sm font-bold ${configured ? "text-emerald-300" : "text-amber-200"}`}>
                    {configured ? "AI sẵn sàng" : "AI chưa được cấu hình"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Provider: {status?.provider ?? "đang kiểm tra"}</p>
                  <p className="text-xs text-slate-400">Model: {status?.model ?? "chưa chọn"}</p>
                  <p className="text-xs text-cyan-300">Scope Guard: {status?.scope_guard ?? "đang kiểm tra"}</p>
                </div>
              </div>
            </section>

            {!processOnly && (
              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-[#142238] p-5">
                  <h3 className="text-lg font-bold">Tóm tắt thông tin thuốc</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Chỉ dùng dữ liệu quản lý đang lưu trong hệ thống, không tự bổ sung chỉ định hoặc liều dùng.</p>
                  <label className="mt-5 block text-sm font-semibold text-slate-300">Chọn thuốc</label>
                  <select value={medicineId} onChange={(event) => setMedicineId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5">
                    {medicines.map((medicine) => (
                      <option key={medicine.id} value={medicine.id}>{medicine.code} · {medicine.name}</option>
                    ))}
                  </select>
                  {selectedMedicine && <p className="mt-2 text-xs text-slate-500">{selectedMedicine.group_name} · {selectedMedicine.unit_name}</p>}
                  <button disabled={!configured || !medicineId || busy || !accessToken} onClick={() => accessToken && void run(() => managerMedicineSummaryRequest(accessToken, Number(medicineId)))} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                    Tạo bản tóm tắt
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-[#142238] p-5">
                  <h3 className="text-lg font-bold">Báo cáo thuốc sắp hết hạn</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">AI tổng hợp dữ liệu lô và tồn kho, nhưng không tự động sửa số lượng hoặc trạng thái lô.</p>
                  <label className="mt-5 block text-sm font-semibold text-slate-300">Khoảng cảnh báo (ngày)</label>
                  <input type="number" min={1} max={365} value={warningDays} onChange={(event) => setWarningDays(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5" />
                  <button disabled={!configured || busy || !accessToken} onClick={() => accessToken && void run(() => managerExpiryAIReportRequest(accessToken, Number(warningDays)))} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                    Tạo báo cáo AI
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-700 bg-[#142238] p-5">
              <h3 className="text-lg font-bold">Hỏi quy trình nội bộ</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Ví dụ: quy trình kiểm kê, kiểm tra lô sắp hết hạn, xử lý thuốc hết hạn hoặc tra cứu nghiệp vụ bán thuốc.</p>
              <textarea value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} rows={5} placeholder="Nhập câu hỏi quy trình..." className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-3" />
              <button disabled={!configured || busy || chatMessage.trim().length < 2 || !accessToken} onClick={() => accessToken && void run(() => managerInternalChatRequest(accessToken, chatMessage.trim()))} className="mt-4 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                Hỏi AI
              </button>
            </section>

            {!configured && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
                AI provider chưa được cấu hình ở backend. Các nút AI sẽ tự hoạt động khi cấu hình AI hợp lệ được thêm vào môi trường chạy.
              </section>
            )}

            {error && <div className="rounded-2xl border border-red-700/40 bg-red-950/30 p-5 text-sm text-red-200">{error}</div>}
            {busy && <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-5 text-sm text-cyan-200">AI đang xử lý yêu cầu...</div>}
            {result && (
              <section className="rounded-2xl border border-slate-700 bg-[#142238] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">Kết quả AI</h3>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${result.scope_guard === "passed" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                    Scope Guard: {result.scope_guard}
                  </span>
                </div>
                <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/30 p-5 leading-7 text-slate-200">{result.answer}</div>
                <p className="mt-4 text-xs leading-5 text-slate-500">{result.disclaimer}</p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
