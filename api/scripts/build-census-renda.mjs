#!/usr/bin/env node
/**
 * Gera o dataset de RENDA POR SETOR CENSITÁRIO consumido pelo CensusService.
 *
 * Dois modos:
 *
 * (A) CSV ÚNICO já com coordenadas (recomendado — via Base dos Dados/BigQuery):
 *     o CSV tem colunas de código do setor, latitude, longitude e renda.
 *     Não precisa de GeoJSON. O BD tem a geometria dos setores 2022, então o
 *     centróide sai por ST_CENTROID no próprio BigQuery (ver README).
 *
 *       node scripts/build-census-renda.mjs \
 *         --csv ./setores_renda_bd.csv \
 *         --csv-code-col code --csv-lat-col lat --csv-lng-col lng --csv-income-col income \
 *         --municipios 4314100 --out ./data/census-renda.json
 *
 * (B) GeoJSON (malha) + CSV de renda (clássico, p/ arquivos do FTP do IBGE):
 *     centróide calculado a partir dos polígonos do GeoJSON; renda do CSV.
 *
 *       node scripts/build-census-renda.mjs \
 *         --geojson ./setores.geojson --csv ./renda.csv \
 *         --csv-income-col V005 --municipios 4314100 --out ./data/census-renda.json
 *
 * O código do setor tem 15 dígitos; o município são os 7 primeiros.
 * O separador do CSV (',' ou ';') é detectado automaticamente.
 */
import fs from 'fs';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

function die(msg) {
  console.error('ERRO:', msg);
  process.exit(1);
}

const args = parseArgs(process.argv);
if (!args.csv) die('faltam argumentos: --csv é obrigatório');
if (!args['csv-income-col']) die('faltam argumentos: --csv-income-col é obrigatório');

const incomeCol = args['csv-income-col'];
const csvEncoding = args.encoding || 'utf8'; // BD/2022=utf8; 2010 do FTP=latin1
const outPath = args.out || './data/census-renda.json';
const latCol = args['csv-lat-col'];
const lngCol = args['csv-lng-col'];
const useCsvCoords = Boolean(latCol && lngCol);
const municipiosFilter = args.municipios
  ? new Set(args.municipios.split(',').map((s) => s.trim()))
  : null;

const CODE_FIELD_CANDIDATES = [args['code-field'], 'CD_SETOR', 'CD_GEOCODI', 'cd_setor'].filter(Boolean);
const CSV_CODE_CANDIDATES = [args['csv-code-col'], 'code', 'id_setor_censitario', 'Cod_setor', 'CD_SETOR'].filter(Boolean);

function normNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/^"|"$/g, '');
  if (s === '' || s.toUpperCase() === 'X' || s === '-') return null; // X = dado omitido
  // decimal pt-BR ("1.234,56") vs en ("1234.56")
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function detectDelimiter(headerLine) {
  const semis = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semis > commas ? ';' : ',';
}

function splitCsvLine(line, delim) {
  // parser simples com suporte a aspas
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === delim && !inQ) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ''));
}

// ---- carrega CSV de coordenadas (modo junção) ----
function loadCoords(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const ls = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!ls.length) die('coords-csv vazio');
  const d = detectDelimiter(ls[0]);
  const h = splitCsvLine(ls[0], d);
  const codeCol = args['coords-code-col'] || 'code';
  const latC = args['coords-lat-col'] || 'lat';
  const lngC = args['coords-lng-col'] || 'lng';
  const ci = h.findIndex((x) => x === codeCol);
  const li = h.findIndex((x) => x === latC);
  const gi = h.findIndex((x) => x === lngC);
  if (ci < 0 || li < 0 || gi < 0) {
    die(`coords-csv: colunas ${codeCol}/${latC}/${lngC} não encontradas (cabeçalho: ${h.join(', ')})`);
  }
  const m = new Map();
  for (let i = 1; i < ls.length; i++) {
    const cols = splitCsvLine(ls[i], d);
    const code = (cols[ci] ?? '').trim();
    const lat = normNumber(cols[li]);
    const lng = normNumber(cols[gi]);
    if (code && Number.isFinite(lat) && Number.isFinite(lng)) m.set(code, { lat, lng });
  }
  return m;
}

// ---- lê CSV ----
console.log('Lendo CSV:', args.csv, `(encoding=${csvEncoding})`);
const csvRaw = fs.readFileSync(args.csv, csvEncoding);
const lines = csvRaw.split(/\r?\n/).filter((l) => l.trim());
if (!lines.length) die('CSV vazio');
const delim = detectDelimiter(lines[0]);
const header = splitCsvLine(lines[0], delim);

const codeIdx = header.findIndex((h) => CSV_CODE_CANDIDATES.includes(h));
const incomeIdx = header.findIndex((h) => h === incomeCol);
const latIdx = useCsvCoords ? header.findIndex((h) => h === latCol) : -1;
const lngIdx = useCsvCoords ? header.findIndex((h) => h === lngCol) : -1;

if (codeIdx < 0) die(`coluna de código do setor não encontrada (tentei: ${CSV_CODE_CANDIDATES.join(', ')})`);
if (incomeIdx < 0) die(`coluna de renda "${incomeCol}" não encontrada`);
if (useCsvCoords && (latIdx < 0 || lngIdx < 0)) die(`colunas de lat/lng "${latCol}"/"${lngCol}" não encontradas`);

const rows = new Map(); // code -> { income, lat?, lng? }
for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i], delim);
  const code = (cols[codeIdx] ?? '').trim();
  const income = normNumber(cols[incomeIdx]);
  if (!code || income == null || income <= 0) continue;
  const rec = { income };
  if (useCsvCoords) {
    rec.lat = normNumber(cols[latIdx]);
    rec.lng = normNumber(cols[lngIdx]);
  }
  rows.set(code, rec);
}
console.log(`  ${rows.size} setores com renda.`);

// ---- monta dataset ----
const municipios = {};
let matched = 0;

function pushSetor(code, lat, lng, income) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const mun = code.slice(0, 7);
  if (municipiosFilter && !municipiosFilter.has(mun)) return;
  (municipios[mun] ??= []).push({
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    income: Number(income.toFixed(2)),
  });
  matched++;
}

if (args['coords-csv']) {
  // junção: renda vem do --csv; centróides vêm de outro CSV (ex.: export do BigQuery)
  const coordsMap = loadCoords(args['coords-csv']);
  console.log(`  ${coordsMap.size} setores com coordenadas.`);
  for (const [code, rec] of rows) {
    const c = coordsMap.get(code);
    if (c) pushSetor(code, c.lat, c.lng, rec.income);
  }
} else if (useCsvCoords) {
  for (const [code, rec] of rows) {
    pushSetor(code, rec.lat, rec.lng, rec.income);
  }
} else {
  if (!args.geojson) die('sem --csv-lat-col/--csv-lng-col é preciso passar --geojson para os centróides');
  console.log('Lendo GeoJSON de setores:', args.geojson);
  const geo = JSON.parse(fs.readFileSync(args.geojson, 'utf-8'));
  const features = Array.isArray(geo.features) ? geo.features : [];
  console.log(`  ${features.length} feições.`);

  const centroidOf = (geometry) => {
    let sx = 0, sy = 0, n = 0;
    const addRing = (ring) => {
      for (const [x, y] of ring) {
        if (Number.isFinite(x) && Number.isFinite(y)) { sx += x; sy += y; n++; }
      }
    };
    if (!geometry) return null;
    if (geometry.type === 'Polygon') addRing(geometry.coordinates[0] || []);
    else if (geometry.type === 'MultiPolygon') for (const poly of geometry.coordinates) addRing(poly[0] || []);
    return n ? { lng: sx / n, lat: sy / n } : null;
  };

  for (const f of features) {
    const props = f.properties || {};
    let code = null;
    for (const c of CODE_FIELD_CANDIDATES) {
      if (props[c] != null) { code = String(props[c]).trim(); break; }
    }
    if (!code) continue;
    const rec = rows.get(code);
    if (!rec) continue;
    const c = centroidOf(f.geometry);
    if (c) pushSetor(code, c.lat, c.lng, rec.income);
  }
}

const dataset = {
  version: `censo-import-${new Date().toISOString().slice(0, 10)}`,
  incomeVariable: incomeCol,
  municipios,
};

fs.mkdirSync(outPath.replace(/[^/\\]+$/, '') || '.', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(dataset));
console.log(`OK: ${matched} setores casados em ${Object.keys(municipios).length} municípios.`);
console.log(`Dataset escrito em ${outPath}`);
