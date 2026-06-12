"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type MapPoint = {
  id: string | number;
  title: string;
  lat: number | null;
  lng: number | null;
  subtitle?: string | null;
};

type MapLibreMap = {
  addControl: (control: unknown, position?: string) => void;
  remove: () => void;
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

export default function MapView({ points }: { points: MapPoint[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<MapLibreMap | null>(null);
  const [failed, setFailed] = useState(false);
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
          new maplibregl.Marker({ color: "#062650" })
            .setLngLat([Number(point.lng), Number(point.lat)])
            .setPopup(
              new maplibregl.Popup({ offset: 20 }).setHTML(
                `<strong>${escapeHtml(point.title)}</strong><br>${escapeHtml(point.subtitle || "")}`,
              ),
            )
            .addTo(map);
        });
      } catch {
        setFailed(true);
      }
    }

    bootMap();

    return () => {
      cancelled = true;
      instanceRef.current?.remove();
      instanceRef.current = null;
    };
  }, [key, validPoints]);

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

  return <div ref={mapRef} className="h-[520px] w-full overflow-hidden rounded-lg border border-slate-200" />;
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
