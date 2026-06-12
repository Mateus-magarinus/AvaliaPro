"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, ImageIcon, Pencil, MapPin, Save, Table2, X } from "lucide-react";
import MapView, { MapPoint } from "./MapView";
import { apiFetch } from "@/lib/api";
import { EvaluationRecord, PropertyRecord } from "@/types/avaliapro";

type Tab = "table" | "details" | "map";

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
}: {
  evaluation: EvaluationRecord;
  properties: PropertyRecord[];
  onPropertyUpdated?: (property: PropertyRecord) => void;
}) {
  const [tab, setTab] = useState<Tab>("table");
  const [selectedId, setSelectedId] = useState<number | null>(properties[0]?.id ?? null);

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
          <p className="text-sm font-medium text-slate-500">Avaliação #{evaluation.id}</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#062650]">{evaluation.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {[evaluation.propertyType, evaluation.neighborhood, evaluation.city, evaluation.state].filter(Boolean).join(" - ")}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!properties.length}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#062650] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
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
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr className="text-[#062650]">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Município</th>
                      <th className="px-3 py-2">Bairro</th>
                      <th className="px-3 py-2">Endereço</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Área</th>
                      <th className="px-3 py-2">Quartos</th>
                      <th className="px-3 py-2">Link</th>
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
                        <td className="px-3 py-4">{property.city}</td>
                        <td className="px-3 py-4">{property.neighborhood || "-"}</td>
                        <td className="px-3 py-4">{property.address}</td>
                        <td className="px-3 py-4">{formatMoney(property.totalValue)}</td>
                        <td className="px-3 py-4">{formatNumber(property.totalArea, " m²")}</td>
                        <td className="px-3 py-4">{property.bedrooms ?? "-"}</td>
                        <td className="rounded-r-lg px-3 py-4">
                          {property.contactLink ? (
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
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "details" && selected && (
              <PropertyDetails
                property={selected}
                properties={properties}
                onSelect={setSelectedId}
                onSaved={onPropertyUpdated}
              />
            )}

            {tab === "map" && <MapView points={mapPoints} />}
          </>
        )}
      </div>
    </section>
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
}: {
  property: PropertyRecord;
  properties: PropertyRecord[];
  onSelect: (id: number) => void;
  onSaved?: (property: PropertyRecord) => void;
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
          <button
            onClick={toggleEditing}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-[#062650]"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? "Cancelar" : "Editar"}
          </button>
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
            <Info label="Renda IBGE" value={formatMoney(property.ibgeIncome)} />
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
