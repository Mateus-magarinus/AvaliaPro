"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  Car,
  CheckCircle2,
  Loader2,
  MapPin,
  Ruler,
  Search,
  WalletCards,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { CreateEvaluationResponse, EvaluationPreview } from "@/types/avaliapro";

type WizardForm = {
  name: string;
  propertyType: string;
  state: string;
  city: string;
  neighborhood: string;
  q: string;
  bedrooms: string;
  bathrooms: string;
  garage: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
};

const initialForm: WizardForm = {
  name: "",
  propertyType: "Apartamento",
  state: "RS",
  city: "Passo Fundo",
  neighborhood: "",
  q: "",
  bedrooms: "",
  bathrooms: "",
  garage: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
};

const steps = ["Início", "Especificação", "Detalhes", "Confirmação"];

function toNumber(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function toInt(value: string) {
  const n = toNumber(value);
  return Number.isInteger(n) ? n : undefined;
}

function buildFilters(form: WizardForm) {
  return {
    city: form.city.trim(),
    state: form.state.trim().toUpperCase() || "RS",
    neighborhood: form.neighborhood.trim() || undefined,
    propertyType: form.propertyType || undefined,
    type: form.propertyType || undefined,
    q: form.q.trim() || undefined,
    bedrooms: toInt(form.bedrooms),
    bathrooms: toInt(form.bathrooms),
    garage: toInt(form.garage),
    minPrice: toNumber(form.minPrice),
    maxPrice: toNumber(form.maxPrice),
    minArea: toNumber(form.minArea),
    maxArea: toNumber(form.maxArea),
  };
}

export default function HomeWizardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<EvaluationPreview | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<WizardForm>(initialForm);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthReady(true);
  }, [router]);

  const stepValid = useMemo(() => {
    if (step === 0) return form.name.trim().length >= 3;
    if (step === 1) return Boolean(form.city.trim() && form.state.trim());
    return true;
  }, [form, step]);

  useEffect(() => {
    if (!authReady || step !== 3) return;

    let cancelled = false;
    async function loadPreview() {
      try {
        setPreviewLoading(true);
        setError("");
        const data = await apiFetch<{ total: number; sample?: unknown[]; sampleLimit: number }>("/evaluations/preview?limit=5", {
          method: "POST",
          body: { filters: buildFilters(form) },
        });
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível calcular a prévia.");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [authReady, form, step]);

  function resetWizard() {
    setForm(initialForm);
    setStep(0);
    setPreview(null);
    setError("");
  }

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  async function confirmAndCreate() {
    try {
      setSaving(true);
      setError("");

      const filters = buildFilters(form);
      const result = await apiFetch<CreateEvaluationResponse>("/evaluations", {
        method: "POST",
        body: {
          name: form.name.trim(),
          description: `${filters.propertyType || "Imóveis"} em ${filters.city}/${filters.state}`,
          filters,
          options: { previewSampleLimit: 12 },
        },
      });

      router.push(`/evaluations/${result.evaluationId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível criar a avaliação.");
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-[#062650]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <DashboardShell activeItem="evaluations" onLogout={logout} onStartEvaluation={resetWizard}>
      <section className="space-y-6">
        <Stepper current={step} />

        <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-[#e8f5f8] p-5 shadow-md sm:p-6">
          {error && <div className="mb-5 rounded-md border border-red-200 bg-white px-3 py-2.5 text-sm text-red-700">{error}</div>}

          {step === 0 && (
            <StepPanel title="Início da avaliação" subtitle="Nomeie sua avaliação para facilitar sua busca no histórico futuramente">
              <Field label="Nome da avaliação">
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex.: Apartamentos no Centro de Passo Fundo"
                  className="Input"
                />
              </Field>
              <NavButtons canNext={stepValid} onNext={() => setStep(1)} />
            </StepPanel>
          )}

          {step === 1 && (
            <StepPanel title="Especificação" subtitle="Filtre sua busca para encontrarmos os melhores resultados">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo de imóvel" icon={<Building2 className="h-4 w-4" />}>
                  <select
                    value={form.propertyType}
                    onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))}
                    className="Input"
                  >
                    <option value="Apartamento">Apartamento</option>
                    <option value="Casa">Casa</option>
                    <option value="Studio">Studio</option>
                    <option value="Terreno">Terreno</option>
                    <option value="Sala">Sala comercial</option>
                    <option value="Loja">Loja</option>
                  </select>
                </Field>
                <Field label="UF">
                  <input
                    value={form.state}
                    onChange={(event) => setForm((current) => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))}
                    className="Input"
                  />
                </Field>
                <Field label="Cidade" icon={<MapPin className="h-4 w-4" />}>
                  <input
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Bairro">
                  <input
                    value={form.neighborhood}
                    onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}
                    placeholder="Centro"
                    className="Input"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Palavras-chave" icon={<Search className="h-4 w-4" />}>
                    <input
                      value={form.q}
                      onChange={(event) => setForm((current) => ({ ...current, q: event.target.value }))}
                      placeholder="sacada, mobiliado, cobertura..."
                      className="Input"
                    />
                  </Field>
                </div>
              </div>
              <NavButtons canNext={stepValid} onBack={() => setStep(0)} onNext={() => setStep(2)} />
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel title="Detalhes" subtitle="Pesquise por características individuais do imóvel">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Quartos" icon={<BedDouble className="h-4 w-4" />}>
                  <input
                    inputMode="numeric"
                    value={form.bedrooms}
                    onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Garagem" icon={<Car className="h-4 w-4" />}>
                  <input
                    inputMode="numeric"
                    value={form.garage}
                    onChange={(event) => setForm((current) => ({ ...current, garage: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Banheiros" icon={<Bath className="h-4 w-4" />}>
                  <input
                    inputMode="numeric"
                    value={form.bathrooms}
                    onChange={(event) => setForm((current) => ({ ...current, bathrooms: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Preço mínimo" icon={<WalletCards className="h-4 w-4" />}>
                  <input
                    inputMode="decimal"
                    value={form.minPrice}
                    onChange={(event) => setForm((current) => ({ ...current, minPrice: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Preço máximo" icon={<WalletCards className="h-4 w-4" />}>
                  <input
                    inputMode="decimal"
                    value={form.maxPrice}
                    onChange={(event) => setForm((current) => ({ ...current, maxPrice: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Área mínima" icon={<Ruler className="h-4 w-4" />}>
                  <input
                    inputMode="decimal"
                    value={form.minArea}
                    onChange={(event) => setForm((current) => ({ ...current, minArea: event.target.value }))}
                    className="Input"
                  />
                </Field>
                <Field label="Área máxima" icon={<Ruler className="h-4 w-4" />}>
                  <input
                    inputMode="decimal"
                    value={form.maxArea}
                    onChange={(event) => setForm((current) => ({ ...current, maxArea: event.target.value }))}
                    className="Input"
                  />
                </Field>
              </div>
              <NavButtons canNext={stepValid} onBack={() => setStep(1)} onNext={() => setStep(3)} />
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel title="Confirmação" subtitle="Verifique se está tudo de acordo com o que você deseja">
              <div className="space-y-4">
                <Summary title="Busca">
                  <b>Tipo de imóvel:</b> {form.propertyType || "-"}
                  <br />
                  <b>Cidade:</b> {form.city} - {form.state}
                  <br />
                  <b>Bairro:</b> {form.neighborhood || "-"}
                  <br />
                  <b>Palavras-chave:</b> {form.q || "-"}
                </Summary>
                <Summary title="Detalhes">
                  <b>Quartos:</b> {form.bedrooms || "-"}
                  <br />
                  <b>Banheiros:</b> {form.bathrooms || "-"}
                  <br />
                  <b>Garagem:</b> {form.garage || "-"}
                  <br />
                  <b>Preço:</b> {form.minPrice || "?"} - {form.maxPrice || "?"}
                  <br />
                  <b>Área:</b> {form.minArea || "?"} - {form.maxArea || "?"}
                </Summary>
                <div className="rounded-md border border-[#9db8ca] bg-white px-3 py-2.5 text-sm font-semibold text-[#062650]">
                  {previewLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculando resultados
                    </span>
                  ) : (
                    `${preview?.total ?? 0} resultados com essas especificações`
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  A avaliação será criada com no máximo 70 imóveis comparáveis.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setStep(2)} className="BtnSecondary">
                  Voltar
                </button>
                <button onClick={confirmAndCreate} disabled={saving} className="BtnPrimary gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmar
                </button>
              </div>
            </StepPanel>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
      {steps.map((label, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li key={label} className="flex flex-col items-center gap-1.5 text-center">
            <span className={["h-3.5 w-3.5 rounded-full", active || done ? "bg-[#062650]" : "bg-[#9db8ca]"].join(" ")} />
            <span className={["text-[11px] font-semibold sm:text-xs", active ? "text-[#062650]" : "text-[#9db8ca]"].join(" ")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StepPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-[#062650]">{title}</h1>
        <p className="mt-2 text-sm text-slate-700">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#062650]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Summary({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#9db8ca] bg-white px-4 py-3 text-sm text-slate-700">
      <p className="mb-1.5 font-semibold text-[#062650]">{title}</p>
      <div className="leading-7">{children}</div>
    </div>
  );
}

function NavButtons({
  canNext,
  onBack,
  onNext,
}: {
  canNext: boolean;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="BtnSecondary">
          Voltar
        </button>
      ) : (
        <span />
      )}
      <button onClick={onNext} disabled={!canNext} className="BtnPrimary disabled:opacity-50">
        Próxima
      </button>
    </div>
  );
}
