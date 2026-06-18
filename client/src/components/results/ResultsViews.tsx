"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, FileSpreadsheet, GripVertical, ImageIcon, Pencil, MapPin, RotateCcw, Save, SlidersHorizontal, Table2, X } from "lucide-react";
import MapView, { MapPoint } from "./MapView";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { ColumnPref, ColumnPreferencesResponse, EvaluationRecord, EvaluationStatus, PropertyRecord } from "@/types/avaliapro";

type Tab = "table" | "details" | "map";

const DEFAULT_COLUMNS: ColumnPref[] = [
  { columnKey: "city", label: "Município", visible: true, order: 0 },
  { columnKey: "neighborhood", label: "Bairro", visible: true, order: 1 },
  { columnKey: "address", label: "Endereço", visible: true, order: 2 },
  { columnKey: "totalValue", label: "Valor total", visible: true, order: 3 },
  { columnKey: "totalArea", label: "Área", visible: true, order: 4 },
  { columnKey: "bedrooms", label: "Quartos", visible: true, order: 5 },
  { columnKey: "ibgeIncome", label: "Renda município", visible: true, order: 6 },
  { columnKey: "sectorIncome", label: "Renda setor", visible: true, order: 7 },
  { columnKey: "contactLink", label: "Link", visible: true, order: 8 },
];

function numberValue(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(value: number | string | null | undefined) {
  const n = numberValue(value);
  if (n === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(value: number | string | null | undefined, suffix = "") {
  const n = numberValue(value);
  if (n === null) return "-";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)}${suffix}`;
}

function extractImageValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(extractImageValues);

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    if (text.startsWith("[") || text.startsWith("{")) {
      try {
        return extractImageValues(JSON.parse(text));
      } catch {
        // Keep parsing as a regular text list below.
      }
    }

    return text
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter((item) => item.startsWith("/") || /^https?:\/\//i.test(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return ["Foto_Grande", "Foto_Media", "Foto_Pequena", "url", "src"].flatMap((key) => extractImageValues(record[key]));
  }

  return [];
}

function imagesOf(property: PropertyRecord) {
  return Array.from(new Set(extractImageValues(property.images)));
}

function getVisibleIndicators(currentIndex: number, totalImages: number, maxVisible = 10) {
  const total = Math.max(0, totalImages);
  const visibleCount = Math.min(Math.max(1, maxVisible), total);
  if (!visibleCount) return [];

  const activeIndex = Math.min(Math.max(currentIndex, 0), total - 1);
  const halfWindow = Math.floor(visibleCount / 2);
  const maxStart = total - visibleCount;
  const start = Math.max(0, Math.min(activeIndex - halfWindow, maxStart));

  return Array.from({ length: visibleCount }, (_, offset) => start + offset);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function propertyTitle(property: PropertyRecord) {
  return property.description || [property.neighborhood, property.city].filter(Boolean).join(" - ") || `Imóvel ${property.id}`;
}

/** Detecta renda de setor muito discrepante do município (provável dado ruidoso). */
function sectorIncomeAnomaly(
  sector: number | string | null | undefined,
  municipal: number | string | null | undefined,
): "low" | "high" | null {
  const s = numberValue(sector);
  const m = numberValue(municipal);
  if (s === null || m === null || m <= 0) return null;
  if (s < m * 0.4) return "low";
  if (s > m * 2.5) return "high";
  return null;
}

function anomalyTitle(kind: "low" | "high") {
  return kind === "low"
    ? "Renda do setor bem abaixo da média do município — possível setor com poucos respondentes ou dado suprimido pelo IBGE."
    : "Renda do setor bem acima da média do município — verifique antes de usar.";
}

function renderCell(key: string, property: PropertyRecord): ReactNode {
  switch (key) {
    case "city":
      return property.city;
    case "neighborhood":
      return property.neighborhood || "-";
    case "address":
      return property.address;
    case "totalValue":
      return formatMoney(property.totalValue);
    case "unitValue":
      return formatMoney(property.unitValue);
    case "totalArea":
      return formatNumber(property.totalArea, " m²");
    case "bedrooms":
      return property.bedrooms ?? "-";
    case "bathrooms":
      return property.bathrooms ?? "-";
    case "garageSpots":
      return property.garageSpots ?? "-";
    case "ibgeIncome":
      return formatMoney(property.ibgeIncome);
    case "sectorIncome": {
      const text = formatMoney(property.sectorIncome);
      const anomaly = sectorIncomeAnomaly(property.sectorIncome, property.ibgeIncome);
      if (!anomaly) return text;
      return (
        <span className="inline-flex items-center gap-1 font-medium text-amber-600" title={anomalyTitle(anomaly)}>
          {text}
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      );
    }
    case "latitude":
      return property.latitude ?? "-";
    case "longitude":
      return property.longitude ?? "-";
    case "contactLink":
      return property.contactLink ? (
        <a
          href={property.contactLink}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1 font-medium text-[#062650]"
        >
          Abrir <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        "-"
      );
    default:
      return "-";
  }
}

type PropertyEditForm = {
  city: string;
  neighborhood: string;
  address: string;
  totalValue: string;
  totalArea: string;
  bedrooms: string;
  bathrooms: string;
  garageSpots: string;
  latitude: string;
  longitude: string;
  contactLink: string;
  description: string;
};

function inputValue(value: number | string | null | undefined) {
  return value == null ? "" : String(value);
}

function formFromProperty(property: PropertyRecord): PropertyEditForm {
  return {
    city: inputValue(property.city),
    neighborhood: inputValue(property.neighborhood),
    address: inputValue(property.address),
    totalValue: inputValue(property.totalValue),
    totalArea: inputValue(property.totalArea),
    bedrooms: inputValue(property.bedrooms),
    bathrooms: inputValue(property.bathrooms),
    garageSpots: inputValue(property.garageSpots),
    latitude: inputValue(property.latitude),
    longitude: inputValue(property.longitude),
    contactLink: inputValue(property.contactLink),
    description: inputValue(property.description),
  };
}

function optionalNumber(value: string) {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return null;

  let normalized = raw;
  if (raw.includes(".") && raw.includes(",")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export default function ResultsViews({
  evaluation,
  properties,
  onPropertyUpdated,
  onStatusChanged,
}: {
  evaluation: EvaluationRecord;
  properties: PropertyRecord[];
  onPropertyUpdated?: (property: PropertyRecord) => void;
  onStatusChanged?: (status: EvaluationStatus) => void;
}) {
  const [tab, setTab] = useState<Tab>("table");
  const [selectedId, setSelectedId] = useState<number | null>(properties[0]?.id ?? null);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [columns, setColumns] = useState<ColumnPref[]>(DEFAULT_COLUMNS);
  const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function changeStatus(action: "confirm" | "reopen") {
    try {
      setStatusSaving(true);
      await apiFetch(`/evaluations/${evaluation.id}/${action}`, { method: "POST" });
      onStatusChanged?.(action === "confirm" ? "confirmed" : "draft");
    } catch {
      // silencioso
    } finally {
      setStatusSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiFetch<ColumnPreferencesResponse>("/column-preferences")
      .then((data) => {
        if (!cancelled && data?.columns?.length) setColumns(data.columns);
      })
      .catch(() => {
        // mantém colunas padrão
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [columns],
  );

  async function saveColumns(next: ColumnPref[]) {
    setColumns(next);
    try {
      await apiFetch<ColumnPreferencesResponse>("/column-preferences", {
        method: "PUT",
        body: { columns: next.map((c, idx) => ({ columnKey: c.columnKey, visible: c.visible, order: idx })) },
      });
    } catch {
      // falha de persistência não quebra a UI
    }
  }

  const selected = useMemo(
    () => properties.find((property) => property.id === selectedId) ?? properties[0] ?? null,
    [properties, selectedId],
  );

  const mapPoints = useMemo<MapPoint[]>(
    () =>
      properties.map((property) => ({
        id: property.id,
        title: propertyTitle(property),
        subtitle: [property.address, property.neighborhood, property.city].filter(Boolean).join(" - "),
        lat: numberValue(property.latitude),
        lng: numberValue(property.longitude),
      })),
    [properties],
  );

  async function exportXlsx() {
    try {
      setExportingXlsx(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
      const token = getAccessToken();
      const response = await fetch(`${apiUrl}/evaluations/${evaluation.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `avaliapro-avaliacao-${evaluation.id}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user sees button go back to normal
    } finally {
      setExportingXlsx(false);
    }
  }

  function exportCsv() {
    const header = [
      "ID",
      "Municipio",
      "Bairro",
      "Endereco",
      "Quartos",
      "Banheiros",
      "Garagem",
      "Area total",
      "Valor total",
      "Valor por m2",
      "Renda municipio",
      "Renda setor",
      "Latitude",
      "Longitude",
      "Link",
    ];

    const rows = properties.map((property) => [
      property.id,
      property.city,
      property.neighborhood,
      property.address,
      property.bedrooms,
      property.bathrooms,
      property.garageSpots,
      property.totalArea,
      property.totalValue,
      property.unitValue,
      property.ibgeIncome,
      property.sectorIncome,
      property.latitude,
      property.longitude,
      property.contactLink,
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `avaliapro-avaliacao-${evaluation.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">Avaliação #{evaluation.id}</p>
            <StatusBadge status={evaluation.status} />
            {evaluation.status === "confirmed" && evaluation.confirmedAt && (
              <span className="text-xs text-slate-500">
                Finalizada em {new Date(evaluation.confirmedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-3xl font-semibold text-[#062650]">{evaluation.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {[evaluation.propertyType, evaluation.neighborhood, evaluation.city, evaluation.state].filter(Boolean).join(" - ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {evaluation.status === "confirmed" ? (
            <button
              onClick={() => changeStatus("reopen")}
              disabled={statusSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#062650] px-4 py-3 text-sm font-semibold text-[#062650] disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reabrir
            </button>
          ) : (
            <button
              onClick={() => changeStatus("confirm")}
              disabled={statusSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {statusSaving ? "Salvando..." : "Finalizar"}
            </button>
          )}
          <button
            onClick={() => setColumnsPanelOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#062650] px-4 py-3 text-sm font-semibold text-[#062650]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Colunas
          </button>
          <button
            onClick={exportXlsx}
            disabled={!properties.length || exportingXlsx}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#062650] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingXlsx ? "Gerando..." : "Exportar Excel"}
          </button>
          <button
            onClick={exportCsv}
            disabled={!properties.length}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#062650] px-4 py-3 text-sm font-semibold text-[#062650] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TabButton active={tab === "table"} icon={<Table2 className="h-4 w-4" />} onClick={() => setTab("table")}>
          Planilha
        </TabButton>
        <TabButton active={tab === "details"} icon={<ImageIcon className="h-4 w-4" />} onClick={() => setTab("details")}>
          Detalhes
        </TabButton>
        <TabButton active={tab === "map"} icon={<MapPin className="h-4 w-4" />} onClick={() => setTab("map")}>
          Mapa
        </TabButton>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-[#062650]">{properties.length} resultados com essas especificações</h2>
          <span className="text-sm text-slate-500">Status: {evaluation.status}</span>
        </div>

        {properties.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center rounded-lg bg-slate-50 text-sm text-slate-500">
            Nenhum imóvel foi anexado a esta avaliação.
          </div>
        ) : (
          <>
            {tab === "table" && (
              <div className="overflow-x-auto">
                {visibleColumns.length === 0 ? (
                  <div className="grid min-h-[180px] place-items-center rounded-lg bg-slate-50 text-sm text-slate-500">
                    Nenhuma coluna selecionada. Use o botão <b className="mx-1">Colunas</b> para escolher.
                  </div>
                ) : (
                  <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                    <thead>
                      <tr className="text-[#062650]">
                        <th className="px-3 py-2">ID</th>
                        {visibleColumns.map((col) => (
                          <th key={col.columnKey} className="px-3 py-2">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((property) => (
                        <tr
                          key={property.id}
                          onClick={() => {
                            setSelectedId(property.id);
                            setTab("details");
                          }}
                          className="cursor-pointer rounded-lg bg-slate-50 text-slate-700 hover:bg-[#dff0f5]"
                        >
                          <td className="rounded-l-lg px-3 py-4 font-semibold text-[#062650]">{property.id}</td>
                          {visibleColumns.map((col, index) => (
                            <td
                              key={col.columnKey}
                              className={["px-3 py-4", index === visibleColumns.length - 1 ? "rounded-r-lg" : ""].join(" ")}
                            >
                              {renderCell(col.columnKey, property)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "details" && selected && (
              <PropertyDetails
                property={selected}
                properties={properties}
                onSelect={setSelectedId}
                onSaved={onPropertyUpdated}
                readOnly={evaluation.status === "confirmed"}
              />
            )}

            {tab === "map" && (
              <MapView
                points={mapPoints}
                onOpenProperty={(id) => {
                  setSelectedId(Number(id));
                  setTab("details");
                }}
              />
            )}
          </>
        )}
      </div>

      {columnsPanelOpen && (
        <ColumnsPanel
          columns={columns}
          onClose={() => setColumnsPanelOpen(false)}
          onSave={(next) => {
            saveColumns(next);
            setColumnsPanelOpen(false);
          }}
        />
      )}
    </section>
  );
}

function ColumnsPanel({
  columns,
  onClose,
  onSave,
}: {
  columns: ColumnPref[];
  onClose: () => void;
  onSave: (next: ColumnPref[]) => void;
}) {
  const [draft, setDraft] = useState<ColumnPref[]>(
    () => [...columns].sort((a, b) => a.order - b.order),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function toggle(key: string) {
    setDraft((current) =>
      current.map((c) => (c.columnKey === key ? { ...c, visible: !c.visible } : c)),
    );
  }

  function reorder(from: number, to: number) {
    setDraft((current) => {
      if (from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((c, idx) => ({ ...c, order: idx }));
    });
  }

  const visibleCount = draft.filter((c) => c.visible).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#062650]">Personalizar colunas</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Marque as colunas visíveis e arraste para reordenar. {visibleCount} selecionada{visibleCount !== 1 ? "s" : ""}.
        </p>

        <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto">
          {draft.map((col, index) => (
            <li
              key={col.columnKey}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  reorder(dragIndex, index);
                  setDragIndex(index);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className={[
                "flex items-center gap-3 rounded-md border px-3 py-2.5 transition",
                dragIndex === index ? "border-[#062650] bg-[#e8f5f8]" : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-slate-400" />
              <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggle(col.columnKey)}
                  className="h-4 w-4 accent-[#062650]"
                />
                <span className="text-sm font-medium text-[#062650]">{col.label}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(draft.map((c, idx) => ({ ...c, order: idx })))}
            className="flex-1 rounded-md bg-[#062650] py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EvaluationStatus }) {
  const map: Record<EvaluationStatus, { label: string; cls: string }> = {
    draft: { label: "Em progresso", cls: "border border-[#062650] text-[#062650]" },
    confirmed: { label: "Finalizada", cls: "bg-emerald-600 text-white" },
    archived: { label: "Arquivada", cls: "bg-slate-400 text-white" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={["rounded-full px-2.5 py-0.5 text-xs font-semibold", s.cls].join(" ")}>
      {s.label}
    </span>
  );
}

function TabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition",
        active ? "bg-[#062650] text-white" : "bg-[#dff0f5] text-[#062650] hover:bg-[#cce8ef]",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}

function PropertyDetails({
  property,
  properties,
  onSelect,
  onSaved,
  readOnly = false,
}: {
  property: PropertyRecord;
  properties: PropertyRecord[];
  onSelect: (id: number) => void;
  onSaved?: (property: PropertyRecord) => void;
  readOnly?: boolean;
}) {
  const images = imagesOf(property);
  const [imageIndex, setImageIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<PropertyEditForm>(() => formFromProperty(property));
  const currentIndex = properties.findIndex((item) => item.id === property.id);
  const previous = properties[(currentIndex - 1 + properties.length) % properties.length];
  const next = properties[(currentIndex + 1) % properties.length];
  const activeImage = images[imageIndex] ?? images[0];
  const visibleIndicators = getVisibleIndicators(imageIndex, images.length);

  useEffect(() => {
    setImageIndex(0);
    setEditing(false);
    setError("");
    setForm(formFromProperty(property));
  }, [property]);

  function setField(field: keyof PropertyEditForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleEditing() {
    if (editing) {
      setEditing(false);
      setError("");
      setForm(formFromProperty(property));
      return;
    }
    setEditing(true);
  }

  async function saveEdits() {
    try {
      setSaving(true);
      setError("");

      if (!form.city.trim() || !form.address.trim()) {
        setError("Município e endereço são obrigatórios.");
        return;
      }

      const updated = await apiFetch<PropertyRecord>(`/properties/${property.id}`, {
        method: "PATCH",
        body: {
          city: form.city.trim(),
          neighborhood: form.neighborhood.trim() || null,
          address: form.address.trim(),
          totalValue: optionalNumber(form.totalValue),
          totalArea: optionalNumber(form.totalArea),
          bedrooms: optionalNumber(form.bedrooms),
          bathrooms: optionalNumber(form.bathrooms),
          garageSpots: optionalNumber(form.garageSpots),
          latitude: optionalNumber(form.latitude),
          longitude: optionalNumber(form.longitude),
          contactLink: form.contactLink.trim() || null,
          description: form.description.trim() || null,
        },
      });

      onSaved?.(updated);
      setEditing(false);
      setForm(formFromProperty(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o imóvel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => onSelect(previous.id)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-[#062650]"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <div className="text-center">
          <p className="text-sm text-slate-500">ID: {property.id}</p>
          <h3 className="mt-1 text-xl font-semibold text-[#062650]">{propertyTitle(property)}</h3>
        </div>
        <div className="flex items-center justify-center gap-2">
          {!readOnly && (
            <button
              onClick={toggleEditing}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-[#062650]"
            >
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editing ? "Cancelar" : "Editar"}
            </button>
          )}
          <button
            onClick={() => onSelect(next.id)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-[#062650]"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeImage ? (
        <div className="space-y-3">
          <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-lg bg-slate-100">
            <img src={activeImage} alt={propertyTitle(property)} className="h-full w-full object-cover" />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((current) => (current - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#062650] shadow"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setImageIndex((current) => (current + 1) % images.length)}
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#062650] shadow"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 flex max-w-[calc(100%-6rem)] -translate-x-1/2 flex-nowrap items-center justify-center gap-1.5 overflow-hidden rounded-full bg-black/40 px-3 py-2 shadow">
                  {visibleIndicators.map((index) => (
                    <button
                      key={index}
                      onClick={() => setImageIndex(index)}
                      className={[
                        "h-2.5 w-2.5 shrink-0 rounded-full transition",
                        index === imageIndex ? "scale-125 bg-white" : "bg-white/55 hover:bg-white",
                      ].join(" ")}
                      aria-label={`Ver imagem ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center rounded-lg bg-slate-100 text-sm text-slate-500">
          Sem imagem
        </div>
      )}

      {editing ? (
        <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
          {error && <div className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <EditField label="Município" value={form.city} onChange={(value) => setField("city", value)} />
            <EditField label="Bairro" value={form.neighborhood} onChange={(value) => setField("neighborhood", value)} />
            <EditField label="Endereço" value={form.address} onChange={(value) => setField("address", value)} />
            <EditField label="Valor total" value={form.totalValue} onChange={(value) => setField("totalValue", value)} inputMode="decimal" />
            <EditField label="Área total" value={form.totalArea} onChange={(value) => setField("totalArea", value)} inputMode="decimal" />
            <EditField label="Quartos" value={form.bedrooms} onChange={(value) => setField("bedrooms", value)} inputMode="numeric" />
            <EditField label="Banheiros" value={form.bathrooms} onChange={(value) => setField("bathrooms", value)} inputMode="numeric" />
            <EditField label="Garagem" value={form.garageSpots} onChange={(value) => setField("garageSpots", value)} inputMode="numeric" />
            <EditField label="Latitude" value={form.latitude} onChange={(value) => setField("latitude", value)} inputMode="decimal" />
            <EditField label="Longitude" value={form.longitude} onChange={(value) => setField("longitude", value)} inputMode="decimal" />
            <div className="xl:col-span-2">
              <EditField label="Link" value={form.contactLink} onChange={(value) => setField("contactLink", value)} />
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#062650]">Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#9db8ca]"
            />
          </label>
          <div className="flex justify-end">
            <button
              onClick={saveEdits}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#062650] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-base leading-7 text-slate-700">{property.description || "Descrição não informada pela origem."}</p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Município" value={property.city} />
            <Info label="Bairro" value={property.neighborhood || "-"} />
            <Info label="Endereço" value={property.address} />
            <Info label="Renda município" value={formatMoney(property.ibgeIncome)} />
            <Info label="Renda setor" value={renderCell("sectorIncome", property)} />
            <Info label="Quartos" value={property.bedrooms ?? "-"} />
            <Info label="Banheiros" value={property.bathrooms ?? "-"} />
            <Info label="Garagem" value={property.garageSpots ?? "-"} />
            <Info label="Área total" value={formatNumber(property.totalArea, " m²")} />
            <Info label="Valor total" value={formatMoney(property.totalValue)} />
            <Info label="Valor por m²" value={formatMoney(property.unitValue)} />
            <Info label="Latitude" value={property.latitude ?? "-"} />
            <Info label="Longitude" value={property.longitude ?? "-"} />
          </div>
        </>
      )}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#062650]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#9db8ca]"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#062650]">{value}</p>
    </div>
  );
}
