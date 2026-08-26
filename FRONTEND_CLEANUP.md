# Roadmap de limpieza — Clean Architecture Frontend (admin + ecommerce)

Objetivo: código mantenible con capas claras, sin duplicación ni código muerto.
Aplica a **admin** y **ecommerce**. Cada fase: cambiar → `tsc`/`lint` verde → commit.

## Capas (regla de dependencias, de arriba hacia abajo)
```
app/ (rutas)  →  components/ (presentacional)  →  hooks/ (lógica + data)  →  services/ (API)  →  lib|utils/ (puro)
```
- Nunca importar "hacia arriba" (un util no importa un componente).
- Componentes: presentacionales, sin `fetch`/axios directo → usan hooks.
- Hooks: react-query + lógica; devuelven datos + acciones.
- Services: única capa que habla con la API (axios).
- lib/utils: funciones puras (formateo, fechas, slug), sin React.

## Fases

**A — Código muerto + imports sin usar.** ✅
- ✅ Borrados 9 archivos muertos iniciales (secciones viejas del landing ecommerce + `admin/components/MergedLayout.tsx`).
- ✅ Auditoría de referencias (grep `from '…/basename'`) → borrados **34 archivos** sin importadores (incluye orfanados transitivos, re-escaneados hasta 0):
  - ecommerce (19): `SectionCard`, `ui/{drawer,empty,field-error,radix-select}`, `convocatoria/ApplicationStatus`, `payment/{CardForm,CardPreview,CardLogos,paymentUtils}`, `hooks/queries/{useArtistEvent,useEvents,useTickets}`, `lib/{brand,event}`, `data/artworks`, `services/{artists,copies}.service`, `ArtworkCard`.
  - admin (15): `AppShellSkeleton`, `dashboard/{CashierTable,ProductivityTable}`, `filters/dateFilter`, `Layout`, `StatCard`, `ui/{Breadcrumbs,UserProfile,RatingStars}`, `common/ImagePreviwer`, `orders/ManualOrderSearchTable`, `hooks/events/useArtistAutocomplete`, `hooks/usePavillionBySlug`, `services/artists.service`, `utils/splitName`.
- ✅ `next lint` verde en admin (arreglados unused `Divider` + eslint-disable muerto).
- ✅ **Unused imports/locals ecom** (no tiene ESLint) → detectados con `tsc --noUnusedLocals` y removidos 12: imports `Palette`, `UserIcon`, `useMemo`, `getApplicationById`, `MercadoPagoInfo`, `Phone`, `PayWithMercadoPagoPayload`, `InfiniteData`, `useRouter`; locales `errorArtists`, `sortDir`, `collectionStatus`. (`appStatus` = estado write-only pre-existente, se deja.)
- ✅ **Exports muertos** (`ts-prune`, basado en compilador, iterativo hasta converger): **131 símbolos** removidos — **65 ecom + 66 admin** (funciones de `order/ticket/payment.service` sin usar en el front, tipos huérfanos en cascada, hooks/consts/labels muertos). Mantenidos los usados (`createOrder`, `chargeMercadoPagoCard`, `payTicketsWithMercadoPago`, etc.) y todo lo que consume Next (`metadata`, `default`, `.next/**`). Verificado `tsc` exit 0 tras cada pasada + `next lint` admin limpio.
  - Nota: el prune cazó un bug propio previo — `cartera/page.tsx` usaba `formatDate` sin importarlo (se me escapó porque leía el exit del wrapper bash, no el de `tsc`). Corregido.

**B — Utils compartidos (DRY).** ✅ (dinero)
- ✅ `formatCOP` — dinero COP en un solo lugar (`ecommerce/src/lib/money.ts`, `admin/src/utils/money.ts`). **Reemplazadas las ~25 copias** de `Intl.NumberFormat("es-CO")` en ambos; `formatMoney` (ecom) delega a `formatCOP`.
- ✅ `formatDate` (`admin/src/utils/date.ts`) — fecha es-CO + guard `"—"`. Migrados los 7 sitios de admin (`account`, `users`, `cities`, `solicitudes`×2, `cartera`, `exportApplications`). Ecom solo tenía 2 usos → no amerita util.
- ✅ `slugify`/`initials`/`fullName` → **evaluados: no hay duplicación real** (los "matches" del grep eran heterogéneos: object-literals, comentarios, y `getInitials` ya existe). YAGNI, no se extrae.

**C — Services.**
- Toda llamada axios vive en `services/*`. Quitar `fetch`/axios sueltos de componentes.
- Tipos DTO junto al service.

**D — Custom hooks.**
- Extraer data-fetching + lógica repetida de componentes a `hooks/` (`useX`).
- Un hook por recurso (react-query) reutilizado en vez de copiar queries.

**E — Componentes atómicos.**
- Extraer UI repetida a `components/ui/` atómicos: `KpiCard`, `Pill`, `MoneyText`, `StatusChip`, botones, etc.
- Componer páginas con atómicos; nada de estilos inline duplicados.

**F — Consistencia.**
- Aliases de import (`@components`, `@services`, `@hooks`, `@lib`) en todo el código.
- Un patrón de carpeta por feature.

## Métrica de progreso
Duplicación de formateo dinero: ecommerce 17 archivos, admin 13 → objetivo: 0 (todos via `formatCOP`).
