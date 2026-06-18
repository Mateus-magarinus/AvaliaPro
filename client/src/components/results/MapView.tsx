"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";

export type MapPoint = {
  id: string | number;
  title: string;
  lat: number | null;
  lng: number | null;
  subtitle?: string | null;
};

type PoiCategory = "school" | "hospital" | "transport" | "park";

type Poi = {
  id: string;
  category: PoiCategory;
  name: string | null;
  lat: number;
  lng: number;
};

const POI_META: Record<PoiCategory, { label: string; color: string }> = {
  school: { label: "Escolas", color: "#f59e0b" },
  hospital: { label: "Hospitais", color: "#ef4444" },
  transport: { label: "Transporte", color: "#3b82f6" },
  park: { label: "Parques", color: "#22c55e" },
};

const POI_ORDER: PoiCategory[] = ["school", "hospital", "transport", "park"];

type LngLatBounds = {
  getSouth: () => number;
  getWest: () => number;
  getNorth: () => number;
  getEast: () => number;
};

type MapLibreMap = {
  addControl: (control: unknown, position?: string) => void;
  remove: () => void;
  getBounds: () => LngLatBounds;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>,
  ) => void;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
};

type MapLibreMapOptions = {
  container: HTMLElement;
  style: string;
  center: [number, number];
  zoom: number;
};

type MapLibrePopup = {
  setHTML: (html: string) => MapLibrePopup;
};

type MapLibreMarker = {
  setLngLat: (coordinates: [number, number]) => MapLibreMarker;
  setPopup: (popup: MapLibrePopup) => MapLibreMarker;
  addTo: (map: MapLibreMap) => MapLibreMarker;
  remove: () => void;
};

type MapLibreGlobal = {
  Map: new (options: MapLibreMapOptions) => MapLibreMap;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  Marker: new (options?: Record<string, unknown>) => MapLibreMarker;
  Popup: new (options?: Record<string, unknown>) => MapLibrePopup;
};

declare global {
  interface Window {
    maplibregl?: MapLibreGlobal;
  }
}

const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.css";

function ensureStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function ensureScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.maplibregl) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function num(v: number | string | null | undefined) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function poiDot(color: string): HTMLElement {
  const el = document.createElement("div");
  el.style.width = "12px";
  el.style.height = "12px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
  el.style.cursor = "pointer";
  return el;
}

export default function MapView({
  points,
  onOpenProperty,
}: {
  points: MapPoint[];
  onOpenProperty?: (id: string | number) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<MapLibreMap | null>(null);
  const poiMarkersRef = useRef<MapLibreMarker[]>([]);
  const onOpenRef = useRef(onOpenProperty);
  onOpenRef.current = onOpenProperty;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<PoiCategory>>(new Set());
  const [loadingPois, setLoadingPois] = useState(false);
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  const validPoints = useMemo(
    () =>
      points
        .map((point) => ({ ...point, lat: num(point.lat), lng: num(point.lng) }))
        .filter((point) => point.lat !== null && point.lng !== null),
    [points],
  );

  useEffect(() => {
    if (!key || !mapRef.current || validPoints.length === 0) return;

    let cancelled = false;

    async function bootMap() {
      try {
        ensureStylesheet(MAPLIBRE_CSS);
        await ensureScript(MAPLIBRE_JS);
        const maplibregl = window.maplibregl;
        if (cancelled || !mapRef.current || !maplibregl) return;

        const center: [number, number] = [
          validPoints.reduce((sum, point) => sum + Number(point.lng), 0) / validPoints.length,
          validPoints.reduce((sum, point) => sum + Number(point.lat), 0) / validPoints.length,
        ];

        instanceRef.current?.remove();
        const map = new maplibregl.Map({
          container: mapRef.current,
          style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`,
          center,
          zoom: validPoints.length > 1 ? 12 : 15,
        });
        instanceRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        validPoints.forEach((point) => {
          const detailBtn = onOpenRef.current
            ? `<button type="button" class="ap-detail-link" data-id="${escapeHtml(String(point.id))}" style="margin-top:6px;display:inline-block;background:#062650;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">Ver detalhes</button>`
            : "";
          new maplibregl.Marker({ color: "#062650" })
            .setLngLat([Number(point.lng), Number(point.lat)])
            .setPopup(
              new maplibregl.Popup({ offset: 20 }).setHTML(
                `<strong>${escapeHtml(point.title)}</strong><br>${escapeHtml(point.subtitle || "")}<br>${detailBtn}`,
              ),
            )
            .addTo(map);
        });

        // Enquadra todos os imóveis (centraliza na cidade em questão)
        if (validPoints.length > 1) {
          const lngs = validPoints.map((p) => Number(p.lng));
          const lats = validPoints.map((p) => Number(p.lat));
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 60, maxZoom: 15, duration: 0 },
          );
        }

        if (!cancelled) setReady(true);
      } catch {
        setFailed(true);
      }
    }

    bootMap();

    // Delegação: clique no botão "Ver detalhes" dentro do popup
    function handleDetailClick(event: MouseEvent) {
      const target = (event.target as HTMLElement)?.closest?.(".ap-detail-link");
      if (!target) return;
      const id = target.getAttribute("data-id");
      if (id && onOpenRef.current) onOpenRef.current(id);
    }
    document.addEventListener("click", handleDetailClick);

    return () => {
      cancelled = true;
      document.removeEventListener("click", handleDetailClick);
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];
      instanceRef.current?.remove();
      instanceRef.current = null;
      setReady(false);
    };
  }, [key, validPoints]);

  // Carrega/atualiza POIs quando categorias mudam ou o mapa se move
  useEffect(() => {
    const map = instanceRef.current;
    const maplibregl = window.maplibregl;
    if (!ready || !map || !maplibregl) return;

    let cancelled = false;

    async function refreshPois() {
      const mapInstance = instanceRef.current;
      const gl = window.maplibregl;
      if (!mapInstance || !gl) return;

      // limpa marcadores anteriores
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];

      if (activeCategories.size === 0) return;

      try {
        setLoadingPois(true);
        const b = mapInstance.getBounds();
        const params = new URLSearchParams({
          south: String(b.getSouth()),
          west: String(b.getWest()),
          north: String(b.getNorth()),
          east: String(b.getEast()),
          categories: Array.from(activeCategories).join(","),
        });

        const data = await apiFetch<{ pois: Poi[] }>(`/geo/pois?${params.toString()}`);
        if (cancelled || instanceRef.current !== mapInstance) return;

        data.pois.forEach((poi) => {
          const meta = POI_META[poi.category];
          if (!meta) return;
          const marker = new gl.Marker({ element: poiDot(meta.color) })
            .setLngLat([poi.lng, poi.lat])
            .setPopup(
              new gl.Popup({ offset: 14 }).setHTML(
                `<strong>${escapeHtml(poi.name || meta.label)}</strong><br><span style="color:${meta.color}">${meta.label}</span>`,
              ),
            )
            .addTo(mapInstance);
          poiMarkersRef.current.push(marker);
        });
      } catch {
        // silencioso — camada apenas não aparece
      } finally {
        if (!cancelled) setLoadingPois(false);
      }
    }

    refreshPois();

    // moveend é frequente — debounce para evitar rajada de chamadas ao Overpass
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refreshPois(), 900);
    };
    map.on("moveend", debouncedRefresh);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      map.off("moveend", debouncedRefresh);
    };
  }, [ready, activeCategories]);

  function toggleCategory(cat: PoiCategory) {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (validPoints.length === 0) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Nenhum imóvel retornou latitude e longitude.
      </div>
    );
  }

  if (!key || failed) {
    return <CoordinateFallback points={validPoints} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#062650]">Camadas:</span>
        {POI_ORDER.map((cat) => {
          const meta = POI_META[cat];
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                active ? "border-transparent text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              style={active ? { backgroundColor: meta.color } : undefined}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: active ? "#ffffff" : meta.color }}
              />
              {meta.label}
            </button>
          );
        })}
        {loadingPois && <span className="text-xs text-slate-400">carregando…</span>}
      </div>

      <div className="relative">
        <div ref={mapRef} className="h-[520px] w-full overflow-hidden rounded-lg border border-slate-200" />
        {activeCategories.size > 0 && (
          <div className="absolute bottom-3 left-3 rounded-md bg-white/95 px-3 py-2 text-xs shadow-md">
            <p className="mb-1 font-semibold text-[#062650]">Legenda</p>
            <div className="space-y-1">
              <LegendRow color="#062650" label="Imóveis" />
              {POI_ORDER.filter((c) => activeCategories.has(c)).map((c) => (
                <LegendRow key={c} color={POI_META[c].color} label={POI_META[c].label} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-700">{label}</span>
    </div>
  );
}

function CoordinateFallback({ points }: { points: MapPoint[] }) {
  const bounds = points.reduce(
    (acc, point) => ({
      minLat: Math.min(acc.minLat, Number(point.lat)),
      maxLat: Math.max(acc.maxLat, Number(point.lat)),
      minLng: Math.min(acc.minLng, Number(point.lng)),
      maxLng: Math.max(acc.maxLng, Number(point.lng)),
    }),
    { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 },
  );

  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.01);

  return (
    <div className="relative h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(90deg,#dbe8ef_1px,transparent_1px),linear-gradient(#dbe8ef_1px,transparent_1px)] bg-[size:48px_48px]">
      <div className="absolute left-5 top-5 rounded-md bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
        Configure <span className="font-semibold">NEXT_PUBLIC_MAPTILER_KEY</span> para carregar o mapa real.
      </div>
      {points.map((point) => {
        const left = ((Number(point.lng) - bounds.minLng) / lngRange) * 80 + 10;
        const top = (1 - (Number(point.lat) - bounds.minLat) / latRange) * 76 + 12;
        return (
          <div
            key={point.id}
            className="absolute -translate-x-1/2 -translate-y-full text-[#062650]"
            style={{ left: `${left}%`, top: `${top}%` }}
            title={point.title}
          >
            <MapPin className="h-8 w-8 fill-[#062650]" />
          </div>
        );
      })}
    </div>
  );
}
