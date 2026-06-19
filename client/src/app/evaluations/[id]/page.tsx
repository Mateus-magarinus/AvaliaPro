"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, PlayCircle } from "lucide-react";
import ResultsViews from "@/components/results/ResultsViews";
import UserMenu from "@/components/dashboard/UserMenu";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { EvaluationRecord, EvaluationStatus, Paginated, PropertyRecord } from "@/types/avaliapro";

export default function EvaluationResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<EvaluationRecord | null>(null);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!params?.id) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const evaluationData = await apiFetch<EvaluationRecord>(`/evaluations/${params.id}?withProperties=true`);
      const list = await apiFetch<Paginated<PropertyRecord>>(`/properties?evaluationId=${params.id}&page=1&limit=70`);
      setEvaluation(evaluationData);
      setProperties(list.items?.length ? list.items : evaluationData.properties ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível carregar a avaliação.");
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    load();
  }, [load]);

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  function handlePropertyUpdated(updated: PropertyRecord) {
    setProperties((current) =>
      current.map((property) => (property.id === updated.id ? { ...property, ...updated } : property)),
    );
  }

  function handleStatusChanged(status: EvaluationStatus) {
    setEvaluation((current) => (current ? { ...current, status } : current));
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-28 lg:px-8">
          <Link href="/" aria-label="Início" className="flex items-center gap-3 text-[#062650]">
            <Image src="/images/logo_rd.png" alt="AvaliaPro" width={120} height={120} className="h-20 w-auto object-contain lg:h-24" priority />
            <span className="inline-flex items-center gap-1 text-sm font-semibold sm:hidden">
              <ArrowLeft className="h-4 w-4" />
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#062650] px-4 py-3 text-sm font-semibold text-white"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Nova avaliação</span>
              <span className="sm:hidden">Nova</span>
            </button>
            <UserMenu onLogout={logout} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid min-h-[420px] place-items-center text-[#062650]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : evaluation ? (
          <ResultsViews
            evaluation={evaluation}
            properties={properties}
            onPropertyUpdated={handlePropertyUpdated}
            onStatusChanged={handleStatusChanged}
          />
        ) : null}
      </div>
    </main>
  );
}
