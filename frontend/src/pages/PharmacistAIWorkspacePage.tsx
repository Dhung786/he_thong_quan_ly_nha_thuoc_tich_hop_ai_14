import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import type { Medicine } from "../lib/api";
import {
  managerAIStatusRequest,
  managerExpiryAIReportRequest,
  managerInternalChatRequest,
  managerMedicineSummaryRequest,
  type ManagerAIStatus,
  type ManagerAITextResponse,
} from "../lib/manager-ai-api";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";

type AITask = "medicine" | "expiry" | "chat";

export function PharmacistAIWorkspacePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken;
  const [status, setStatus] = useState<ManagerAIStatus | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineId, setMedicineId] = useState("");
  const [warningDays, setWarningDays] = useState("30");
  const [chatMessage, setChatMessage] = useState(
    "Quy trình kiểm tra thuốc sắp hết hạn như thế nào?",
  );
  const [activeTask, setActiveTask] = useState<AITask>("medicine");
  const [result, setResult] = useState<ManagerAITextResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = status?.configured ?? false;
  const localDemo = status?.provider === "local_demo";
  const selectedMedicine = useMemo(
    () => medicines.find((medicine) => medicine.id === Number(medicineId)),
    [medicines, medicineId],
  );

  useEffect(() => {
    if (!accessToken || auth.user?.role !== "PHARMACIST") return;

    void Promise.all([
      managerAIStatusRequest(accessToken),
      pharmacistMedicineLookupRequest(accessToken),
    ])
      .then(([aiStatus, medicineRows]) => {
        setStatus(aiStatus);
        setMedicines(medicineRows);
        setMedicineId((current) => current || String(medicineRows[0]?.id ?? ""));
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu AI.");
      });
  }, [accessToken, auth.user?.role]);

  if (auth.user?.role !== "PHARMACIST") {
    return <Navigate to="/dashboard" replace />;
  }

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

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  function chooseTask(task: AITask) {
    setActiveTask(task);
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">AI Dược sĩ</h1>
            <p className="mt-1 text-xs text-slate-500">Scope Guard đang bật · AI chỉ hỗ trợ tham khảo</p>
          </div>
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
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">
                    Trợ lý thông minh
                  </p>
                  <h2 className="mt-2 text-3xl font-bold">AI Dược sĩ</h2>
                  <p className="mt-3 leading-7 text-slate-400">
                    Tóm tắt dữ liệu thuốc, tạo báo cáo hạn sử dụng và hỏi đáp quy trình nội bộ.
                    Kết quả không thay thế quyết định chuyên môn của dược sĩ hoặc bác sĩ.
                  </p>
                </div>
                <div
                  className={`rounded-2xl border px-5 py-4 ${
                    configured
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-amber-500/30 bg-amber-500/10"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      configured ? "text-emerald-300" : "text-amber-200"
                    }`}
                  >
                    {configured
                      ? localDemo
                        ? "AI nội bộ đã sẵn sàng"
                        : "AI đã kết nối"
                      : "AI chưa được cấu hình"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Provider: {status?.provider ?? "đang kiểm tra"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Model: {status?.model ?? "chưa chọn"}
                  </p>
                  <p className="text-xs text-sky-300">
                    Scope Guard: {status?.scope_guard ?? "đang kiểm tra"}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                <h3 className="font-bold text-slate-100">Thao tác chính</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => chooseTask("medicine")}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTask === "medicine"
                        ? "border-sky-400 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-600"
                    }`}
                  >
                    Tóm tắt thông tin thuốc
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseTask("expiry")}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTask === "expiry"
                        ? "border-sky-400 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-600"
                    }`}
                  >
                    Xem báo cáo hạn dùng
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseTask("chat")}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTask === "chat"
                        ? "border-sky-400 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-600"
                    }`}
                  >
                    Hỏi AI
                  </button>
                </div>
              </div>
            </section>

            {localDemo && (
              <section className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5 text-sm leading-6 text-violet-100">
                Hệ thống đang dùng chế độ AI nội bộ để bạn có thể chạy chức năng ngay cả khi chưa có
                khóa API. Chế độ này tổng hợp dữ liệu PostgreSQL và trả lời quy trình bằng luật an
                toàn. Khi cấu hình provider thật, giao diện sẽ tự chuyển sang mô hình AI đã chọn.
              </section>
            )}

            {activeTask === "medicine" && (
              <section className="rounded-2xl border border-slate-700 bg-[#142238] p-6">
                <h3 className="text-xl font-bold">Tóm tắt thông tin thuốc</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Chọn một thuốc trong danh mục. Hệ thống chỉ tóm tắt dữ liệu quản lý hiện có.
                </p>
                <label className="mt-5 block text-sm font-semibold text-slate-300">Chọn thuốc</label>
                <select
                  value={medicineId}
                  onChange={(event) => setMedicineId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-3"
                >
                  {medicines.map((medicine) => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.code} · {medicine.name}
                    </option>
                  ))}
                </select>
                {selectedMedicine && (
                  <p className="mt-2 text-xs text-slate-500">
                    {selectedMedicine.group_name} · {selectedMedicine.unit_name}
                  </p>
                )}
                <button
                  type="button"
                  disabled={!configured || !medicineId || busy || !accessToken}
                  onClick={() =>
                    accessToken &&
                    void run(() => managerMedicineSummaryRequest(accessToken, Number(medicineId)))
                  }
                  className="mt-5 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Đang xử lý..." : "Tạo bản tóm tắt"}
                </button>
              </section>
            )}

            {activeTask === "expiry" && (
              <section className="rounded-2xl border border-slate-700 bg-[#142238] p-6">
                <h3 className="text-xl font-bold">Báo cáo thuốc sắp hết hạn</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Chọn khoảng ngày cần theo dõi. Báo cáo lấy lô và tồn kho trực tiếp từ PostgreSQL.
                </p>
                <label className="mt-5 block text-sm font-semibold text-slate-300">
                  Khoảng cảnh báo (ngày)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={warningDays}
                  onChange={(event) => setWarningDays(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-3"
                />
                <button
                  type="button"
                  disabled={!configured || busy || !accessToken || Number(warningDays) < 1}
                  onClick={() =>
                    accessToken &&
                    void run(() => managerExpiryAIReportRequest(accessToken, Number(warningDays)))
                  }
                  className="mt-5 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Đang tạo báo cáo..." : "Tạo báo cáo"}
                </button>
              </section>
            )}

            {activeTask === "chat" && (
              <section className="rounded-2xl border border-slate-700 bg-[#142238] p-6">
                <h3 className="text-xl font-bold">Hỏi đáp quy trình nội bộ</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Hỏi về thuốc, lô, hạn sử dụng, tồn kho, bán thuốc, hóa đơn, kiểm kê hoặc quy trình.
                </p>
                <label className="mt-5 block text-sm font-semibold text-slate-300">Câu hỏi</label>
                <textarea
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-3"
                  placeholder="Ví dụ: Quy trình kiểm kê tồn kho như thế nào?"
                />
                <button
                  type="button"
                  disabled={!configured || busy || chatMessage.trim().length < 2 || !accessToken}
                  onClick={() =>
                    accessToken &&
                    void run(() => managerInternalChatRequest(accessToken, chatMessage.trim()))
                  }
                  className="mt-5 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "AI đang trả lời..." : "Gửi câu hỏi"}
                </button>
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-700/40 bg-red-950/30 p-5 text-sm text-red-200">
                {error}
              </section>
            )}

            {result && (
              <section className="rounded-2xl border border-slate-700 bg-[#142238] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">Kết quả</h3>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      result.scope_guard === "passed"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    Scope Guard: {result.scope_guard}
                  </span>
                </div>
                <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/30 p-5 leading-7 text-slate-200">
                  {result.answer}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>Provider: {result.provider}</span>
                  <span>Model: {result.model ?? "—"}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{result.disclaimer}</p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
