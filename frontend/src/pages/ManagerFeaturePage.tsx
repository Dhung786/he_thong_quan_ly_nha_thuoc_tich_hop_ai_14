import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { managerDemoFeatureData } from "../lib/demo-data";
import { managerFeatureContent } from "../lib/feature-content";
import { managerInputConfig, valueForManagerColumn } from "../lib/manager-input";

interface ManagerFeaturePageProps {
  title: string;
  description: string;
  status: string;
}

interface LocalManagerData {
  fieldValues: Record<string, string>;
  rows: string[][];
}

function storageKey(title: string): string {
  return `medicare-manager-demo:${title}`;
}

function readLocalData(title: string, fallback: LocalManagerData): LocalManagerData {
  try {
    const stored = window.localStorage.getItem(storageKey(title));
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as LocalManagerData;
    if (!Array.isArray(parsed.rows) || typeof parsed.fieldValues !== "object") return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function emptyForm(fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field, ""]));
}

function formFromRow(
  fields: string[],
  columns: string[],
  row: string[],
  currentValues: Record<string, string>,
): Record<string, string> {
  const aliases: Record<string, string[]> = {
    "Mã lô": ["Mã lô", "Lô", "Lô gần nhất"],
    "Thuốc": ["Thuốc", "Tên thuốc"],
    "Tồn hiện tại": ["Tồn hiện tại", "Tồn"],
    "Tồn khả dụng": ["Tồn khả dụng", "Tồn"],
    "Số ngày còn lại": ["Số ngày còn lại", "Còn lại"],
    "Đơn vị tính": ["Đơn vị tính", "ĐVT"],
    "Tên đăng nhập": ["Tên đăng nhập", "Tài khoản"],
  };

  return Object.fromEntries(
    fields.map((field) => {
      const candidateColumns = aliases[field] ?? [field];
      for (const candidate of candidateColumns) {
        const columnIndex = columns.indexOf(candidate);
        if (columnIndex >= 0 && row[columnIndex]) return [field, row[columnIndex]];
      }
      return [field, currentValues[field] ?? ""];
    }),
  );
}

export function ManagerFeaturePage({ title, description, status }: ManagerFeaturePageProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const content = managerFeatureContent[title] ?? {
    actions: ["Xem danh sách"],
    fields: ["Thông tin"],
    columns: ["Thông tin", "Trạng thái"],
  };
  const demo = managerDemoFeatureData[title] ?? { fieldValues: {}, rows: [] };
  const inputFields = managerInputConfig[title]?.fields ?? content.fields;
  const [data, setData] = useState<LocalManagerData>(() => readLocalData(title, demo));
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => emptyForm(inputFields));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return data.rows.map((row, index) => ({ row, index }));
    return data.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.some((value) => value.toLocaleLowerCase("vi").includes(keyword)));
  }, [data.rows, search]);

  if (auth.user?.role !== "MANAGER") {
    return <Navigate to="/dashboard" replace />;
  }

  function persist(next: LocalManagerData) {
    setData(next);
    window.localStorage.setItem(storageKey(title), JSON.stringify(next));
  }

  function openAction(action: string) {
    setActiveAction(action);
    setEditingIndex(null);
    setFormValues(emptyForm(inputFields));
    setFeedback(`Đang thực hiện: ${action}. Hãy nhập thông tin bên dưới.`);
  }

  function closeForm() {
    setActiveAction(null);
    setEditingIndex(null);
    setFormValues(emptyForm(inputFields));
  }

  function updateField(field: string, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = Object.fromEntries(
      Object.entries(formValues).map(([key, value]) => [key, value.trim()]),
    );
    const missing = inputFields.find((field) => !normalized[field]);
    if (missing) {
      setFeedback(`Hãy nhập ${missing}.`);
      return;
    }

    const row = content.columns.map((column) => valueForManagerColumn(column, normalized));
    const nextRows = [...data.rows];
    if (editingIndex === null) nextRows.push(row);
    else nextRows[editingIndex] = row;

    const next: LocalManagerData = {
      fieldValues: { ...data.fieldValues, ...normalized },
      rows: nextRows,
    };
    persist(next);
    setFeedback(editingIndex === null ? "Đã thêm dữ liệu demo." : "Đã cập nhật dữ liệu demo.");
    closeForm();
  }

  function editRow(index: number) {
    const row = data.rows[index];
    setEditingIndex(index);
    setActiveAction("Cập nhật thông tin");
    setFormValues(formFromRow(inputFields, content.columns, row, data.fieldValues));
    setFeedback("Đang sửa dữ liệu. Thay đổi thông tin rồi bấm Lưu thay đổi.");
  }

  function deleteRow(index: number) {
    if (!window.confirm("Xóa dòng dữ liệu demo này?")) return;
    const next = { ...data, rows: data.rows.filter((_, rowIndex) => rowIndex !== index) };
    persist(next);
    setFeedback("Đã xóa dữ liệu demo.");
  }

  function resetDemo() {
    if (!window.confirm("Khôi phục toàn bộ dữ liệu demo ban đầu của phần này?")) return;
    window.localStorage.removeItem(storageKey(title));
    setData(demo);
    closeForm();
    setFeedback("Đã khôi phục dữ liệu demo ban đầu.");
  }

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <ManagerSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-300">MANAGER</span>
            <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold transition hover:border-red-700 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 shadow-2xl shadow-slate-950/20 sm:p-9">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">DỮ LIỆU DEMO CÓ THỂ NHẬP</div>
                  <h2 className="text-3xl font-bold">{title}</h2>
                  <p className="mt-3 leading-7 text-slate-400">{description}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{status}</div>
              </div>

              {feedback && (
                <div className="mt-6 rounded-2xl border border-sky-700/30 bg-sky-950/30 px-5 py-3 text-sm text-sky-200">{feedback}</div>
              )}

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold text-slate-100">Thao tác chính</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {content.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => openAction(action)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${activeAction === action ? "border-sky-500 bg-sky-500/15 text-sky-200" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-600 hover:bg-slate-800"}`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">Bấm một thao tác để mở form nhập. Dữ liệu được lưu trên trình duyệt hiện tại.</p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
                  <h3 className="font-bold text-slate-100">Thông tin cần quản lý</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {content.fields.map((field) => (
                      <div key={field} className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">{field}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-200">{data.fieldValues[field] ?? "Chưa có dữ liệu"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {activeAction && (
                <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-sky-700/40 bg-[#102039] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-sky-400">{editingIndex === null ? "Nhập dữ liệu" : "Sửa dữ liệu"}</p>
                      <h3 className="mt-1 text-xl font-bold">{activeAction}</h3>
                    </div>
                    <button type="button" onClick={closeForm} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Đóng</button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {inputFields.map((field) => (
                      <label key={field} className="block text-sm">
                        <span className="mb-1.5 block font-semibold text-slate-300">{field}</span>
                        <input
                          value={formValues[field] ?? ""}
                          onChange={(event) => updateField(field, event.target.value)}
                          placeholder={`Nhập ${field.toLocaleLowerCase("vi")}`}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/55 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="submit" className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400">
                      {editingIndex === null ? "Lưu dữ liệu" : "Lưu thay đổi"}
                    </button>
                    <button type="button" onClick={() => setFormValues(emptyForm(inputFields))} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Xóa nội dung form</button>
                  </div>
                </form>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700">
                <div className="flex flex-col gap-3 border-b border-slate-700 bg-slate-950/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-100">Danh sách dữ liệu</h3>
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">Demo · {data.rows.length} dòng</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong bảng..." className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                    <button type="button" onClick={resetDemo} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Khôi phục demo</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-950/20 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {content.columns.map((column) => <th key={column} className="px-5 py-3">{column}</th>)}
                        <th className="px-5 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {visibleRows.length ? visibleRows.map(({ row, index }) => (
                        <tr key={`${title}-${index}`} className="hover:bg-slate-900/35">
                          {content.columns.map((column, columnIndex) => <td key={`${column}-${columnIndex}`} className="px-5 py-4 text-slate-300">{row[columnIndex] ?? "—"}</td>)}
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <button type="button" onClick={() => editRow(index)} className="mr-3 text-sky-400 hover:text-sky-300">Sửa</button>
                            <button type="button" onClick={() => deleteRow(index)} className="text-rose-400 hover:text-rose-300">Xóa</button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={content.columns.length + 1} className="px-5 py-10 text-center text-slate-500">Không có dữ liệu phù hợp.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {content.note && <div className="mt-6 rounded-2xl border border-sky-700/30 bg-sky-950/25 px-5 py-4 text-sm leading-6 text-sky-200/90">{content.note}</div>}

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/dashboard" className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400">← Về Dashboard</Link>
                <Link to="/catalog" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">Mở quản lý thuốc</Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
