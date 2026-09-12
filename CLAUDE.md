# CLAUDE.md — TGA Ballot

Guía para Claude Code al trabajar en este repositorio. Léela antes de tocar código.

## Qué es

App de votación interactiva para The Game Awards. Los usuarios entran con Google, votan
categoría por categoría, revisan y envían su porra (un voto por usuario). Hay un panel de
admin oculto en la ruta `/admin` para gestionar categorías, ganadores y resultados.

- **Stack**: React 19 + Vite 8 + Tailwind CSS 4 + Firebase 12 (Auth + Firestore + Analytics)
- **Requisitos**: Node >= 22.12 (lo exigen Vite 8 y Vitest 5) y, solo para `test:rules`, JDK >= 21.
- **Idioma del código y comentarios**: español (mantenerlo). Nombres de símbolos en inglés/camelCase.
- **Deploy**: hosting estático (CloudFlare Pages). Build → `dist/`.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # dev server en http://localhost:5173
npm run build      # build de producción a dist/ (minify + drop_console)
npm run preview    # previsualizar el build
npm test           # tests con Vitest (una pasada)
npm run test:watch # tests en modo watch
npm run test:rules # tests de firestore.rules contra el emulador (necesita **JDK 21+**:
                   # firebase-tools 15 aborta con Java 17; descarga firebase-tools
                   # con npx, NO depende de tenerlo instalado)
```

### Tests (Vitest)

- Runner: **Vitest 5** + React Testing Library 16, entorno `jsdom`. Config en `vite.config.js`
  (clave `test`); setup global en `src/test/setup.js` (matchers de `jest-dom` + `cleanup`).
- `describe/it/expect/vi` son **globales** (`test.globals: true`) — no hace falta importarlos.
- Para mockear módulos usa `vi.mock('ruta', factory)` (hoisted, como en jest). Ejemplo real
  en `src/hooks/hooks.test.js`: mockea `../firebase` (db + auth), `firebase/firestore`,
  `firebase/auth` y `../services/errorService`.
- Nombra los archivos `*.test.js` / `*.test.jsx` junto al código que prueban.

## Arquitectura

```
src/
├── App.jsx                  # Orquestador: estado de la app y cascada de pantallas
├── main.jsx                 # Entry point de React DOM
├── firebase.js              # Config Firebase (lee de import.meta.env) + lazy Analytics
├── index.css                # Directivas Tailwind
├── context/AppContext.jsx   # Idioma y tema (evita el prop-drilling por 9 pantallas)
├── components/              # Pantallas (VoteScreen, ReviewScreen, AdminPanel…)
│   ├── admin/               # Pestañas y sub-paneles del AdminPanel
│   ├── ui/                  # Primitivos (Button, Card, Alert, ThemeLanguageControls…)
│   ├── form/                # Inputs de formulario (TextInput) + index.js
│   └── layouts/             # ScreenLayout, ControlBar
├── hooks/                   # Hooks custom, reexportados desde hooks/index.js
├── services/                # Lógica sin UI: TODA escritura a Firestore vive aquí
├── data/
│   ├── literals.js          # índice i18n → useTranslation(language)
│   └── i18n/{es,en}.js      # textos (mismas claves en ambos)
├── styles/                  # theme-tokens.css + theme-semantic.css + theme-motion.css
└── utils/                   # helpers puros
```

### Dónde va cada cosa

- **Escrituras a Firestore → `services/`**, nunca en un componente. Ya existen
  `categoriesService` (cargar/guardar/borrar/reordenar), `ballotService` (enviar y comprobar
  voto), `winnersService` (ganadores en lote) y `seasonService` (calendario de la edición,
  publicación de resultados y reinicio anual).
  Así se pueden probar sin renderizar.
- **Lógica de estado con ciclo de vida → `hooks/`**: `useVotingFlow` (pasos, votos, progreso),
  `useAuthSession` (sesión y bloqueo de re-voto), `useViewport`, `useStepHistory`,
  `useSeasonControls` (calendario/publicación/reinicio del AdminPanel), `useSeasonResult`.
- **Cálculo puro → `utils/`**: `gridDensity` (columnas de la rejilla de nominados: calibración
  por ancho + reparto equilibrado, ver abajo), `closingDate` (instantes del calendario en
  Europe/Madrid), `votingSchedule` (semántica abierto/publicado), `options`, `sanitize`,
  `scoring`, `localize`, `routes`, `ballotEdits` (tope de modificaciones del voto).
- **Idioma y tema NO se pasan por props**: `useAppContext()`.

### Flujo de pantallas (controlado por `currentStep` en `App.jsx`)
- `-1` → Login
- `0..n-1` → Votación (una categoría por paso)
- `n` (= `validCategories.length`) → Revisión
- `99` → Éxito
- Ruta `/admin` → `AdminPanel` (salta el flujo; carga diferida con `lazy`)
- Bloqueo de re-voto: si el usuario ya tiene ballot en Firestore → `AlreadyVotedScreen`, que
  ofrece modificarlo si quedan cambios y la votación sigue abierta (`isEditingBallot` en
  `App.jsx` es lo que salta el bloqueo)
- Resultados publicados (llegó `resultsAt`) → `ResultsScreen` **pública**, por delante de todo
  el flujo (no exige sesión). Si aún no existe el snapshot `results/{season}`, se sigue a la
  cascada normal.
- Fuera de plazo (`isDeadlineReached`) → `DeadlineScreen` (antes de login y flujo). La misma
  pantalla cubre los dos extremos: `isScheduled` cuando la edición aún no ha abierto y cerrada
  cuando ya pasó el cierre.
- Sin categorías válidas → mensaje de aviso (no hay pantalla dedicada)

### Rutas

Solo hay **dos rutas declaradas**, en `src/utils/routes.js` (fuente única): `/` y `/admin`.
No se usa router; la navegación entre categorías es estado de React.

- **Cualquier ruta no declarada rebota a `/`** (`FALLBACK_ROUTE`) reescribiendo la URL con
  `history.replaceState`, sin dejar entrada en el historial. No hay pantalla 404.
- **`/admin` con sesión pero sin el claim `admin`** → `window.location.replace('/')`. No se
  muestra ningún aviso, para no confirmar que la ruta existe.
- **`/admin` sin sesión** → `LoginScreen` (es el mismo login que el flujo público).
- `public/_redirects` (`/* /index.html 200`) es **imprescindible**: sin él CloudFlare Pages
  devuelve un 404 estático en `/admin` y React no llega a arrancar.
- `public/_headers` lleva la CSP y las cabeceras de seguridad. La CSP autoriza el script
  anti-FOUC de `index.html` **por su hash sha256**: si tocas ese script hay que recalcularlo
  (el propio archivo trae el comando). `src/test/csp.test.js` falla si se olvida.
- **Botón «atrás» del navegador**: `useStepHistory()` empuja una entrada de historial por paso
  del flujo, así que «atrás» vuelve a la categoría anterior en vez de salir de la app. No
  cambia la URL. Si algún día se quieren URLs por paso (`/votar/3`), eso sí exige un router.

## Reglas del proyecto (no negociables)

1. **Estado en `App.jsx`** como única fuente de verdad; se pasa hacia abajo por props. No
   dispersar estado de votación en componentes hijos.
   - **Cuidado con el ORDEN de los hooks**: `useAuthSession` va antes que `useVotingFlow`
     (que lee `currentUser` y `route`), y la dependencia circular entre ambos —el callback de
     sesión restaura el progreso del flujo— se rompe con un ref (`restoreProgressRef`).
     Tenerlo al revés hacía que el primer render lanzara «Cannot access 'currentUser' before
     initialization», con la app entera cayendo en el ErrorBoundary.
2. **Nada de texto hardcodeado en la UI.** Toda cadena visible va en `src/data/i18n/es.js`
   **y** `en.js` (mismas claves camelCase) y se consume con `t('clave')` de `useTranslation`.
3. **Datos de categorías** viven en Firestore (colección `categories`), no en JSX. Carga vía
   `loadAndSortCategories()` de `services/categoriesService.js`.
4. **camelCase en todo**: variables, funciones, claves JSON de Firestore, nombres de evento.
   Componentes en PascalCase, archivos `.jsx`.
5. **Solo Tailwind 4, mobile-first** (`p-4 md:p-8`, no al revés). Sin CSS custom salvo animaciones.
   - Tailwind entra como **plugin de Vite** (`@tailwindcss/vite`), no por PostCSS: no hay
     `postcss.config.js` ni `autoprefixer` (v4 prefija por su cuenta).
   - La configuración **sigue en `tailwind.config.js`**, que v4 carga con `@config` desde
     `src/index.css`. No hace falta reescribirla en CSS.
   - Los tres CSS de tema se importan **sin `layer()`**: así las clases `.theme-*` conservan la
     precedencia que tenían en v3 sobre las utilidades (con `layer(base)`, un `border` suelto
     pisaba a `theme-border-primary`).
   - **`short:` (pantallas bajas) se declara con `@custom-variant` en `src/index.css`**, no en
     `screens`: v4 traduce mal los `screens` con `raw` del config legacy y genera
     `@media (width >= (max-height: 500px))`, que es inválido y rompe la minificación.
   Tema oscuro por defecto (`bg-slate-900/950`, acentos azul/esmeralda/amarillo).
   - `h-screen` y `min-h-screen` están redefinidos a **`100dvh`** en `tailwind.config.js`:
     `100vh` incluye la barra de direcciones del móvil y cortaba la fila de botones. Si
     necesitas el vh estático, usa `h-[100vh]` explícitamente.
   - Objetivo táctil mínimo **44×44 px** en controles de usuario (`min-h-[44px] min-w-[44px]`).
   - **Para compactar por falta de espacio vertical usa `short:` (max-height 500px), NUNCA
     `landscape:`**: un monitor de escritorio también es apaisado, así que `landscape:` dejaba
     la cabecera de cualquier escritorio con el título a 18px y 8px de margen lateral. Lo que
     escasea en un móvil tumbado es el alto, y eso es lo que mide `short` (`tailwind.config.js`).
   - **Ancho máximo del contenido**: `CONTENT_MAX_WIDTH_PX` (1680) en `utils/gridDensity.js`.
     En un monitor ultra-ancho estirar cinco tarjetas a 500px no mejora la lectura; el contenido
     se centra en vez de estirarse.
   - Los botones de tema/idioma NO se escriben a mano: usa `<ThemeLanguageControls>` de
     `components/ui` (estaban copiados en cuatro sitios, con `aria-label` en solo dos).
6. **Componentes < 300 líneas.** Si crece, divídelo: saca la lógica a un servicio o a un hook
   antes que trocear el JSX. Ninguno supera hoy el límite; comprueba con:
   `for f in $(find src -name "*.jsx" -o -name "*.js" | grep -v test); do ...` o simplemente
   revisando que lo que crece sea JSX y no lógica.
7. **async/await**, no cadenas `.then().then()`.
8. **Logging**: usa `import logger from 'services/loggerService'` (silencia en producción), no
   `console.*` directo. Errores de dominio → `logError(ERROR_TYPES.X, err, {context})` de
   `services/errorService.js`.
9. **Sin secretos en el código.** Config de Firebase desde `import.meta.env.VITE_*` (`.env.local`).

## Firebase / Firestore

- Auth: Google (`signInWithPopup`). El **UID de Firebase es el ID del documento** → garantiza
  un voto por usuario. Escribe con `setDoc(doc(db, "ballots", uid), data)`, tanto el envío
  inicial (`create`) como las correcciones (`update`): siempre el mismo documento, nunca uno
  nuevo. El voto **se puede modificar hasta el cierre, un máximo de 5 veces** (ver más abajo).
- Colecciones:
  - `ballots/{uid}` — voto del usuario. **Lectura solo dueño o admin** (no público).
  - `categories/{id}` — categorías bilingües (lectura pública, escritura admin).
  - `config/voting` — estado de la votación (lectura pública, escritura admin).
  - `results/{year}` — archivo de resultados por temporada (lectura pública, escritura admin).
  - `winners`/`surveyWinners` — compatibilidad legacy (lectura pública, escritura/borrado admin).
  - `admin/**` — configuración sensible (lectura y escritura solo admin).
- Reglas en `firestore.rules`. **Escritura valida `isOwner` o `isAdmin()`**; `ballots` valida
  esquema en el write. `delete` de ballots solo admin (reinicio anual). Si tocas el modelo de
  datos, actualiza también las reglas **y sus tests** (`npm run test:rules`, 37 casos contra el
  emulador). Publicar con `firebase deploy --only firestore:rules`.
- **El plazo de votación se valida en servidor**, no solo en el navegador: `allow create` de
  `ballots` llama a `votingIsOpen()`, que lee `config/voting` y comprueba `opensAtMillis` y
  `closesAtMillis` además de `isOpen`. Si `config/voting` no existe, se considera abierta
  (estado «aún sin configurar»). El esquema exige además que
  `userEmail == request.auth.token.email` (impide suplantar el correo de otra persona), que
  `season` sea entero y que `selections` no exceda 60 entradas.
- **Admin por custom claims** (`admin:true`), verificado por el servidor. `useAdminCheck()` lee
  `getIdTokenResult().claims.admin`. Para asignar el claim una vez (Admin SDK / CLI):
  ```js
  admin.auth().setCustomUserClaims(uid, { admin: true })
  // el usuario debe re-loguear para refrescar el token
  ```

### Modelo de datos (clave)

- **Votos y ganadores se guardan por `optionId`, NO por nombre** → independiente del idioma.
  El nombre se resuelve al mostrar con `getOptionLabel(category, optionId, language)`.
- Categoría bilingüe:
  ```js
  { title: { es, en },                                  // título bilingüe
    options: [ { id: "<docId>_option_0", name }, ... ],  // nombre de opción único
    optionIds: ["<docId>_option_0", ...],   // espejo plano por compatibilidad
    weight, orderIndex, winner: "<optionId>"|null, isActive }
  ```
- Voto:
  ```js
  { userId, userEmail, userNickname, userDisplayName,
    selections: { categoryId: "<optionId>" },
    season: <año>, submittedAt: ISO,   // primer envío, INMUTABLE
    updatedAt: ISO,                    // última escritura
    editCount: 0,                      // 0 al enviar, +1 por modificación
    isActive: true }
  ```
  `userNickname` = nombre de la cuenta de Google, se lee de `auth.currentUser` al enviar (no
  editable, no vive en estado). `userDisplayName` = nombre editable en `ReviewScreen` y **el
  único que valida `submitBallot`**. No añadas un segundo nombre en el estado de `App.jsx`.
- **`optionId` estable y único**: al guardar una categoría, los ids se construyen con
  `buildStableOptions()` de `src/utils/options.js`. Conserva el id de las opciones existentes y
  da uno irrepetible a las nuevas. **Nunca derives un `optionId` del índice del array**: borrar
  una opción y añadir otra reutiliza el id de una superviviente y corrompe votos y scoring.
- Helpers en `src/utils/localize.js` (`tField`, `getCategoryTitle`, `getOptionId`,
  `getOptionLabel`, `hasTitle`, **`resolveOptionId`**) y `src/utils/scoring.js`
  (`computeLeaderboard`, `scoreBallot`). **Usa `hasTitle(cat)` en vez de `cat.title.trim()`**
  (title es objeto).
- **Título de categoría bilingüe; nombres de juego en idioma único.** El CategoryManager edita
  el título en ES/EN, pero las opciones (juegos) se guardan como `{ id, name }` (un solo nombre).
  El `id` se conserva al editar para no romper optionId/scoring/votos.
- **Tolerancia legacy**: `tField`, `getOptionLabel` y `resolveOptionId` toleran datos antiguos
  (opción `{id,es,en}` o string plano) además del formato actual `{id,name}`, y el scoring/display
  normalizan con `resolveOptionId(category, value)`. Funcionan tanto con datos nuevos (optionId)
  como antiguos (nombre/título string), sin necesidad de migrar los datos existentes.
- **Histórico**: `useSeasonResults()` lee `results/{año}`; el AdminPanel tiene la pestaña
  **Histórico** que muestra, por edición, ganadores por categoría y la clasificación.

### Rejilla de nominados (adaptación a pantalla)

- Las categorías reales tienen **4-6 nominados** (la mayoría 5) con nombres de hasta ~46
  caracteres; `utils/gridDensity.js` está calibrado para 4-7 y funciona fuera de ese rango.
- `getGridColumns()` combina tres cosas: la calibración por ancho (tabla por rangos), las
  columnas que caben de verdad, y `balanceColumns()`, que **evita la fila huérfana**: con 6
  nominados y sitio para 5 columnas se reparte 3+3, no 5+1; con 7 y sitio para 6, 4+3. Entre
  repartos con las mismas filas gana el que deja la última fila más llena; menos filas siempre
  gana sobre mejor reparto (ver la categoría entera de un vistazo es lo primero).
- `estimateCardWidth()` da el ancho que le toca a cada tarjeta. **La densidad de la tarjeta
  (`compact`) se decide por ese ancho, no por el número de nominados**: cinco opciones en un
  monitor son tarjetas holgadas y las mismas cinco en una tablet, estrechas.
- **Sin scroll en móviles pequeños**: si con su proporción natural la rejilla no cabe (iPhone
  SE), `VoteScreen` deja de fijar el alto por `aspect-*` y reparte el área entre las filas
  (`grid-template-rows: repeat(n, 1fr)` + tarjeta `h-full`, contenedor `overflow-hidden`). Solo
  se activa cuando hace falta —si no, una fila llenaría toda la pantalla en un monitor— y solo
  si el reparto deja tarjetas legibles (`MIN_CARD_HEIGHT_PX`); por debajo de eso se prefiere el
  scroll. Fuera de ese modo se sigue acotando el alto con `maxHeightPx`.
- **El gap de la rejilla va en píxeles y en un solo sitio** (`rowGapPx` en `VoteScreen`), no en
  clases por breakpoint: lo comparten el reparto de alturas, el ancho por columna y el ancho de
  la tarjeta centrada, y con tres fuentes distintas se desincronizaban.
- **La selección se marca con una franja de acento en el borde inferior**, más borde y halo, no
  con un icono flotante: el check en la esquina se montaba sobre la primera línea del nombre en
  tarjetas pequeñas. El estado va también en `aria-pressed`.

### Modificar el propio voto (máximo 5 veces)

- El voto dejó de ser inmutable: se puede corregir **mientras la votación siga abierta** y
  mientras queden modificaciones. Sigue habiendo **un voto por persona**: se reescribe el mismo
  `ballots/{uid}`, nunca se crea otro documento.
- El tope lo cuenta el SERVIDOR con `editCount`: `firestore.rules > isValidBallotEdit` exige que
  el contador entrante sea **exactamente** el anterior + 1 y que no pase de `maxBallotEdits()`
  (5). Si solo se comprobara «no pasar de 5», el cliente reenviaría siempre `editCount: 1` y
  editaría sin fin. Al editar tampoco pueden cambiar `userId`, `season` ni `submittedAt`.
- `src/utils/ballotEdits.js` es el espejo para la UI (`MAX_BALLOT_EDITS`, `getRemainingEdits`,
  `canEditBallot`). **El 5 está en dos sitios** (util y reglas): si cambias uno, cambia el otro
  y sus tests.
- **Sin lecturas extra**: `ballotService.fetchUserBallot()` sustituye al antiguo
  `hasExistingBallot()` y trae el documento completo en la misma única lectura por sesión que ya
  se hacía. De ahí salen las tres cosas: si ya votó, qué votó y cuántas modificaciones le
  quedan. Tras enviar o corregir, `App` guarda en estado el documento recién escrito
  (`setExistingBallot`) en vez de releer.
- Flujo: `AlreadyVotedScreen` y `SuccessScreen` ofrecen «Modificar mi voto» solo si
  `canEditBallot(...)`; se entra por `ReviewScreen` (`isEditing`), con los votos guardados
  recargados mediante `selectionsToVotes()` de `utils/localize.js` (resuelve optionId → nombre y
  descarta categorías que ya no existen). `isEditingBallot` en `App.jsx` es lo que deja pasar
  del bloqueo de re-voto.
- Los ballots emitidos **antes** de esta feature no tienen `editCount`: cuentan como 0, así que
  conservan sus 5 modificaciones. No hace falta migrar nada.

### Calendario de la edición y reset anual

- `config/voting = { isOpen, season, opensAt, opensAtMillis, closesAt, closesAtMillis,
  resultsAt, resultsAtMillis, updatedAt }`. La app lo lee con `useVotingConfig()` y lo
  **interpreta** en `utils/votingSchedule.js` (puro y con tests):
  - `isVotingOpenNow(config)` → se puede votar si estamos entre `opensAt` y `closesAt` **y** el
    admin no ha forzado el cierre. Una fecha ausente no restringe.
  - `areResultsPublished(config)` → resultados públicos desde `resultsAt`. **Sin fecha no se
    publica nada** (si no, la clasificación saldría al marcar el primer ganador).
  - `getVotingState(config)` → `scheduled | open | closed`, para la UI del panel.
- **Las fechas mandan; `isOpen` solo cierra.** El botón de la pestaña Temporada es un cierre
  forzado: puede cerrar antes de tiempo, pero poner `isOpen: true` no habilita el voto fuera de
  la ventana, ni en el cliente ni en las reglas. La misma regla vive en `votingConfigAllows()`
  de `firestore.rules`; si cambias una, cambia la otra.
- **Cada fecha viaja en DOS formatos y siempre juntos**: `<x>At` (ISO) lo lee el cliente para
  mostrar; `<x>AtMillis` (epoch) lo comparan las reglas, que no saben parsear una cadena ISO.
  Escribir uno sin el otro deja el plazo sin efecto en servidor. Los construye
  `buildScheduleFields()` de `utils/closingDate.js`, que fija los instantes en **Europe/Madrid**
  (no en la hora local del administrador): apertura a las 00:00 del día elegido, cierre y
  resultados a las 23:59:59.999. `toVotingZoneDay()` hace el camino inverso para los inputs.
- El admin fija el calendario en la pestaña **Temporada** (`seasonService.setVotingSchedule`),
  con tres `<input type="date">` y un preset de prueba «hoy / +7 / +14 días» para ensayar una
  edición completa sin depender de diciembre. Un día vacío quita esa fecha.
- Guardar una apertura **futura** levanta un cierre forzado previo (`isOpen: true`), para que la
  fecha elegida sirva de algo. Solo con apertura futura: editar el calendario de una edición que
  el admin cerró antes de tiempo no la reabre (`useSeasonControls.saveSchedule`).
- **Publicación de resultados**: `ballots` NO es de lectura pública, así que un visitante no
  puede calcular la clasificación. `seasonService.publishSeasonResults()` escribe el snapshot
  público `results/{season}` (ganadores + `computeLeaderboard` + foto de las categorías) sin
  borrar nada, y se llama al **guardar el calendario** y al **guardar ganadores**. `resultsAt`
  decide *cuándo* se muestra; el snapshot decide *qué* se muestra. Por eso la pestaña Histórico
  también enseña la edición en curso, marcada como tal (`closedAt` solo lo escribe el archivado).
- El reinicio (`seasonService.archiveAndResetSeason`) archiva ganadores + clasificación en
  `results/{año}` y luego **borra** todos los `ballots`; después avanza la temporada, deja la
  votación cerrada y **limpia el calendario** (heredarlo cerraría o publicaría la nueva edición
  en el momento equivocado).

## Convenciones de commits

`<tipo>(<scope>): <asunto>` — tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`.
Ej.: `fix(auth): resolver error de UID en Firebase`. No commitees ni hagas push salvo que se pida.

## Agentes (`.claude/agents/`)

Agentes especializados con el contexto del proyecto precargado. Delega en ellos por dominio.
**`CLAUDE.md` (este archivo) es la fuente única de verdad**; los agentes son guías de trabajo
que apuntan aquí para los hechos volátiles (modelo de datos, rutas, scripts).

| Agente | Modelo | Cuándo usarlo |
|---|---|---|
| `feature-builder` | sonnet | Construir/refactorizar UI React, pantallas, hooks, flujo de votación, bugs de estado. |
| `firebase-guardian` | sonnet | Firestore (lecturas/escrituras/queries), modelo de datos, `firestore.rules`, Auth. |
| `content-i18n` | haiku | Categorías/nominados y textos i18n (ES/EN); auditar paridad de claves. |
| `agent-maintainer` | sonnet | Resincronizar agentes + este `CLAUDE.md` contra el código (anti-drift). |

### Protocolo de mantenimiento (mantener el contexto al día)

Los archivos de agente son estáticos: no se actualizan solos. Para que su contexto no quede
obsoleto a medida que la app evoluciona:

1. Mantén **este `CLAUDE.md`** al día cuando cambies arquitectura, modelo de datos, rutas o
   scripts. Los agentes delegan aquí lo volátil, así que esto los mantiene correctos.
2. Tras un cambio estructural relevante (o periódicamente), invoca al agente **`agent-maintainer`**
   para auditar drift y resincronizar `CLAUDE.md` + agentes con el código real. Devuelve un
   informe de qué corrigió y qué requiere decisión humana.

## Referencias

- Estándares detallados: `.github/instructions/tga-ballot-standards.instructions.md`
- Analytics y manejo de errores: `ANALYTICS_SETUP.md`
- Setup general y troubleshooting: `README.md`

## Pendientes conocidos / cuidado

- Los hooks async (`useFirestoreCategories`, `useFirestoreBallots`) actualizan estado tras el
  render inicial; si se añaden aserciones sobre el estado resuelto, usar `waitFor`.
- **Dos dependencias están congeladas a propósito** (`npm outdated` las seguirá señalando):
  - **ESLint 9** (hay 10): `eslint-plugin-react` admite hasta `^9.7` y `eslint-plugin-jsx-a11y`
    hasta `^9`. Subir a 10 rompe la instalación hasta que esos plugins publiquen soporte.
- `react-hooks/set-state-in-effect` (regla nueva del plugin 7, del React Compiler) está en
  **warn**: la marcan los 11 hooks/pantallas que cargan datos en un efecto. Funciona, pero
  quitarla exigiría rediseñar la carga de datos (Suspense o `useSyncExternalStore`).
- El acceso admin requiere asignar el custom claim `admin:true` (ver comando arriba) **antes**
  de poder leer `ballots` o escribir categorías/config. Sin el claim, `/admin` redirige a `/`.
- **El paso del tiempo no se refresca solo**: el estado (abierta / cerrada / resultados) se
  evalúa en cada render con `Date.now()`. `config/voting` sí llega en vivo (`onSnapshot`), así
  que un cambio del admin se ve al instante; pero si la pestaña está abierta cuando *vence* una
  fecha, hay que recargar para ver el cambio. Suficiente con fechas por día; si algún día se
  quiere precisión de minutos, hará falta un temporizador en `App.jsx`.
- El bundle principal es grande (Firebase). `AdminPanel` ya se carga con `lazy()` (code-splitting).
  Si importa reducir más, valorar `manualChunks` en `vite.config.js` para separar `firebase` y `react`.
