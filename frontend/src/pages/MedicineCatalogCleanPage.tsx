import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import {
  createMedicineGroupRequest,
  createMedicineRequest,
  createUnitRequest,
  deleteMedicineGroupRequest,
  deleteMedicineRequest,
  deleteUnitRequest,
  medicineGroupsRequest,
  medicinesRequest,
  unitsRequest,
  updateMedicineGroupRequest,
  updateMedicineRequest,
  updateUnitRequest,
  type Medicine,
} from "../lib/api";

type MedicineDraft = {
  code: string;
  name: string;
  group_id: number;
  unit_id: number;
};

const emptyMedicine: MedicineDraft = { code: "", name: "", group_id: 0, unit_id: 0 };

export function MedicineCatalogCleanPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = auth.accessToken ?? "";
  const isManager = auth.user?.role === "MANAGER";

  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [medicine, setMedicine] = useState<MedicineDraft>(emptyMedicine);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const groups = useQuery({
    queryKey: ["medicine-groups"],
    queryFn: () => medicineGroupsRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
  });

  const units = useQuery({
    queryKey: ["units"],
    queryFn: () => unitsRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
  });

  const medicines = useQuery({
    queryKey: ["medicines", search],
    queryFn: () => medicinesRequest(accessToken, { q: search }),
    enabled: isManager && Boolean(accessToken),
  });

  const saveGroup = useMutation({
    mutationFn: () =>
      editingGroupId
        ? updateMedicineGroupRequest(accessToken, editingGroupId, groupName.trim())
        : createMedicineGroupRequest(accessToken, groupName.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["medicine-groups"] });
      setFeedback(editingGroupId ? "Đã cập nhật nhóm thuốc" : "Đã thêm nhóm thuốc");
      setEditingGroupId(null);
      setGroupName("");
    },
    onError: () => setFeedback("Không thể lưu nhóm thuốc"),
  });

  const saveUnit = useMutation({
    mutationFn: () =>
      editingUnitId
        ? updateUnitRequest(accessToken, editingUnitId, unitName.trim())
        : createUnitRequest(accessToken, unitName.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      setFeedback(editingUnitId ? "Đã cập nhật đơn vị tính" : "Đã thêm đơn vị tính");
      setEditingUnitId(null);
      setUnitName("");
    },
    onError: () => setFeedback("Không thể lưu đơn vị tính"),
  });

  const saveMedicine = useMutation({
    mutationFn: () =>
      editingMedicineId
        ? updateMedicineRequest(accessToken, editingMedicineId, medicine)
        : createMedicineRequest(accessToken, medicine),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setFeedback(editingMedicineId ? "Đã cập nhật thuốc" : "Đã thêm thuốc");
      setEditingMedicineId(null);
      setMedicine(emptyMedicine);
    },
    onError: () => setFeedback("Không thể lưu thuốc. Hãy kiểm tra dữ liệu và mã thuốc."),
  });

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  async function handleDeleteGroup(id: number) {
    if (!window.confirm("Xóa nhóm thuốc này?")) return;
    try {
      await deleteMedicineGroupRequest(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["medicine-groups"] });
      setFeedback("Đã xóa nhóm thuốc");
    } catch {
      setFeedback("Không thể xóa nhóm thuốc đang được sử dụng");
    }
  }

  async function handleDeleteUnit(id: number) {
    if (!window.confirm("Xóa đơn vị tính này?")) return;
    try {
      await deleteUnitRequest(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      setFeedback("Đã xóa đơn vị tính");
    } catch {
      setFeedback("Không thể xóa đơn vị tính đang được sử dụng");
    }
  }

  async function handleDeleteMedicine(id: number) {
    if (!window.confirm("Xóa thuốc này?")) return;
    try {
      await deleteMedicineRequest(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setFeedback("Đã xóa thuốc");
    } catch {
      setFeedback("Không thể xóa thuốc");
    }
  }

  function startEditMedicine(item: Medicine) {
    setEditingMedicineId(item.id);
    setMedicine({
      code: item.code,
      name: item.name,
      group_id: item.group_id,
      unit_id: item.unit_id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <ManagerSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">Quản lý thuốc</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-sky-700/60 bg-sky-900/20 px-3 py-2 text-xs font-semibold text-sky-300">MANAGER</span>
            <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>

        <main className="space-y-6 p-5 sm:p-8 lg:p-10">
          {feedback && <div className="rounded-2xl border border-slate-700 bg-[#18253a] px-5 py-4 text-sm text-slate-200">{feedback}</div>}

          <section className="grid gap-6 xl:grid-cols-2">
            <CatalogBox title="Nhóm thuốc">
              <div className="flex gap-2">
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Tên nhóm thuốc" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 outline-none focus:border-sky-500" />
                <button type="button" disabled={!groupName.trim() || saveGroup.isPending} onClick={() => saveGroup.mutate()} className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{editingGroupId ? "Lưu" : "Thêm"}</button>
              </div>
              <div className="mt-4 space-y-2">
                {groups.data?.map((group) => (
                  <div key={group.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/25 px-3 py-2">
                    <span>{group.name}</span>
                    <div className="flex gap-3 text-xs">
                      <button type="button" className="text-sky-300" onClick={() => { setEditingGroupId(group.id); setGroupName(group.name); }}>Sửa</button>
                      <button type="button" className="text-rose-400" onClick={() => void handleDeleteGroup(group.id)}>Xóa</button>
                    </div>
                  </div>
                ))}
                {!groups.isPending && (groups.data?.length ?? 0) === 0 && <EmptyText />}
              </div>
            </CatalogBox>

            <CatalogBox title="Đơn vị tính">
              <div className="flex gap-2">
                <input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Tên đơn vị tính" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 outline-none focus:border-sky-500" />
                <button type="button" disabled={!unitName.trim() || saveUnit.isPending} onClick={() => saveUnit.mutate()} className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{editingUnitId ? "Lưu" : "Thêm"}</button>
              </div>
              <div className="mt-4 space-y-2">
                {units.data?.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/25 px-3 py-2">
                    <span>{unit.name}</span>
                    <div className="flex gap-3 text-xs">
                      <button type="button" className="text-sky-300" onClick={() => { setEditingUnitId(unit.id); setUnitName(unit.name); }}>Sửa</button>
                      <button type="button" className="text-rose-400" onClick={() => void handleDeleteUnit(unit.id)}>Xóa</button>
                    </div>
                  </div>
                ))}
                {!units.isPending && (units.data?.length ?? 0) === 0 && <EmptyText />}
              </div>
            </CatalogBox>
          </section>

          <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">Thông tin thuốc</h2>
                <p className="mt-1 text-sm text-slate-500">Thêm hoặc cập nhật mã thuốc, tên thuốc, nhóm thuốc và đơn vị tính.</p>
              </div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã hoặc tên thuốc" className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-sky-500 xl:max-w-sm" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Mã thuốc"><input value={medicine.code} onChange={(event) => setMedicine((current) => ({ ...current, code: event.target.value }))} className="input" /></Field>
              <Field label="Tên thuốc"><input value={medicine.name} onChange={(event) => setMedicine((current) => ({ ...current, name: event.target.value }))} className="input" /></Field>
              <Field label="Nhóm thuốc"><select value={medicine.group_id} onChange={(event) => setMedicine((current) => ({ ...current, group_id: Number(event.target.value) }))} className="input"><option value={0}>Chọn nhóm</option>{groups.data?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field>
              <Field label="Đơn vị tính"><select value={medicine.unit_id} onChange={(event) => setMedicine((current) => ({ ...current, unit_id: Number(event.target.value) }))} className="input"><option value={0}>Chọn đơn vị</option>{units.data?.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
              <div className="flex items-end gap-2">
                <button type="button" disabled={!medicine.code.trim() || !medicine.name.trim() || medicine.group_id <= 0 || medicine.unit_id <= 0 || saveMedicine.isPending} onClick={() => saveMedicine.mutate()} className="h-[42px] flex-1 rounded-xl bg-sky-500 px-4 font-semibold text-slate-950 disabled:opacity-50">{editingMedicineId ? "Lưu" : "Thêm thuốc"}</button>
                {editingMedicineId && <button type="button" onClick={() => { setEditingMedicineId(null); setMedicine(emptyMedicine); }} className="h-[42px] rounded-xl border border-slate-700 px-3">Hủy</button>}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-700">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950/30 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên thuốc</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Đơn vị</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {medicines.data?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-mono text-sky-300">{item.code}</td>
                      <td className="px-4 py-3 font-semibold">{item.name}</td>
                      <td className="px-4 py-3 text-slate-400">{item.group_name}</td>
                      <td className="px-4 py-3 text-slate-400">{item.unit_name}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-3 text-xs"><button type="button" className="text-sky-300" onClick={() => startEditMedicine(item)}>Sửa</button><button type="button" className="text-rose-400" onClick={() => void handleDeleteMedicine(item.id)}>Xóa</button></div></td>
                    </tr>
                  ))}
                  {!medicines.isPending && (medicines.data?.length ?? 0) === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Chưa có thuốc phù hợp.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function CatalogBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6"><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function EmptyText() {
  return <p className="rounded-xl border border-dashed border-slate-700 px-3 py-4 text-center text-sm text-slate-500">Chưa có dữ liệu.</p>;
}
