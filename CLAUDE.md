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
npm run share-card # regenera public/share-card.jpg desde el SVG (tarjeta al compartir el enlace)
npm test           # tests con Vitest (una pasada)
npm run test:watch # tests en modo watch
npm run test:rules # tests de firestore.rules contra el emulador (necesita **JDK 21+**:
                   # firebase-tools 15 aborta con Java 17; descarga firebase-tools
                   # con npx, NO depende de tenerlo instalado)
npm run test:e2e   # e2e con Playwright contra los emuladores (Auth + Firestore):
                   # votación, resultados y accesibilidad. Necesita JDK 21+ y
                   # `npx playwright install chromium` la primera vez.
npm run test:e2e:ui # lo mismo, con la interfaz de Playwright para depurar
```

### Tests (Vitest)

- Runner: **Vitest 5** + React Testing Library 16, entorno `jsdom`. Config en `vite.config.js`
  (clave `test`); setup global en `src/test/setup.js` (matchers de `jest-dom` + `cleanup`).
- `describe/it/expect/vi` son **globales** (`test.globals: true`) — no hace falta importarlos.
- Para mockear módulos usa `vi.mock('ruta', factory)` (hoisted, como en jest). Ejemplo real
  en `src/hooks/hooks.test.js`: mockea `../firebase` (db + auth), `firebase/firestore`,
  `firebase/auth` y `../services/errorService`.
- Nombra los archivos `*.test.js` / `*.test.jsx` junto al código que prueban.

### Pruebas e2e (Playwright)

- Viven en `e2e/` y corren contra los **emuladores** de Firebase (Auth + Firestore), nunca
  contra el proyecto real: `npm run test:e2e` levanta los emuladores, arranca Vite con
  `VITE_USE_EMULATORS=true` y ejecuta Playwright. El `projectId` es de mentira
  (`tga-ballot-e2e`), así que ninguna prueba puede tocar datos de producción.
- `src/firebase.js` se conecta a los emuladores **solo** con esa variable; en el build de
  producción Vite la resuelve a `false` y el bloque no llega al bundle (verificado).
- `e2e/helpers.js` siembra Firestore por su API REST con el token `owner` (se salta las
  reglas) y pasa por el login de Google del emulador, así que el recorrido es el real,
  `signInWithPopup` incluido.
- Cubren: votar de punta a punta (y **qué se guarda**: selecciones por optionId, `season`,
  `editCount`), bloqueo de re-voto, corrección del voto con su contador, fuera de plazo,
  edición programada y publicación de resultados. Cada prueba se ejecuta en escritorio y en
  un viewport de 320×568.
- **El panel de admin también** (`e2e/admin.spec.js`): que sin el claim no se entra, que con él se
  ve el panel, y el **ciclo de vida entero de una edición** —abrir (con su par ISO+epoch), cerrar,
  marcar ganadores y publicar—, comprobando en Firestore lo que de verdad importa: que el ganador
  NO queda en `categories` (pública), que guardar ganadores no publica nada, y que al publicar el
  archivo lleva `closedAt`, los votos se borran y la clasificación no incluye ningún UID.
  **Ojo al escribir un test del panel**: `signInAsAdmin` hace el primer login desde la PORTADA, que
  necesita la votación abierta; si el test quiere otro estado, se siembra DESPUÉS de entrar.
- El claim `admin:true` se pone con `grantAdminClaim()` (API del emulador, equivalente local de
  `setCustomUserClaims`). Hacen falta **dos pasadas por el login**: el claim solo se puede poner
  sobre una cuenta que ya exista y el token del primer login no lo lleva — igual que en
  producción, donde hay que volver a iniciar sesión tras recibirlo.

### Accesibilidad

- `src/test/contrast.test.js` calcula el contraste WCAG de los **tokens reales** del tema (los
  lee de `theme-tokens.css`) en los dos temas: texto sobre fondo, colores de estado, botón de
  acento, borde de control y el nombre del nominado sobre su tarjeta con el velo aplicado.
- `e2e/a11y.spec.js` pasa **axe** (WCAG 2.1 A y AA) sobre las pantallas ya pintadas —login,
  votación, revisión, cierre y resultados— en tema claro y oscuro, exigiendo cero violaciones.
- Reglas que salieron de esa auditoría y hay que mantener:
  - **Un solo `<h1>` por pantalla**: `Header` solo pinta el suyo si recibe `title`, porque las
    pantallas de cierre, éxito y voto emitido ya llevan el suyo en el contenido.
  - **Un solo landmark `main`**: lo pone `ScreenLayout`; dentro van `<section>`.
  - **`.theme-border-control`** (no `theme-border-primary`) en inputs y botones: WCAG 1.4.11
    pide 3:1 y `--border-primary` se queda en 2.5.
  - Iconos SVG con `aria-hidden="true"` (son decorativos; el nombre accesible lo da el texto o
    el `aria-label` del botón).

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
  voto), `winnersService` (ganadores en `admin/winners` + migración del modelo antiguo) y
  `seasonService` (ciclo de vida de la edición: abrir, cerrar y publicar/archivar).
  Así se pueden probar sin renderizar.
- **Lógica de estado con ciclo de vida → `hooks/`**: `useVotingFlow` (pasos, votos, progreso),
  `useAuthSession` (sesión y bloqueo de re-voto), `useViewport`, `useStepHistory`,
  `useSeasonControls` + `useSeasonPreview` (abrir/cerrar/publicar la edición y la vista previa de
  lo que se va a publicar), `useSeasonResult`.
- **Cálculo puro → `utils/`**: `gridDensity` (columnas de la rejilla de nominados: calibración
  por ancho + reparto equilibrado, ver abajo), `closingDate` (instantes del calendario en
  Europe/Madrid), `votingSchedule` (semántica abierto/publicado), `pseudonym` (huella del UID
  para la clasificación publicada), `authErrors` (código de Firebase Auth → clave i18n, compartido
  por el login público y el del panel), `options`, `sanitize`,
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
- Resultados publicados → `ResultsScreen`, por delante del resto del flujo **salvo que haya una
  edición abierta**: mientras se pueda votar, se vota. Muestra **solo la última edición cerrada**,
  resuelta por `config/voting.lastPublishedId`; si no existe el archivo, se sigue a la cascada.
  **Exige sesión**: quien llega sin ella ve el `LoginScreen` con `purpose="results"` (otro texto:
  no viene a votar, viene a ver quién ganó).
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
  - `config/voting` — estado de la votación (lectura pública, escritura admin). **Solo este
    documento** es público bajo `config/`: el resto de la colección es admin (antes había un
    comodín que abría a lectura anónima cualquier documento futuro).
  - `results/{seasonId}` — archivo de una edición. **La lectura NO es pública**: hace falta
    sesión (`request.auth != null`) **y** que la edición esté publicada — archivada (`closedAt`,
    que solo escribe la publicación) o con su `resultsAt` cumplido, para las ediciones del modelo
    anterior. El admin lee siempre. La clave
    es el **identificador de la edición**, no el año: así caben varias en el mismo año.
  - `winners`/`surveyWinners` — compatibilidad legacy, **solo admin** (eran públicas, y por su
    propio nombre cualquier dato dentro sería un ganador filtrado).
  - `admin/**` — configuración sensible (lectura y escritura solo admin). Aquí vive
    **`admin/winners`**, el documento único con los ganadores de la edición en curso.
- Reglas en `firestore.rules`. **Escritura valida `isOwner` o `isAdmin()`**; `ballots` valida
  esquema en el write. `delete` de ballots solo admin (reinicio anual). Si tocas el modelo de
  datos, actualiza también las reglas **y sus tests** (`npm run test:rules`, 50 casos contra el
  emulador). Publicar con `firebase deploy --only firestore:rules`.
- **El plazo de votación se valida en servidor**, no solo en el navegador: `allow create` de
  `ballots` llama a `votingIsOpen()`, que lee `config/voting` y comprueba `opensAtMillis` y
  `closesAtMillis` además de `isOpen`. Si `config/voting` no existe, se considera abierta
  (estado «aún sin configurar»). El esquema exige además que
  `userEmail == request.auth.token.email` (impide suplantar el correo de otra persona), que
  `season` sea entero, que `selections` no exceda 60 entradas y que **el texto de todas las
  selecciones sumado** no pase de 3600 caracteres (`selections.values().join('')`): contar solo
  las claves dejaba escribir decenas de KB por entrada hasta llenar el documento.

- **Los ganadores NO viven en `categories`.** Esa colección tiene que ser de lectura pública para
  poder votar, y las reglas de Firestore protegen documentos enteros, no campos sueltos: un
  `winner` ahí era el resultado de la porra al alcance de cualquiera, sin sesión siquiera, desde
  que el admin lo marcaba. Viven en **`admin/winners`** (`{ winners: { categoryId: optionId } }`),
  y el único canal público es el snapshot `results/{seasonId}`, que las reglas no dejan leer hasta
  `resultsAt`. `winnersService.saveWinners()` **migra solo**: escribe el documento nuevo y borra el
  campo `winner` de las categorías que aún lo tengan.
- **La publicación de resultados se valida en servidor**, igual que el plazo de votación: un
  archivo de `results` solo se lee **con sesión** y si lleva `closedAt` (edición ya publicada) o
  si la config marca su fecha de publicación (ver `resultsArePublished()` / `isArchivedSeason()`
  en `firestore.rules`). Ya no hay snapshots de la edición viva que filtrar, y la lista de
  participantes deja de estar en internet abierto.
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
    weight, orderIndex, isActive }
  // OJO: ya NO lleva `winner`. Los ganadores están en `admin/winners`.
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
  (`computeLeaderboard`, `scoreBallot`), que reciben el **mapa de ganadores** como tercer
  parámetro (`category.winner` queda solo como respaldo para archivos históricos).
  **Usa `hasTitle(cat)` en vez de `cat.title.trim()`** (title es objeto).
- **Título de categoría bilingüe; nombres de juego en idioma único.** El CategoryManager edita
  el título en ES/EN, pero las opciones (juegos) se guardan como `{ id, name }` (un solo nombre).
  El `id` se conserva al editar para no romper optionId/scoring/votos.
- **Tolerancia legacy**: `tField`, `getOptionLabel` y `resolveOptionId` toleran datos antiguos
  (opción `{id,es,en}` o string plano) además del formato actual `{id,name}`, y el scoring/display
  normalizan con `resolveOptionId(category, value)`. Funcionan tanto con datos nuevos (optionId)
  como antiguos (nombre/título string), sin necesidad de migrar los datos existentes.
- **Identidad de la edición**: `config/voting` lleva `seasonId` (clave del archivo) y
  `seasonName` (nombre visible). `utils/seasonId.js` los normaliza: `toSeasonId()` convierte un
  texto en slug, `getSeasonId(config)` cae al año si no hay id y `getSeasonLabel()` cae al año
  si no hay nombre. Las ediciones archivadas antes de esto **no necesitan migración**: su
  documento está en `results/{año}` y se sigue leyendo igual.
- **La clasificación solo la ve quien tiene sesión**, y aun así no lleva el UID de nadie. `buildSeasonSnapshot` quita `userId`
  de cada entrada y deja `uidHash` (`utils/pseudonym.js`): basta para que la pantalla resalte la
  fila propia (`isOwnEntry`) y evita publicar una lista de identificadores reales junto a los
  nombres. Los archivos anteriores, que sí guardaban `userId`, se siguen leyendo igual.
- **Pestañas del panel** (6): Resumen, Votos, Categorías, Ganadores, Histórico y Temporada. NO
  hay pestaña «Ranking»: la clasificación se ve donde hace falta —como vista previa antes de
  publicar, en Temporada— y después en el Histórico, que es lo mismo que ve el público.
- **Histórico**: `useSeasonResults(enabled)` lee la colección `results` — es una lectura de
  **admin**; la pestaña **Histórico** del
  AdminPanel es una LISTA de ediciones y al entrar en una se abre su detalle completo
  (`admin/HistoryDetail.jsx`): todos los ganadores y toda la clasificación.
  - De un archivo **solo se puede cambiar el nombre** (`renameSeasonResult`). Ganadores y puntos
    son el resultado histórico y no se pueden recalcular: los votos de esa edición se borraron
    al reiniciarla, así que tocarlos dejaría el archivo incoherente.
  - Cambiar el `seasonId` de la edición en curso hace que la siguiente publicación cree un
    archivo NUEVO en vez de reescribir el anterior. Es lo que permite «Porra TGA 2026» y
    «Porra de verano 2026» a la vez.

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

### Ciclo de vida de una edición (pestaña Temporada)

Una edición tiene **tres momentos y una sola fecha**. La pestaña Temporada enseña UN paso cada
vez, el que toca, y de cada uno sale una acción (`SEASON_STAGE` en `utils/votingSchedule.js`):

| Momento | Cómo se reconoce | Acción |
|---|---|---|
| `NONE` — no hay edición | `closesAtMillis == null` | **Abrir votación**: nombre + día de cierre |
| `OPEN` — se está votando | `isVotingOpenNow()` | **Cerrar ahora** (opcional: la fecha lo hace sola) |
| `PENDING` — cerrada sin publicar | hay fecha, pero ya no se vota | **Publicar en el histórico** |

- **Lo que distingue «hay edición» de «no la hay» es la fecha de cierre**: abrirla la fija,
  publicarla la borra. No hace falta ninguna marca extra, y por eso el ciclo vuelve solo al
  principio.
- `config/voting = { isOpen, season, seasonId, seasonName, closesAt, closesAtMillis,
  lastPublishedId, updatedAt }`. La fecha viaja en **dos formatos y siempre juntos**: `closesAt`
  (ISO) lo lee el cliente para mostrar; `closesAtMillis` (epoch) lo comparan las reglas, que no
  saben parsear una cadena ISO. Escribir uno sin el otro deja el plazo sin efecto en servidor. Los
  construye `buildScheduleFields()` de `utils/closingDate.js`, que fija el instante en
  **Europe/Madrid** (no en la hora local del administrador): cierre a las 23:59:59.999.
- **Las fechas mandan; `isOpen` solo cierra.** «Cerrar ahora» es un cierre forzado: adelanta el
  cierre, pero poner `isOpen: true` no habilita el voto fuera de la ventana, ni en el cliente ni en
  las reglas (`votingConfigAllows()` en `firestore.rules`; si cambias una, cambia la otra).
- **Publicar = archivar = hacer público.** `seasonService.publishAndArchiveSeason()` escribe
  `results/{seasonId}` con `closedAt` —que es lo que las reglas dejan leer sin sesión—, **borra
  todos los ballots** (hace falta: el bloqueo de re-voto va por usuario, así que sin borrar nadie
  podría volver a votar), vacía los nominados de las categorías, borra `admin/winners` y deja
  `config/voting` sin fecha de cierre y con `lastPublishedId` apuntando al archivo.
- **Mientras la edición está viva NO existe ningún snapshot público.** Guardar ganadores ya no
  publica nada. Antes se reescribía `results/{seasonId}` en cada guardado y la publicación
  dependía de una fecha que solo miraba el navegador: los ganadores y la clasificación se podían
  leer con un `curl` antes de anunciarlos.
- El público encuentra el archivo por `lastPublishedId`, con **una sola lectura por id**: listar
  `results` sería frágil, porque una consulta que tope con un documento que las reglas no dejan
  leer falla entera.
- **Las ediciones anteriores a este cambio no necesitan migración**: `opensAt`/`resultsAt` se
  siguen respetando si existen (`isVotingOpenNow` los mira), simplemente ya no se piden.
- `utils/votingSchedule.js` es puro y con tests: `isVotingOpenNow`, `getSeasonStage`,
  `areResultsPublished` (mira `lastPublishedId`, ya no una fecha) y `validateClosingDay`.

### Previsualización al compartir el enlace (Open Graph)

- Pegar la URL en WhatsApp, Slack, X o LinkedIn muestra una tarjeta con título, descripción e
  imagen. Las etiquetas están en `index.html` (`og:*` y `twitter:*`) y la imagen es
  **`public/share-card.jpg`**, 1200×630.
- **La imagen tiene que ser JPEG o PNG, nunca el SVG**: ninguna de esas plataformas rasteriza SVG
  en `og:image`, así que apuntar al `.svg` equivale a no tener imagen. `public/share-card.svg` es
  la **fuente editable**; el JPEG se regenera con `npm run share-card`
  (`scripts/build-share-card.mjs`, que rasteriza con el Chromium de Playwright).
- **`og:url` y `og:image` son URLs absolutas a propósito**: el scraper lee el HTML fuera del
  contexto de la página y no resuelve rutas relativas. Si cambia el dominio, hay que tocarlas.
- `src/test/metadata.test.js` falla si se pierde una etiqueta, si una URL deja de ser absoluta, si
  la imagen vuelve a ser un SVG o si el archivo no existe.
- `public/_headers` cachea `/share-card.jpg` **un día**, no un año: no lleva hash en el nombre, así
  que como inmutable se quedaría congelada en la caché de WhatsApp al regenerarla.
- **No toques el `<script>` inline de `index.html` al editar los metadatos**: la CSP lo autoriza por
  su hash sha256 y `src/test/csp.test.js` falla si se descuadra.

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
