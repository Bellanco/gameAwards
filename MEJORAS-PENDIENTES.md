# Mejoras pendientes — TGA Ballot

Revisión global del código (junio 2026). Este archivo recoge lo que **queda por
hacer**. Lo ya implementado se resume al final.

> Cómo usarlo: cada ítem tiene **prioridad**, **dónde** y **qué hacer**. Empieza
> por la sección 1 (seguridad) y 2 (rendimiento); el resto es deuda técnica.

---

## 1. Seguridad y modelo de datos

- **[media] Validación incompleta del ballot en `firestore.rules`.**
  `isValidBallot` no comprueba el tipo de `season` ni de `userDisplayName`, ni
  acota el tamaño/contenido de `selections`. Un usuario puede escribir en *su
  propio* documento un `selections` arbitrario o enorme.
  → Endurecer: `d.season is int`, `d.userDisplayName is string`,
  `d.selections.size() <= <nº categorías>`. Recordar republicar las reglas
  (`firebase deploy --only firestore:rules`).

- **[baja] `closesAt` se guarda en hora local del admin.**
  `seasonService.setClosingDate()` hace `new Date('YYYY-MM-DDT23:59:59')`. Si el
  admin y los usuarios están en husos distintos, el cierre se desplaza.
  → Normalizar a una zona fija (p. ej. UTC o Europe/Madrid) o documentarlo.

---

## 2. Rendimiento y escalabilidad

- **[media] Guardado de ganadores N+1 y no atómico.**
  `WinnersPanel.handleSaveWinners` (y `useWinnerSelection.saveWinners`) hacen un
  `updateDoc` por categoría en un bucle. Si falla a mitad, quedan ganadores a
  medias.
  → Usar `writeBatch` (patrón ya presente en `seasonService.archiveAndResetSeason`).

- **[media] `useFirestoreBallots` carga todos los ballots sin paginación.**
  Correcto para cientos; problemático con miles.
  → Paginar con `limit()`/`startAfter()` o calcular agregados en servidor.

- **[baja] `AdminPanel` recalcula estadísticas en cada render** sin `useMemo`.
  → Memoizar `calculateStats` / `getValidBallots`.

---

## 3. Arquitectura y mantenibilidad

- **[media] Componentes > 300 líneas** (regla 6 del proyecto):
  `App.jsx` (~565), `CategoryManager.jsx` (562), `AdminPanel.jsx` (552),
  `WinnersPanel.jsx` (424).
  → Dividir AdminPanel en tabs (`OverviewTab`/`BallotsTab`/`SeasonTab`);
  CategoryManager en `CategoryList` + `CategoryForm`.

- **[media] Lógica de escritura a Firestore dentro de componentes admin**
  (CategoryManager, WinnersPanel) en vez de en servicios.
  → Extraer a `categoryService.js` / `winnersService.js` (como `seasonService`).

- **[media] Prop-drilling de `language/theme/onToggle*` por 9 pantallas.**
  → Crear `LanguageContext` + `ThemeContext` (o un `AppContext`).

- **[baja] `sortCategoriesByOrder` duplica el orden de `loadAndSortCategories`.**
  → Consolidar en una sola función.

---

## 4. UI / Accesibilidad / i18n (auditoría pendiente)

Lo concreto y seguro ya se hizo (ver «Hecho»). Queda lo que requiere criterio de
diseño o cambios amplios:

- **[media] Contraste WCAG AA.** Auditar pares texto/fondo con WebAIM
  (`text-slate-300` sobre `bg-slate-800/50`, bordes `border-slate-700`, etc.).
- ~~**[media] Focus trap completo en `Modal`.**~~ Eliminado: el primitivo `Modal`
  (junto con `Tabs` y `Select`) era código muerto sin consumidores y se borró. Si en
  el futuro hace falta un diálogo, créalo accesible desde el principio (foco inicial,
  ESC, focus trap del Tab) o valora una librería headless en su momento.
- **[media] Touch targets < 44px** en botones de tema/idioma y cierres.
- **[baja] `prefers-reduced-motion`** para desactivar animaciones
  (`animate-bounce`, `animate-pulse`, scroll smooth).
- **[baja] Sin PropTypes ni TypeScript.** Considerar migración progresiva a TS o
  añadir PropTypes a los componentes.
- **[baja] Escala tipográfica** no centralizada (tamaños ad-hoc por componente).
- **[baja] `GameCard` recibe ~16 props.** Agrupar por variante.
- **[baja] Detección de viewport duplicada.** Extraer `useViewport()`.
- **[baja] `NotFoundScreen` no usa `ScreenLayout`** como el resto de pantallas.
- **[baja] `src/styles/themes.css`** parece redundante con clases de `index.css`.
- **[baja] Participación fija al `100%`** en el Overview del AdminPanel
  (`AdminPanel.jsx`, tarjeta de participación). Calcular el valor real o quitarlo.
- **[baja] `App.handleLogin`** aún tiene mensajes de error de auth hardcodeados
  en español (mapa `errorMessages` + "Firebase no está configurado"). Pasarlos
  por i18n si se quiere coherencia total (son diagnósticos poco frecuentes).
- **[baja] `successMessage` en `App.submitBallot`** está hardcodeado y además no
  se muestra (SuccessScreen no usa la prop). Eliminar o mostrar vía i18n.

---

## 5. Baseline de ESLint — LIMPIO ✅

`npm run lint` (ESLint 9 flat config) reporta **0 problemas** (0 errores,
0 warnings). Histórico de lo corregido:

- **`react-hooks/rules-of-hooks` (3) en `VoteScreen`**: la validación defensiva
  se movió debajo de todos los hooks y los `useEffect` son null-safe.
- **`jsx-a11y` (6)**: `GameCard` (variante review) y filas de `Table` clicables
  son accesibles por teclado (`role="button"` + `tabIndex` + `onKeyDown`); el
  overlay de `Modal` es `aria-hidden` (cierre por teclado vía Escape).
- **`react-hooks/exhaustive-deps` (3)**: `loadWinners`/`calculateScores`
  (`WinnersPanel`) y `loadCategories` (`useFirestoreCategories`) envueltos en
  `useCallback` con sus dependencias. De paso, `useFirestoreCategories` ahora
  recarga al cambiar `includeInvalid` (antes lo ignoraba).
- **`no-unused-vars` (13)**: props/variables muertas eliminadas en
  `AdminPanel`, `GameCard`, `ReviewScreen`, `SuccessScreen`, `VoteScreen`,
  `WinnersPanel`.

> **No** se ha ejecutado `prettier --write .` sobre todo el repo para no generar
> un diff gigante; hazlo en un commit aparte de solo formato cuando convenga.

---

## 6. Build / tooling (opcional)

- **[baja] `vite.config.js`**: separar también `react`/`react-dom` en su propio
  chunk (`manualChunks`) además de `firebase`, para mejorar el cacheo.

---

## Hecho en esta revisión (referencia)

**Bloque 1 — defectos/quick wins:**
- `console.*` → `logger` en `App.jsx`, `AdminPanel`, `WinnersPanel` (y eliminado
  el log que volcaba el ballot).
- `setupGlobalErrorHandler` cableado en `main.jsx` (antes nunca se invocaba).
- Nuevo `ErrorBoundary` envolviendo `<App/>`.
- Borrado `gameImageService.js` (código muerto) y su uso en `App.jsx`.
- Borrado `iconComponents.js` (duplicado idéntico de `.jsx`).
- Claves i18n duplicadas eliminadas: `categoryTitle` y `cancel` (esta última la
  detectó ESLint).
- Import muerto de `trackError` en `errorService.js`.

**Bloque 5 — i18n/a11y concreto:**
- `Header` y `ControlBar`: textos de los botones de tema/idioma a i18n.
- `Modal`: ESC para cerrar, `role="dialog"`, `aria-modal`, foco al abrir.
- `Table`: prop `emptyText` (sin texto hardcodeado); `LoadingSpinner`: sin texto
  por defecto + `role="status"`.
- `WinnersPanel`: «Anónimo» → `t('anonymous')`.
- Asociación `label`/`input` (`htmlFor`/`id`) + `aria-invalid`/`aria-describedby`
  en `ReviewScreen` y en los primitivos `form/`.
- `ReviewScreen`: eliminado uso de `<Footer>` no importado (latente).

**Bloque 6 — tooling:**
- ESLint 9 (flat config) con React + hooks + jsx-a11y; Prettier configurado.
  Scripts: `lint`, `lint:fix`, `format`, `format:check`.
- Tests nuevos: `src/utils/scoring.test.js` y `src/utils/localize.test.js`
  (40 tests en verde).
