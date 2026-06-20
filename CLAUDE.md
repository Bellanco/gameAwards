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
├── services/               # Lógica sin UI (Firestore, analytics, errores, logger, imágenes)
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
- Ruta `/admin` → `AdminPanel` (siempre accesible, salta el flujo)
- Deadline: 1 de diciembre, calculado en un `useEffect`.

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
6. **Componentes < 300 líneas.** Si crece, divídelo.
7. **async/await**, no cadenas `.then().then()`.
8. **Logging**: usa `import logger from 'services/loggerService'` (silencia en producción), no
   `console.*` directo. Errores de dominio → `logError(ERROR_TYPES.X, err, {context})` de
   `services/errorService.js`.
9. **Sin secretos en el código.** Config de Firebase desde `import.meta.env.VITE_*` (`.env.local`).

## Firebase / Firestore

- Auth: Google (`signInWithPopup`). El **UID de Firebase es el ID del documento** → garantiza
  un voto por usuario. Escribe con `setDoc(doc(db, "ballots", uid), data)` (upsert).
- Colecciones:
  - `ballots/{uid}` — voto del usuario. **Lectura solo dueño o admin** (no público).
  - `categories/{id}` — categorías bilingües (lectura pública, escritura admin).
  - `config/voting` — estado de la votación (lectura pública, escritura admin).
  - `results/{year}` — archivo de resultados por temporada (lectura pública, escritura admin).
  - `winners`/`surveyWinners`/`admin` — colecciones de compatibilidad/admin.
- Reglas en `firestore.rules`. **Escritura valida `isOwner` o `isAdmin()`**; `ballots` valida
  esquema en el write. `delete` de ballots solo admin (reinicio anual). Si tocas el modelo de
  datos, actualiza también las reglas.
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
  { title: { es, en },
    options: [ { id: "<docId>_option_0", es, en }, ... ],
    optionIds: ["<docId>_option_0", ...],   // espejo plano por compatibilidad
    weight, orderIndex, winner: "<optionId>"|null, isActive }
  ```
- Voto:
  ```js
  { userId, userEmail, userNickname, userDisplayName,
    selections: { categoryId: "<optionId>" },
    season: <año>, submittedAt: ISO, isActive: true }
  ```
- Helpers en `src/utils/localize.js` (`tField`, `getCategoryTitle`, `getOptionId`,
  `getOptionLabel`, `hasTitle`, **`resolveOptionId`**) y `src/utils/scoring.js`
  (`computeLeaderboard`, `scoreBallot`). **Usa `hasTitle(cat)` en vez de `cat.title.trim()`**
  (title es objeto).
- **Título de categoría bilingüe; nombres de juego en idioma único.** El CategoryManager edita
  el título en ES/EN, pero las opciones (juegos) tienen un único campo; al guardar se escribe el
  mismo texto en `es` y `en` (se mantiene la forma `{id,es,en}` para no romper optionId/scoring).
- **Tolerancia legacy**: el scoring y el display normalizan con `resolveOptionId(category, value)`,
  así que funcionan tanto con datos nuevos (optionId) como antiguos (nombre/título string), sin
  necesidad de migrar los datos existentes.
- **Histórico**: `useSeasonResults()` lee `results/{año}`; el AdminPanel tiene la pestaña
  **Histórico** que muestra, por edición, ganadores por categoría y la clasificación.

### Control de votación y reset anual

- `config/voting = { isOpen, season, closesAt, updatedAt }`. La app lee esto con
  `useVotingConfig()`; si `isOpen` es false se muestra `DeadlineScreen`. Reemplaza el viejo
  cálculo client-side del 1 de diciembre.
- El admin abre/cierra y reinicia desde la pestaña **Temporada** del AdminPanel. El reinicio
  (`seasonService.archiveAndResetSeason`) archiva ganadores + clasificación en `results/{año}`
  y luego **borra** todos los `ballots`; después avanza la temporada y deja la votación cerrada.

## Convenciones de commits

`<tipo>(<scope>): <asunto>` — tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`.
Ej.: `fix(auth): resolver error de UID en Firebase`. No commitees ni hagas push salvo que se pida.

## Referencias

- Estándares detallados: `.github/instructions/tga-ballot-standards.instructions.md`
- Analytics y manejo de errores: `ANALYTICS_SETUP.md`
- Setup general y troubleshooting: `README.md`

## Pendientes conocidos / cuidado

- Los hooks async (`useFirestoreCategories`, `useFirestoreBallots`) emiten warnings de `act()`
  en los tests porque actualizan estado tras el render inicial. Son inofensivos (los tests solo
  verifican el estado inicial); si se añaden aserciones sobre el estado resuelto, usar `waitFor`.
- El acceso admin requiere asignar el custom claim `admin:true` (ver comando arriba) **antes**
  de poder leer `ballots` o escribir categorías/config. Sin el claim, el panel mostrará 404.
- El bundle principal supera 500 kB (Firebase). Si importa, valorar code-splitting con
  `import()` dinámico o `manualChunks`.
