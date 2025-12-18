"use client";

import React, { useMemo, useState } from "react";
import { Menu, ChevronRight, LogOut, ExternalLink, User as UserIcon, PlayCircle, Home, List, History, HelpCircle, CreditCard, Settings } from "lucide-react";

/**
 * Página inicial pós-login com um wizard de 4 etapas:
 * Início → Endereço → Detalhes → Confirmação
 *
 * Observações
 * - Mantém tudo em uma única rota para simplicidade do MVP.
 * - Sidebar responsiva (off-canvas em telas pequenas, fixa em telas ≥ lg).
 * - Layout com TailwindCSS puro para evitar dependências extras.
 * - Pontos de integração com a API estão marcados com TODO.
 */

// ------- Tipos -------

type Address = {
  uf: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento?: string;
};

type Details = {
  tipo: "casa" | "apartamento" | "terreno" | "comercial" | "outro" | "";
  area: string; // m²
  quartos: string;
  banheiros: string;
  vagas: string;
  precoMin: string;
  precoMax: string;
};

type FormState = {
  nome: string;
  address: Address;
  details: Details;
};

const initialState: FormState = {
  nome: "",
  address: {
    uf: "",
    cidade: "",
    bairro: "",
    logradouro: "",
    numero: "",
    complemento: "",
  },
  details: {
    tipo: "",
    area: "",
    quartos: "",
    banheiros: "",
    vagas: "",
    precoMin: "",
    precoMax: "",
  },
};

// ------- Page Component -------

export default function HomeWizardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [step, setStep] = useState(0); // 0..3
  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState(3);
  const [form, setForm] = useState<FormState>(initialState);

  // Validações simples por etapa (MVP)
  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return form.nome.trim().length >= 3;
      case 1:
        return (
          !!form.address.uf &&
          !!form.address.cidade &&
          !!form.address.bairro &&
          !!form.address.logradouro &&
          !!form.address.numero
        );
      case 2:
        return !!form.details.tipo;
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, form]);

  const onNext = () => {
    if (step < 3 && stepValid) setStep((s) => s + 1);
  };

  const onBack = () => setStep((s) => Math.max(0, s - 1));

  const resetWizard = () => {
    setForm(initialState);
    setStep(0);
  };

  const confirmAndCreate = async () => {
    try {
      setSaving(true);
      // TODO: Chamar endpoint de criação de "avaliação" enviando os dados do formulário
      // Ex.: const resp = await api.post('/evaluations', payload)
      await new Promise((r) => setTimeout(r, 900));
      // Sucesso simulado
      setCredits((c) => Math.max(0, c - 1));
      // TODO: navegar para a tela de busca/resultados ligados a esta avaliação
      alert("Avaliação criada com sucesso! (simulação)\nVocê será direcionado para a busca na próxima etapa do desenvolvimento.");
      resetWizard();
    } catch (e) {
      console.error(e);
      alert("Não foi possível criar a avaliação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md hover:bg-slate-100"
              aria-label="Abrir menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Logo simples */}
            <div className="flex items-center gap-2 select-none">
              <div className="h-6 w-6 rounded-sm bg-sky-200 border border-sky-600" />
              <span className="font-semibold tracking-tight">AvaliaPro</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              <strong>{credits}</strong> créditos
            </span>
            <button
              onClick={resetWizard}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white text-sm hover:bg-slate-800"
            >
              <PlayCircle className="h-4 w-4" /> Iniciar avaliação
            </button>
            <div className="h-8 w-8 rounded-full bg-slate-300 overflow-hidden grid place-items-center">
              <UserIcon className="h-5 w-5 text-slate-700" />
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 py-6">
        {/* Sidebar – fixa no lg, off-canvas no mobile */}
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>

        {/* Off-canvas */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar onLinkClick={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="min-h-[60vh]">
          <WizardHeader step={step} />

          <section className="mt-8">
            <div className="rounded-2xl border border-slate-200 shadow-sm bg-slate-50">
              <div className="p-6 sm:p-8">
                {step === 0 && (
                  <StepInicio
                    value={form.nome}
                    onChange={(nome) => setForm((f) => ({ ...f, nome }))}
                    onNext={onNext}
                    canNext={stepValid}
                  />
                )}

                {step === 1 && (
                  <StepEndereco
                    value={form.address}
                    onChange={(address) => setForm((f) => ({ ...f, address }))}
                    onBack={onBack}
                    onNext={onNext}
                    canNext={stepValid}
                  />
                )}

                {step === 2 && (
                  <StepDetalhes
                    value={form.details}
                    onChange={(details) => setForm((f) => ({ ...f, details }))}
                    onBack={onBack}
                    onNext={onNext}
                    canNext={stepValid}
                  />
                )}

                {step === 3 && (
                  <StepConfirmacao
                    form={form}
                    saving={saving}
                    onBack={onBack}
                    onConfirm={confirmAndCreate}
                  />
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// ------- Sidebar -------

function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const LinkRow = ({ icon, label, href, external }: any) => (
    <a
      href={href || "#"}
      onClick={onLinkClick}
      className="group flex items-center justify-between rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
    >
      <span className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{label}</span>
      </span>
      {external ? (
        <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
      )}
    </a>
  );

  return (
    <nav className="sticky top-[88px] space-y-2">
      <div className="mb-4">
        <div className="h-8 w-8 rounded-sm bg-sky-200 border border-sky-600" />
      </div>
      <LinkRow icon={<List className="h-4 w-4" />} label="Avaliações" />
      <LinkRow icon={<History className="h-4 w-4" />} label="Histórico" />
      <LinkRow icon={<UserIcon className="h-4 w-4" />} label="Perfil" />
      <LinkRow icon={<CreditCard className="h-4 w-4" />} label="Planos" />
      <LinkRow icon={<HelpCircle className="h-4 w-4" />} label="Suporte" />
      <LinkRow icon={<ExternalLink className="h-4 w-4" />} label="Tutorial" external />

      <div className="pt-3 mt-3 border-t border-slate-200">
        <LinkRow icon={<LogOut className="h-4 w-4" />} label="Logout" />
      </div>
    </nav>
  );
}

// ------- Header do Wizard (Stepper) -------

function WizardHeader({ step }: { step: number }) {
  const steps = ["Início", "Endereço", "Detalhes", "Confirmação"];

  return (
    <div className="pt-2">
      <ol className="flex items-center justify-center gap-6 sm:gap-12">
        {steps.map((label, idx) => {
          const active = step === idx;
          const done = step > idx;
          return (
            <li key={label} className="flex items-center gap-3">
              <div
                className={[
                  "h-3 w-3 rounded-full",
                  done ? "bg-slate-900" : active ? "bg-slate-900" : "bg-slate-300",
                ].join(" ")}
              />
              <span
                className={[
                  "text-sm font-medium",
                  active ? "text-slate-900" : "text-slate-500",
                ].join(" ")}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ------- Etapa 0: Início -------

function StepInicio({
  value,
  onChange,
  onNext,
  canNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-xl sm:text-2xl font-semibold">Início da avaliação</h2>
      <p className="mt-2 text-sm text-slate-600">
        Nomeie sua avaliação para facilitar sua busca no histórico futuramente
      </p>

      <div className="mt-8">
        <label className="block text-left text-sm font-medium text-slate-700 mb-2">
          Nome
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex.: Casa Rua das Acácias 123"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-white disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

// ------- Etapa 1: Endereço -------

function StepEndereco({
  value,
  onChange,
  onBack,
  onNext,
  canNext,
}: {
  value: Address;
  onChange: (v: Address) => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
}) {
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl sm:text-2xl font-semibold text-center">Endereço</h2>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>UF</Label>
          <input
            value={value.uf}
            onChange={(e) => set({ uf: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="RS"
            className="Input"
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <input
            value={value.cidade}
            onChange={(e) => set({ cidade: e.target.value })}
            placeholder="Passo Fundo"
            className="Input"
          />
        </div>
        <div>
          <Label>Bairro</Label>
          <input
            value={value.bairro}
            onChange={(e) => set({ bairro: e.target.value })}
            placeholder="Centro"
            className="Input"
          />
        </div>
        <div>
          <Label>Logradouro</Label>
          <input
            value={value.logradouro}
            onChange={(e) => set({ logradouro: e.target.value })}
            placeholder="Rua/Av."
            className="Input"
          />
        </div>
        <div>
          <Label>Número</Label>
          <input
            value={value.numero}
            onChange={(e) => set({ numero: e.target.value })}
            placeholder="123"
            className="Input"
          />
        </div>
        <div>
          <Label>Complemento (opcional)</Label>
          <input
            value={value.complemento}
            onChange={(e) => set({ complemento: e.target.value })}
            placeholder="Apto, bloco, referência"
            className="Input"
          />
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} canNext={canNext} />
    </div>
  );
}

// ------- Etapa 2: Detalhes -------

function StepDetalhes({
  value,
  onChange,
  onBack,
  onNext,
  canNext,
}: {
  value: Details;
  onChange: (v: Details) => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
}) {
  const set = (patch: Partial<Details>) => onChange({ ...value, ...patch });

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl sm:text-2xl font-semibold text-center">Detalhes</h2>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Tipo</Label>
          <select
            value={value.tipo}
            onChange={(e) => set({ tipo: e.target.value as Details["tipo"] })}
            className="Input"
          >
            <option value="">Selecione</option>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="terreno">Terreno</option>
            <option value="comercial">Comercial</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <Label>Área (m²)</Label>
          <input
            inputMode="decimal"
            value={value.area}
            onChange={(e) => set({ area: e.target.value })}
            placeholder="120"
            className="Input"
          />
        </div>
        <div>
          <Label>Quartos</Label>
          <input
            inputMode="numeric"
            value={value.quartos}
            onChange={(e) => set({ quartos: e.target.value })}
            placeholder="3"
            className="Input"
          />
        </div>
        <div>
          <Label>Banheiros</Label>
          <input
            inputMode="numeric"
            value={value.banheiros}
            onChange={(e) => set({ banheiros: e.target.value })}
            placeholder="2"
            className="Input"
          />
        </div>
        <div>
          <Label>Vagas</Label>
          <input
            inputMode="numeric"
            value={value.vagas}
            onChange={(e) => set({ vagas: e.target.value })}
            placeholder="1"
            className="Input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Preço mín. (R$)</Label>
            <input
              inputMode="decimal"
              value={value.precoMin}
              onChange={(e) => set({ precoMin: e.target.value })}
              placeholder="250000"
              className="Input"
            />
          </div>
          <div>
            <Label>Preço máx. (R$)</Label>
            <input
              inputMode="decimal"
              value={value.precoMax}
              onChange={(e) => set({ precoMax: e.target.value })}
              placeholder="450000"
              className="Input"
            />
          </div>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} canNext={canNext} />
    </div>
  );
}

// ------- Etapa 3: Confirmação -------

function StepConfirmacao({
  form,
  saving,
  onBack,
  onConfirm,
}: {
  form: FormState;
  saving: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl sm:text-2xl font-semibold text-center">Confirmação</h2>
      <p className="mt-2 text-sm text-slate-600 text-center">
        Revise os dados abaixo antes de criar sua avaliação
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4">
        <SummaryRow title="Nome">{form.nome}</SummaryRow>
        <SummaryRow title="Endereço">
          {[form.address.logradouro, form.address.numero].filter(Boolean).join(", ")}
          {", "}
          {[form.address.bairro, form.address.cidade, form.address.uf].filter(Boolean).join(" - ")}
          {form.address.complemento ? ` (${form.address.complemento})` : ""}
        </SummaryRow>
        <SummaryRow title="Tipo/Área">
          {form.details.tipo || "-"} {form.details.area ? `• ${form.details.area} m²` : ""}
        </SummaryRow>
        <SummaryRow title="Quartos/Banheiros/Vagas">
          {[form.details.quartos && `${form.details.quartos} qts`, form.details.banheiros && `${form.details.banheiros} bhs`, form.details.vagas && `${form.details.vagas} vagas`]
            .filter(Boolean)
            .join(" • ") || "-"}
        </SummaryRow>
        <SummaryRow title="Faixa de preço">
          {form.details.precoMin || form.details.precoMax
            ? `R$ ${form.details.precoMin || "?"} — R$ ${form.details.precoMax || "?"}`
            : "-"}
        </SummaryRow>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="BtnSecondary">Voltar</button>
        <button onClick={onConfirm} disabled={saving} className="BtnPrimary">
          {saving ? "Criando..." : "Confirmar e criar avaliação"}
        </button>
      </div>
    </div>
  );
}

// ------- Componentes pequenos -------

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700 mb-2">{children}</label>;
}

function SummaryRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function NavButtons({ onBack, onNext, canNext }: { onBack: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button onClick={onBack} className="BtnSecondary">Voltar</button>
      <button onClick={onNext} disabled={!canNext} className="BtnPrimary disabled:opacity-50">
        Próxima
      </button>
    </div>
  );
}

// Estilos utilitários migrados para `app/globals.css` (ver instruções no chat).
