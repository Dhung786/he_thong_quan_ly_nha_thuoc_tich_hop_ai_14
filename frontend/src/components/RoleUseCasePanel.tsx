import { Link } from "react-router-dom";

import type { RoleUseCase } from "../lib/role-use-cases";

export function RoleUseCasePanel({
  title,
  subtitle,
  useCases,
}: {
  title: string;
  subtitle: string;
  useCases: RoleUseCase[];
}) {
  return (
    <section className="rounded-3xl border border-slate-700/70 bg-[#12243b] p-5 shadow-xl shadow-slate-950/10 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">SRS v1.0</p>
          <h2 className="mt-1 text-xl font-bold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-xs font-semibold text-slate-400">
          {useCases.length} Use Case
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {useCases.map((useCase) => (
          <Link
            key={useCase.id}
            to={useCase.to}
            className="group rounded-2xl border border-slate-700/70 bg-slate-950/20 p-4 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:bg-slate-950/35"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-black text-cyan-300">
                  {useCase.id}
                </span>
                <h3 className="mt-3 font-bold text-slate-100 group-hover:text-cyan-300">{useCase.name}</h3>
              </div>
              <StatusBadge status={useCase.status} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{useCase.description}</p>
            <p className="mt-4 text-xs font-semibold text-cyan-400">Mở chức năng →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: RoleUseCase["status"] }) {
  const style =
    status === "ready"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "partial"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-slate-700 bg-slate-900/70 text-slate-500";
  const label = status === "ready" ? "Đã có" : status === "partial" ? "Một phần" : "Chờ backend";

  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${style}`}>{label}</span>;
}
