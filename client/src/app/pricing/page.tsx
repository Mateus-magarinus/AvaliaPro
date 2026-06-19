"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import type { PlanRecord, QuotaStatus } from "@/types/avaliapro";

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    "5 avaliações por mês",
    "Exportação em Excel e CSV",
    "Histórico de avaliações",
    "Suporte padrão",
  ],
  standard: [
    "30 avaliações por mês",
    "Exportação em Excel e CSV",
    "Histórico completo",
    "Suporte prioritário",
    "Relatórios estatísticos",
  ],
  premium: [
    "Avaliações ilimitadas",
    "Exportação em Excel e CSV",
    "Histórico completo",
    "Suporte prioritário",
    "Relatórios avançados",
    "API de integração (em breve)",
  ],
};

const PLAN_ORDER = ["basic", "standard", "premium"];

function formatPrice(price: number) {
  if (price === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function formatSearches(n: number) {
  if (n === -1) return "Ilimitadas";
  return `${n} por mês`;
}

export default function PricingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [currentPlanName, setCurrentPlanName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [confirmPlan, setConfirmPlan] = useState<PlanRecord | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    Promise.all([
      apiFetch<PlanRecord[]>("/plans", { auth: false }),
      apiFetch<QuotaStatus>("/subscriptions/me"),
    ])
      .then(([planList, quota]) => {
        const ordered = [...planList].sort(
          (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
        );
        setPlans(ordered);
        setCurrentPlanName(quota.planName);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        setError("Não foi possível carregar os planos.");
      })
      .finally(() => setLoading(false));
  }, [authReady, router]);

  async function confirmUpgrade() {
    if (!confirmPlan) return;
    try {
      setUpgrading(true);
      setError("");
      const result = await apiFetch<QuotaStatus>("/subscriptions/upgrade", {
        method: "POST",
        body: { planSlug: confirmPlan.slug },
      });
      setCurrentPlanName(result.planName);
      setSuccessMsg(`Plano ${result.planName} ativado com sucesso!`);
      setConfirmPlan(null);
      setTimeout(() => router.push("/billing"), 1800);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível alterar o plano.");
    } finally {
      setUpgrading(false);
    }
  }

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-[#062650]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <DashboardShell activeItem="plans" onLogout={logout} onStartEvaluation={() => router.push("/")}>
      <section className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#062650]">Escolha seu plano</h1>
          <p className="mt-2 text-sm text-slate-600">
            Todos os planos incluem exportação Excel e histórico de avaliações.
          </p>
        </div>

        {successMsg && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[#062650]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Carregando planos…</span>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.name === currentPlanName;
              const features = PLAN_FEATURES[plan.slug] ?? [];
              const highlighted = plan.slug === "standard";

              return (
                <div
                  key={plan.id}
                  className={[
                    "flex flex-col rounded-2xl border p-6 shadow-sm transition",
                    highlighted
                      ? "border-[#062650] bg-[#062650] text-white shadow-lg"
                      : "border-slate-200 bg-white text-slate-900",
                  ].join(" ")}
                >
                  {highlighted && (
                    <div className="mb-3 w-fit rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">
                      Mais popular
                    </div>
                  )}

                  <h2 className={["text-xl font-bold", highlighted ? "text-white" : "text-[#062650]"].join(" ")}>
                    {plan.name}
                  </h2>

                  <div className="mt-3 mb-1">
                    <span className={["text-3xl font-extrabold", highlighted ? "text-white" : "text-[#062650]"].join(" ")}>
                      {formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className={["text-sm", highlighted ? "text-white/70" : "text-slate-500"].join(" ")}>
                        /mês
                      </span>
                    )}
                  </div>

                  <p className={["mb-5 text-xs", highlighted ? "text-white/70" : "text-slate-500"].join(" ")}>
                    {formatSearches(plan.searchesPerMonth)} avaliações
                  </p>

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check
                          className={["mt-0.5 h-4 w-4 shrink-0", highlighted ? "text-white" : "text-[#062650]"].join(" ")}
                        />
                        <span className={highlighted ? "text-white/90" : "text-slate-700"}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <span
                      className={[
                        "w-full rounded-md py-2.5 text-center text-sm font-semibold",
                        highlighted ? "bg-white/20 text-white" : "border border-[#062650] bg-[#e8f5f8] text-[#062650]",
                      ].join(" ")}
                    >
                      Plano atual
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmPlan(plan)}
                      className={[
                        "w-full rounded-md py-2.5 text-sm font-semibold transition hover:opacity-90",
                        highlighted ? "bg-white text-[#062650]" : "bg-[#062650] text-white",
                      ].join(" ")}
                    >
                      Selecionar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirmation modal */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-1 flex items-start justify-between">
              <h2 className="text-lg font-bold text-[#062650]">Confirmar plano {confirmPlan.name}</h2>
              <button
                onClick={() => setConfirmPlan(null)}
                className="ml-4 rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Ambiente de demonstração:</strong> o pagamento é simulado e o plano será
              ativado imediatamente sem nenhuma cobrança. A integração com meios de pagamento
              será implementada em breve.
            </div>

            <div className="mt-5 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Plano selecionado</span>
                <span className="font-semibold text-[#062650]">{confirmPlan.name}</span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span>Avaliações</span>
                <span className="font-semibold text-[#062650]">
                  {formatSearches(confirmPlan.searchesPerMonth)}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span>Valor</span>
                <span className="font-semibold text-[#062650]">
                  {formatPrice(confirmPlan.price)}{confirmPlan.price > 0 ? "/mês" : ""}
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-600">{error}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmPlan(null)}
                disabled={upgrading}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpgrade}
                disabled={upgrading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#062650] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {upgrading ? "Ativando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
