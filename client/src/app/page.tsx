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
  ChevronDown,
  Loader2,
  MapPin,
  Ruler,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { CreateEvaluationResponse, EvaluationPreview, LocationGroup, LocationsResponse } from "@/types/avaliapro";

type WizardForm = {
  name: string;
  propertyType: string;
  state: string;
  city: string;
  neighborhoods: string[];
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
  neighborhoods: [],
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

/** Formata uma string de dígitos como inteiro pt-BR (ex.: "350000" → "350.000"). */
function formatIntBR(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR").format(Number(digits));
}

function buildFilters(form: WizardForm) {
  const neighborhoods = form.neighborhoods.map((n) => n.trim()).filter(Boolean);
  return {
    city: form.city.trim(),
    state: form.state.trim().toUpperCase() || "RS",
    neighborhoods: neighborhoods.length ? neighborhoods : undefined,
    neighborhood: neighborhoods.length === 1 ? neighborhoods[0] : undefined,
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
  const [locations, setLocations] = useState<LocationGroup[]>([]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    apiFetch<LocationsResponse>("/real-estate/locations")
      .then((data) => {
        if (!cancelled && data?.cities?.length) setLocations(data.cities);
      })
      .catch(() => {
        // mantém inputs de texto como fallback
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const selectedCity = useMemo(
    () => locations.find((loc) => loc.city.toLowerCase() === form.city.trim().toLowerCase()) ?? null,
    [locations, form.city],
  );
  const neighborhoodOptions = selectedCity?.neighborhoods ?? [];

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
                    readOnly={locations.length > 0}
                    onChange={(event) => setForm((current) => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))}
                    className={["Input", locations.length > 0 ? "cursor-not-allowed bg-slate-100" : ""].join(" ")}
                  />
                </Field>
                <Field label="Cidade" icon={<MapPin className="h-4 w-4" />}>
                  {locations.length > 0 ? (
                    <select
                      value={form.city}
                      onChange={(event) => {
                        const city = event.target.value;
                        const group = locations.find((loc) => loc.city === city);
                        setForm((current) => ({
                          ...current,
                          city,
                          state: group?.uf || current.state,
                          neighborhoods: [],
                        }));
                      }}
                      className="Input"
                    >
                      <option value="">Selecione a cidade</option>
                      {locations.map((loc) => (
                        <option key={`${loc.uf}-${loc.city}`} value={loc.city}>
                          {loc.city} {loc.uf ? `(${loc.uf})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.city}
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                      className="Input"
                    />
                  )}
                </Field>
                <Field label="Bairros">
                  {neighborhoodOptions.length > 0 ? (
                    <MultiSelect
                      options={neighborhoodOptions}
                      selected={form.neighborhoods}
                      onChange={(next) => setForm((current) => ({ ...current, neighborhoods: next }))}
                      placeholder="Todos os bairros"
                    />
                  ) : (
                    <input
                      value={form.neighborhoods[0] ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          neighborhoods: event.target.value.trim() ? [event.target.value] : [],
                        }))
                      }
                      placeholder={locations.length > 0 && !form.city ? "Selecione a cidade primeiro" : "Centro"}
                      disabled={locations.length > 0 && !form.city}
                      className={["Input", locations.length > 0 && !form.city ? "cursor-not-allowed bg-slate-100" : ""].join(" ")}
                    />
                  )}
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
                  <QuantityStepper
                    value={form.bedrooms}
                    onChange={(value) => setForm((current) => ({ ...current, bedrooms: value }))}
                  />
                </Field>
                <Field label="Garagem" icon={<Car className="h-4 w-4" />}>
                  <QuantityStepper
                    value={form.garage}
                    onChange={(value) => setForm((current) => ({ ...current, garage: value }))}
                  />
                </Field>
                <Field label="Banheiros" icon={<Bath className="h-4 w-4" />}>
                  <QuantityStepper
                    value={form.bathrooms}
                    onChange={(value) => setForm((current) => ({ ...current, bathrooms: value }))}
                  />
                </Field>
                <Field label="Preço mínimo" icon={<WalletCards className="h-4 w-4" />}>
                  <PrefixInput
                    prefix="R$"
                    inputMode="numeric"
                    value={form.minPrice}
                    onChange={(value) => setForm((current) => ({ ...current, minPrice: formatIntBR(value) }))}
                    placeholder="150.000"
                  />
                </Field>
                <Field label="Preço máximo" icon={<WalletCards className="h-4 w-4" />}>
                  <PrefixInput
                    prefix="R$"
                    inputMode="numeric"
                    value={form.maxPrice}
                    onChange={(value) => setForm((current) => ({ ...current, maxPrice: formatIntBR(value) }))}
                    placeholder="800.000"
                  />
                </Field>
                <Field label="Área mínima" icon={<Ruler className="h-4 w-4" />}>
                  <PrefixInput
                    suffix="m²"
                    inputMode="numeric"
                    value={form.minArea}
                    onChange={(value) => setForm((current) => ({ ...current, minArea: formatIntBR(value) }))}
                    placeholder="40"
                  />
                </Field>
                <Field label="Área máxima" icon={<Ruler className="h-4 w-4" />}>
                  <PrefixInput
                    suffix="m²"
                    inputMode="numeric"
                    value={form.maxArea}
                    onChange={(value) => setForm((current) => ({ ...current, maxArea: formatIntBR(value) }))}
                    placeholder="200"
                  />
                </Field>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Deixe os campos de quantidade em &quot;Qualquer&quot; para não filtrar por esse critério.
              </p>
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
                  <b>Bairros:</b> {form.neighborhoods.length ? form.neighborhoods.join(", ") : "Todos"}
                  <br />
                  <b>Palavras-chave:</b> {form.q || "-"}
                </Summary>
                <Summary title="Detalhes">
                  <b>Quartos:</b> {form.bedrooms || "Qualquer"}
                  <br />
                  <b>Banheiros:</b> {form.bathrooms || "Qualquer"}
                  <br />
                  <b>Garagem:</b> {form.garage || "Qualquer"}
                  <br />
                  <b>Preço:</b> {form.minPrice ? `R$ ${form.minPrice}` : "?"} - {form.maxPrice ? `R$ ${form.maxPrice}` : "?"}
                  <br />
                  <b>Área:</b> {form.minArea ? `${form.minArea} m²` : "?"} - {form.maxArea ? `${form.maxArea} m²` : "?"}
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

function QuantityStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = value === "" ? null : Number(value);
  const display = current === null ? "Qualquer" : `${current}${current >= 6 ? "+" : ""}`;

  function setValue(next: number | null) {
    onChange(next === null ? "" : String(next));
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-slate-300 bg-white">
      <button
        type="button"
        onClick={() => setValue(current === null || current <= 0 ? null : current - 1)}
        className="grid w-11 place-items-center border-r border-slate-200 text-lg font-semibold text-[#062650] hover:bg-slate-100 disabled:opacity-40"
        disabled={current === null}
        aria-label="Diminuir"
      >
        −
      </button>
      <span className={["flex-1 select-none py-2 text-center text-sm font-semibold", current === null ? "text-slate-400" : "text-[#062650]"].join(" ")}>
        {display}
      </span>
      <button
        type="button"
        onClick={() => setValue(current === null ? 1 : Math.min(current + 1, 10))}
        className="grid w-11 place-items-center border-l border-slate-200 text-lg font-semibold text-[#062650] hover:bg-slate-100"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}

function PrefixInput({
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#9db8ca]">
      {prefix && (
        <span className="grid place-items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
          {prefix}
        </span>
      )}
      <input
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none"
      />
      {suffix && (
        <span className="grid place-items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione",
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => options.filter((opt) => opt.toLowerCase().includes(search.trim().toLowerCase())),
    [options, search],
  );

  function toggle(opt: string) {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800"
      >
        <span className={selected.length ? "text-slate-800" : "text-slate-400"}>
          {selected.length === 0
            ? placeholder
            : selected.length <= 2
              ? selected.join(", ")
              : `${selected.length} bairros selecionados`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((opt) => (
            <span key={opt} className="inline-flex items-center gap-1 rounded-full bg-[#e8f5f8] px-2.5 py-0.5 text-xs font-medium text-[#062650]">
              {opt}
              <button type="button" onClick={() => toggle(opt)} aria-label={`Remover ${opt}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar bairro..."
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#9db8ca]"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-400">Nenhum bairro encontrado</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(opt)}
                        onChange={() => toggle(opt)}
                        className="h-4 w-4 accent-[#062650]"
                      />
                      <span className="text-slate-700">{opt}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
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
