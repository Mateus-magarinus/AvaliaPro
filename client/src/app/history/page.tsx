"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Search } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { EvaluationRecord, EvaluationStatus, Paginated } from "@/types/avaliapro";

type SortOption = "date" | "name" | "status";

const PAGE_SIZE = 3;

const statusCopy: Record<EvaluationStatus, { label: string; className: string }> = {
  draft: { label: "Em progresso", className: "border border-[#062650] bg-transparent" },
  confirmed: { label: "Finalizado", className: "bg-[#062650]" },
  archived: { label: "Arquivado", className: "bg-slate-400" },
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function propertiesCount(evaluation: EvaluationRecord) {
  return evaluation.propertyCount ?? evaluation.properties?.length ?? 0;
}

function sortParams(sort: SortOption) {
  if (sort === "name") return { sortBy: "name", sortDir: "ASC" };
  if (sort === "status") return { sortBy: "status", sortDir: "ASC" };
  return { sortBy: "createdAt", sortDir: "DESC" };
}

export default function EvaluationHistoryPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("date");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthReady(true);
  }, [router]);

  const load = useCallback(async () => {
    if (!authReady) return;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        withPropertyCount: "true",
        ...sortParams(sort),
      });
      if (search) params.set("q", search);

      const data = await apiFetch<Paginated<EvaluationRecord>>(`/evaluations?${params.toString()}`);
      setEvaluations(uniqueEvaluations(data.items ?? []));
      setTotal(data.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, [authReady, page, router, search, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageLabel = useMemo(() => `${Math.min(page, totalPages)} de ${totalPages}`, [page, totalPages]);

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  function startEvaluation() {
    router.push("/");
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-[#062650]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <DashboardShell activeItem="history" onLogout={logout} onStartEvaluation={startEvaluation}>
      <section className="mx-auto max-w-5xl space-y-8">
        <h1 className="text-2xl font-bold text-[#062650] sm:text-3xl">Histórico de avaliações</h1>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={submitSearch} className="relative w-full max-w-lg">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#062650]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Pesquisar"
              className="h-12 w-full rounded-md border border-[#062650] bg-white pl-12 pr-4 text-base text-[#062650] outline-none focus:ring-2 focus:ring-[#9db8ca]"
            />
          </form>

          <label className="flex items-center gap-3 text-xs font-bold text-[#062650]">
            Ordenar por:
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortOption);
                setPage(1);
              }}
              className="rounded-full border border-[#062650] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#9db8ca]"
            >
              <option value="date">Data</option>
              <option value="name">Nome</option>
              <option value="status">Status</option>
            </select>
          </label>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-5">
          {loading ? (
            <div className="grid min-h-[288px] place-items-center text-[#062650]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : evaluations.length ? (
            evaluations.map((evaluation) => <EvaluationHistoryCard key={evaluation.id} evaluation={evaluation} onEdit={() => router.push(`/evaluations/${evaluation.id}`)} />)
          ) : (
            <div className="grid min-h-[210px] place-items-center rounded-md border border-slate-200 bg-[#e8f5f8] px-4 text-center text-sm text-[#062650] shadow-md">
              Nenhuma avaliação encontrada.
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pt-3 text-[#062650]">
          <PaginationButton label="Primeira página" disabled={page <= 1 || loading} onClick={() => goToPage(1)}>
            <ChevronsLeft className="h-6 w-6" />
          </PaginationButton>
          <PaginationButton label="Página anterior" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
            <ChevronLeft className="h-6 w-6" />
          </PaginationButton>
          <span className="min-w-16 text-center text-xl font-bold">{pageLabel}</span>
          <PaginationButton label="Próxima página" disabled={page >= totalPages || loading} onClick={() => goToPage(page + 1)}>
            <ChevronRight className="h-6 w-6" />
          </PaginationButton>
          <PaginationButton label="Última página" disabled={page >= totalPages || loading} onClick={() => goToPage(totalPages)}>
            <ChevronsRight className="h-6 w-6" />
          </PaginationButton>
        </div>
      </section>
    </DashboardShell>
  );
}

function EvaluationHistoryCard({ evaluation, onEdit }: { evaluation: EvaluationRecord; onEdit: () => void }) {
  const status = statusCopy[evaluation.status] ?? statusCopy.draft;

  return (
    <article className="grid gap-4 rounded-md bg-[#e1f3f8] px-5 py-5 text-[#062650] shadow-md sm:px-7 lg:grid-cols-[1.4fr_0.8fr_auto] lg:items-center">
      <div>
        <h2 className="text-lg font-bold">{evaluation.name}</h2>
        <dl className="mt-4 space-y-0.5 text-base leading-tight">
          <div>
            <dt className="inline font-bold">Imóveis:</dt>{" "}
            <dd className="inline">{String(propertiesCount(evaluation)).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt className="inline font-bold">Data:</dt> <dd className="inline">{formatDate(evaluation.createdAt)}</dd>
          </div>
          <div>
            <dt className="inline font-bold">Avaliação:</dt>{" "}
            <dd className="inline">{String(evaluation.id).padStart(2, "0")}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center gap-3 text-xs font-bold">
        <span className={["h-4 w-4 rounded-full", status.className].join(" ")} />
        {status.label}
      </div>

      <button onClick={onEdit} className="inline-flex h-10 min-w-24 items-center justify-center rounded-md bg-[#062650] px-5 text-sm font-bold text-white">
        Editar
      </button>
    </article>
  );
}

function PaginationButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md text-[#062650] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function uniqueEvaluations(items: EvaluationRecord[]) {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
