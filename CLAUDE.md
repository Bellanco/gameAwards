# CLAUDE.md — TGA Ballot

Guía para Claude Code al trabajar en este repositorio. Léela antes de tocar código.

## Qué es

App de votación interactiva para The Game Awards. Los usuarios entran con Google, votan
categoría por categoría, revisan y envían su porra (un voto por usuario). Hay un panel de
admin oculto en la ruta `/admin` para gestionar categorías, ganadores y resultados.

- **Stack**: React 18 + Vite 5 + Tailwind CSS 3 + Firebase 10 (Auth + Firestore + Analytics)
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
npm run test:rules # tests de firestore.rules contra el emulador (necesita Java)
```

### Tests (Vitest)

- Runner: **Vitest** + React Testing Library, entorno `jsdom`. Config en `vite.config.js`
  (clave `test`); setup global en `src/test/setup.js` (matchers de `jest-dom` + `cleanup`).
- `describe/it/expect/vi` son **globales** (`test.globals: true`) — no hace falta importarlos.
- Para mockear módulos usa `vi.mock('ruta', factory)` (hoisted, como en jest). Ejemplo real
  en `src/hooks/hooks.test.js`: mockea `../firebase` (db + auth), `firebase/firestore`,
  `firebase/auth` y `../services/errorService`.
- Nombra los archivos `*.test.js` / `*.test.jsx` junto al código que prueban.

## Arquitectura

```
src/
├── App.jsx                  # Orquestador: todo el estado de la app y el flujo de pantallas
├── main.jsx                 # Entry point de React DOM
├── firebase.js              # Config Firebase (lee de import.meta.env) + lazy Analytics
├── index.css                # Directivas Tailwind
├── components/              # Pantallas (VoteScreen, ReviewScreen, AdminPanel, etc.)
│   ├── ui/                  # Primitivos reutilizables (Button, Modal, Card, Table…) + index.js
│   ├── form/                # Inputs de formulario (TextInput, Select, Checkbox…) + index.js
│   └── layouts/             # ScreenLayout, ControlBar
├── hooks/                   # Hooks custom, reexportados desde hooks/index.js
├── services/               # Lógica sin UI (Firestore, analytics, errores, logger)
├── data/
│   ├── literals.js          # índice i18n → useTranslation(language)
│   └── i18n/{es,en}.js      # textos (mismas claves en ambos)
├── styles/themes.css        # variables de tema
└── utils/                   # helpers puros
```

### Flujo de pantallas (controlado por `currentStep` en `App.jsx`)
- `-1` → Login
- `0..n-1` → Votación (una categoría por paso)
- `n` (= `validCategories.length`) → Revisión
- `99` → Éxito
- Ruta `/admin` → `AdminPanel` (salta el flujo; carga diferida con `lazy`)
- Bloqueo de re-voto: si el usuario ya tiene ballot en Firestore → `AlreadyVotedScreen`
- Votación cerrada (`isDeadlineReached`) → `DeadlineScreen` (antes de login y flujo)
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
2. **Nada de texto hardcodeado en la UI.** Toda cadena visible va en `src/data/i18n/es.js`
   **y** `en.js` (mismas claves camelCase) y se consume con `t('clave')` de `useTranslation`.
3. **Datos de categorías** viven en Firestore (colección `categories`), no en JSX. Carga vía
   `loadAndSortCategories()` de `services/categoriesService.js`.
4. **camelCase en todo**: variables, funciones, claves JSON de Firestore, nombres de evento.
   Componentes en PascalCase, archivos `.jsx`.
5. **Solo Tailwind, mobile-first** (`p-4 md:p-8`, no al revés). Sin CSS custom salvo animaciones.
   Tema oscuro por defecto (`bg-slate-900/950`, acentos azul/esmeralda/amarillo).
   - `h-screen` y `min-h-screen` están redefinidos a **`100dvh`** en `tailwind.config.js`:
     `100vh` incluye la barra de direcciones del móvil y cortaba la fila de botones. Si
     necesitas el vh estático, usa `h-[100vh]` explícitamente.
   - Objetivo táctil mínimo **44×44 px** en controles de usuario (`min-h-[44px] min-w-[44px]`).
   - Los botones de tema/idioma NO se escriben a mano: usa `<ThemeLanguageControls>` de
     `components/ui` (estaban copiados en cuatro sitios, con `aria-label` en solo dos).
6. **Componentes < 300 líneas.** Si crece, divídelo.
7. **async/await**, no cadenas `.then().then()`.
8. **Logging**: usa `import logger from 'services/loggerService'` (silencia en producción), no
   `console.*` directo. Errores de dominio → `logError(ERROR_TYPES.X, err, {context})` de
   `services/errorService.js`.
9. **Sin secretos en el código.** Config de Firebase desde `import.meta.env.VITE_*` (`.env.local`).

## Firebase / Firestore

- Auth: Google (`signInWithPopup`). El **UID de Firebase es el ID del documento** → garantiza
  un voto por usuario. Escribe con `setDoc(doc(db, "ballots", uid), data)` — solo `create`
  (las reglas deniegan `update`: un voto por persona, no modificable).
- Colecciones:
  - `ballots/{uid}` — voto del usuario. **Lectura solo dueño o admin** (no público).
  - `categories/{id}` — categorías bilingües (lectura pública, escritura admin).
  - `config/voting` — estado de la votación (lectura pública, escritura admin).
  - `results/{year}` — archivo de resultados por temporada (lectura pública, escritura admin).
  - `winners`/`surveyWinners` — compatibilidad legacy (lectura pública, escritura/borrado admin).
  - `admin/**` — configuración sensible (lectura y escritura solo admin).
- Reglas en `firestore.rules`. **Escritura valida `isOwner` o `isAdmin()`**; `ballots` valida
  esquema en el write. `delete` de ballots solo admin (reinicio anual). Si tocas el modelo de
  datos, actualiza también las reglas **y sus tests** (`npm run test:rules`, 26 casos contra el
  emulador). Publicar con `firebase deploy --only firestore:rules`.
- **El plazo de votación se valida en servidor**, no solo en el navegador: `allow create` de
  `ballots` llama a `votingIsOpen()`, que lee `config/voting`. Si `config/voting` no existe, se
  considera abierta (estado «aún sin configurar»). El esquema exige además que
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
    season: <año>, submittedAt: ISO, isActive: true }
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

### Control de votación y reset anual

- `config/voting = { isOpen, season, closesAt, closesAtMillis, updatedAt }`. La app lee esto con
  `useVotingConfig()`. La votación está cerrada si `isOpen=false` **o** si ya pasó `closesAt`
  → `DeadlineScreen`. `closesAt` es la **fecha de cierre editable** desde la pestaña Temporada
  (`seasonService.setClosingDate('YYYY-MM-DD')`); el reinicio anual la limpia.
- **`closesAt` y `closesAtMillis` son el mismo instante en dos formatos** y viajan siempre
  juntos: `closesAt` (ISO) lo lee el cliente para mostrar; `closesAtMillis` (epoch) lo comparan
  las reglas, que no saben parsear una cadena ISO. Escribir uno sin el otro deja el plazo sin
  efecto en servidor. El instante se fija en **Europe/Madrid** (`utils/closingDate.js`), no en
  la hora local del administrador.
- El admin abre/cierra y reinicia desde la pestaña **Temporada** del AdminPanel. El reinicio
  (`seasonService.archiveAndResetSeason`) archiva ganadores + clasificación en `results/{año}`
  y luego **borra** todos los `ballots`; después avanza la temporada y deja la votación cerrada.

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

- Los hooks async (`useFirestoreCategories`, `useFirestoreBallots`) emiten warnings de `act()`
  en los tests porque actualizan estado tras el render inicial. Son inofensivos (los tests solo
  verifican el estado inicial); si se añaden aserciones sobre el estado resuelto, usar `waitFor`.
- El acceso admin requiere asignar el custom claim `admin:true` (ver comando arriba) **antes**
  de poder leer `ballots` o escribir categorías/config. Sin el claim, `/admin` redirige a `/`.
- El bundle principal es grande (Firebase). `AdminPanel` ya se carga con `lazy()` (code-splitting).
  Si importa reducir más, valorar `manualChunks` en `vite.config.js` para separar `firebase` y `react`.
