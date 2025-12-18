This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

/app
  /(public)
    /login/page.tsx
    /register/page.tsx
  /(private)                ← área autenticada (protegida por middleware)
    /layout.tsx
    /page.tsx               ← Dashboard simples / atalho para “Buscar”
    /search/page.tsx        ← Página principal do MVP (filtros + resultados)
    /evaluations/page.tsx   ← (Opcional no MVP) buscas salvas/recentes
/middleware.ts              ← redireciona não logados para /login
/components
  /search
    SearchForm.tsx          ← filtros
    ResultsTable.tsx        ← tabela de imóveis
    ColumnPicker.tsx        ← seleção de colunas (on/off)
    EditPropertyModal.tsx    ← edição rápida
    ExportButton.tsx        ← CSV/XLSX
    MapDrawer.tsx           ← mapa (drawer/modal)
  /ui                       ← botões, inputs (Tailwind/shadcn)
  /feedback                 ← EmptyState, ErrorState, Loading
/lib
  api.ts                    ← fetch/axios com baseURL e auth header
  auth.ts                   ← helpers de token (get/set/clear)
  validators.ts             ← schemas (zod) para filtros/login/etc.
  columns.ts                ← definição das colunas padrão
  storage.ts                ← persistência simples (localStorage)
  featureFlags.ts           ← habilitar/ocultar IBGE/Mapa no MVP
/hooks
  useAuth.ts                ← estado de sessão e user
  useSearch.ts              ← estado dos filtros e query
  useColumnsPref.ts         ← preferências de colunas
/providers
  QueryProvider.tsx         ← (se usar TanStack Query) – opcional
  ToastProvider.tsx
/styles
  globals.css               ← Tailwind
/types
  property.ts               ← tipos de Imóvel
  evaluation.ts             ← tipos de Avaliação
  ibge.ts                   ← (se mostrar dado IBGE simples)
