import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "../auth/auth-context";
import {
  ApiError,
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

const namedSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống"),
});

const medicineSchema = z.object({
  code: z.string().trim().min(1, "Mã thuốc không được để trống"),
  name: z.string().trim().min(1, "Tên thuốc không được để trống"),
  group_id: z.coerce.number().int().positive("Hãy chọn nhóm thuốc"),
  unit_id: z.coerce.number().int().positive("Hãy chọn đơn vị tính"),
});

type NamedForm = z.infer<typeof namedSchema>;
type MedicineForm = z.infer<typeof medicineSchema>;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    const suffix = error.correlationId ? ` (mã hỗ trợ: ${error.correlationId})` : "";
    if (error.code === "medicine_code_exists") return `Mã thuốc đã tồn tại${suffix}`;
    if (error.code === "medicine_group_in_use") return `Nhóm thuốc đang được sử dụng${suffix}`;
    if (error.code === "unit_in_use") return `Đơn vị tính đang được sử dụng${suffix}`;
    return `${error.message}${suffix}`;
  }
  return "Đã xảy ra lỗi không xác định";
}

export function MedicineCatalogPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const accessToken = auth.accessToken ?? "";
  const isManager = auth.user?.role === "MANAGER";
  const [search, setSearch] = useState("");
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

  const groupForm = useForm<NamedForm>({
    resolver: zodResolver(namedSchema),
    defaultValues: { name: "" },
  });
  const unitForm = useForm<NamedForm>({
    resolver: zodResolver(namedSchema),
    defaultValues: { name: "" },
  });
  const medicineForm = useForm<MedicineForm>({
    resolver: zodResolver(medicineSchema),
    defaultValues: { code: "", name: "", group_id: 0, unit_id: 0 },
  });

  const saveGroup = useMutation({
    mutationFn: (values: NamedForm) =>
      editingGroupId
        ? updateMedicineGroupRequest(accessToken, editingGroupId, values.name)
        : createMedicineGroupRequest(accessToken, values.name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["medicine-groups"] });
      setFeedback(editingGroupId ? "Đã cập nhật nhóm thuốc" : "Đã thêm nhóm thuốc");
      setEditingGroupId(null);
      groupForm.reset({ name: "" });
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const saveUnit = useMutation({
    mutationFn: (values: NamedForm) =>
      editingUnitId
        ? updateUnitRequest(accessToken, editingUnitId, values.name)
        : createUnitRequest(accessToken, values.name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      setFeedback(editingUnitId ? "Đã cập nhật đơn vị tính" : "Đã thêm đơn vị tính");
      setEditingUnitId(null);
      unitForm.reset({ name: "" });
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const saveMedicine = useMutation({
    mutationFn: (values: MedicineForm) =>
      editingMedicineId
        ? updateMedicineRequest(accessToken, editingMedicineId, values)
        : createMedicineRequest(accessToken, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setFeedback(editingMedicineId ? "Đã cập nhật thuốc" : "Đã thêm thuốc");
      setEditingMedicineId(null);
      medicineForm.reset({ code: "", name: "", group_id: 0, unit_id: 0 });
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  async function deleteGroup(id: number) {
    if (!window.confirm("Xóa nhóm thuốc này?")) return;
    try {
      await deleteMedicineGroupRequest(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["medicine-groups"] });
      setFeedback("Đã xóa nhóm thuốc");
    } catch (error) {
      setFeedback(errorText(error));
    }
  }

  async function deleteUnit(id: number) {
    if (!window.confirm("Xóa đơn vị tính này?")) return;
    try {
      await deleteUnitRequest(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      setFeedback("Đã xóa đơn vị tính");
    } catch (error) {
      setFeedback(errorText(error));
    }
  }

  async function deleteMedicine(id: number) {
    if (!window.confirm("Xóa thuốc này?")) return;
    try {
      await deleteMedicineRequest(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["medicines"] });
      setFeedback("Đã xóa thuốc");
    } catch (error) {
      setFeedback(errorText(error));
    }
  }

  function editMedicine(item: Medicine) {
    setEditingMedicineId(item.id);
    medicineForm.reset({
      code: item.code,
      name: item.name,
      group_id: item.group_id,
      unit_id: item.unit_id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!isManager) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">UC002</p>
          <h1 className="mt-2 text-2xl font-bold">Quản lý danh mục thuốc</h1>
          <p className="mt-4 text-slate-400">
            Theo SRS hiện tại, UC002 chỉ có tác nhân Quản lý. Tài khoản của bạn không được cấp
            chức năng này.
          </p>
          <Link className="mt-6 inline-block text-emerald-400 hover:underline" to="/dashboard">
            ← Quay lại tổng quan
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm text-emerald-400 hover:underline" to="/dashboard">
              ← Tổng quan
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              UC002
            </p>
            <h1 className="mt-1 text-3xl font-bold">Quản lý danh mục thuốc</h1>
            <p className="mt-2 text-sm text-slate-400">
              Quản lý thuốc, nhóm thuốc và đơn vị tính theo SRS Nhóm 14.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <span className="text-slate-500">Vai trò: </span>
            <strong>Quản lý</strong>
          </div>
        </div>

        {feedback && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm">
            {feedback}
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <CatalogCard title="Nhóm thuốc">
            <form className="flex gap-2" onSubmit={groupForm.handleSubmit((v) => saveGroup.mutate(v))}>
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="Tên nhóm thuốc"
                {...groupForm.register("name")}
              />
              <button className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950" type="submit">
                {editingGroupId ? "Lưu" : "Thêm"}
              </button>
            </form>
            {groupForm.formState.errors.name && (
              <p className="mt-1 text-xs text-red-400">{groupForm.formState.errors.name.message}</p>
            )}
            <div className="mt-4 space-y-2">
              {groups.data?.map((group) => (
                <div key={group.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                  <span>{group.name}</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      className="text-sky-400"
                      type="button"
                      onClick={() => {
                        setEditingGroupId(group.id);
                        groupForm.reset({ name: group.name });
                      }}
                    >
                      Sửa
                    </button>
                    <button className="text-red-400" type="button" onClick={() => void deleteGroup(group.id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CatalogCard>

          <CatalogCard title="Đơn vị tính">
            <form className="flex gap-2" onSubmit={unitForm.handleSubmit((v) => saveUnit.mutate(v))}>
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="Tên đơn vị tính"
                {...unitForm.register("name")}
              />
              <button className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950" type="submit">
                {editingUnitId ? "Lưu" : "Thêm"}
              </button>
            </form>
            {unitForm.formState.errors.name && (
              <p className="mt-1 text-xs text-red-400">{unitForm.formState.errors.name.message}</p>
            )}
            <div className="mt-4 space-y-2">
              {units.data?.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                  <span>{unit.name}</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      className="text-sky-400"
                      type="button"
                      onClick={() => {
                        setEditingUnitId(unit.id);
                        unitForm.reset({ name: unit.name });
                      }}
                    >
                      Sửa
                    </button>
                    <button className="text-red-400" type="button" onClick={() => void deleteUnit(unit.id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CatalogCard>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Thuốc</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            onSubmit={medicineForm.handleSubmit((v) => saveMedicine.mutate(v))}
          >
            <Field label="Mã thuốc" error={medicineForm.formState.errors.code?.message}>
              <input className="input" {...medicineForm.register("code")} />
            </Field>
            <Field label="Tên thuốc" error={medicineForm.formState.errors.name?.message}>
              <input className="input" {...medicineForm.register("name")} />
            </Field>
            <Field label="Nhóm thuốc" error={medicineForm.formState.errors.group_id?.message}>
              <select className="input" {...medicineForm.register("group_id")}>
                <option value={0}>Chọn nhóm</option>
                {groups.data?.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Đơn vị tính" error={medicineForm.formState.errors.unit_id?.message}>
              <select className="input" {...medicineForm.register("unit_id")}>
                <option value={0}>Chọn đơn vị</option>
                {units.data?.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <button className="h-[42px] flex-1 rounded-xl bg-emerald-500 px-4 font-semibold text-slate-950" type="submit">
                {editingMedicineId ? "Lưu thay đổi" : "Thêm thuốc"}
              </button>
              {editingMedicineId && (
                <button
                  className="h-[42px] rounded-xl border border-slate-700 px-3"
                  type="button"
                  onClick={() => {
                    setEditingMedicineId(null);
                    medicineForm.reset({ code: "", name: "", group_id: 0, unit_id: 0 });
                  }}
                >
                  Hủy
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold">Danh sách thuốc</h3>
            <input
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Tìm theo mã hoặc tên thuốc"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-3">Mã</th>
                  <th className="px-3 py-3">Tên thuốc</th>
                  <th className="px-3 py-3">Nhóm</th>
                  <th className="px-3 py-3">ĐVT</th>
                  <th className="px-3 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {medicines.data?.map((medicine) => (
                  <tr key={medicine.id} className="border-b border-slate-800/70">
                    <td className="px-3 py-3 font-mono text-xs text-emerald-300">{medicine.code}</td>
                    <td className="px-3 py-3 font-medium">{medicine.name}</td>
                    <td className="px-3 py-3 text-slate-300">{medicine.group_name}</td>
                    <td className="px-3 py-3 text-slate-300">{medicine.unit_name}</td>
                    <td className="px-3 py-3 text-right">
                      <button className="mr-3 text-sky-400" type="button" onClick={() => editMedicine(medicine)}>
                        Sửa
                      </button>
                      <button className="text-red-400" type="button" onClick={() => void deleteMedicine(medicine.id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {!medicines.isPending && medicines.data?.length === 0 && (
                  <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={5}>Không tìm thấy thuốc phù hợp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function CatalogCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
