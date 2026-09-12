# Auditoría completa — TGA Ballot (septiembre 2026)

Revisión integral de seguridad, usabilidad, responsive, rendimiento, modularidad,
escalabilidad y reusabilidad. Sobre el commit `2fb2144` (rama `develop`).

**Verificaciones ejecutadas:**

| Comprobación | Resultado |
|---|---|
| `npx eslint .` | ✅ 0 errores, 0 warnings |
| `npm test` (Vitest) | ✅ 43 tests en verde (3 archivos: `hooks`, `scoring`, `localize`) |
| `npm run build` | ✅ OK — 95 módulos, 1,9 s |
| Paridad i18n ES/EN | ✅ 215 claves en ambos, sin huecos ni duplicados |
| `npm audit` | ⚠️ 26 vulnerabilidades (2 críticas, 9 altas) — 14 en dependencias de producción |

**Peso del bundle (build real):**

```
firebase  435,22 kB │ gzip: 100,46 kB   ← chunk separado ✔
index     210,23 kB │ gzip:  64,92 kB
css        43,63 kB │ gzip:   8,18 kB
AdminPanel 41,44 kB │ gzip:  10,21 kB   ← lazy ✔
─────────────────────────────────────
Carga inicial ≈ 689 kB / 173 kB gzip
```

---

## Resumen por severidad

> **Estado:** el **Sprint 1 está aplicado** (hallazgos 1, 3, 6 y 8, marcados ✅ abajo).
> Ver «Sprint 1 — aplicado» al final del documento.

| # | Severidad | Ámbito | Hallazgo |
|---|---|---|---|
| 1 | ✅ Resuelto | Funcional | ~~Tras pulsar «Cancelar» en Revisión, el usuario **nunca puede enviar su voto**~~ |
| 2 | 🔴 Crítica | Seguridad | El cierre de votación **solo se valida en cliente**: se puede votar fuera de plazo |
| 3 | ✅ Resuelto | Datos | ~~`CategoryManager` genera **`optionId` duplicados** al reordenar/borrar nominados~~ |
| 4 | 🟠 Alta | Seguridad | `isValidBallot` no valida `season`, `userEmail` ni el tamaño de `selections` |
| 5 | 🟠 Alta | Privacidad | `logError` envía mensaje de error y contexto **crudos a Analytics en producción** |
| 6 | ✅ Resuelto | Deploy | ~~Sin `_redirects`: la ruta `/admin` **devuelve 404** en carga directa (CloudFlare Pages)~~ |
| 7 | 🟠 Alta | Rendimiento | `AutoSizeText` provoca **layout thrashing** (hasta 20 reflows sincronizados por tarjeta) |
| 8 | ✅ Resuelto | Funcional | ~~Fallo al parsear `votingProgress` **deja la app colgada** en «Cargando»~~ |
| 9 | 🟡 Media | Responsive | `h-screen` en lugar de `dvh`: contenido cortado en Safari iOS / Chrome Android |
| 10 | 🟡 Media | Rendimiento | Guardado de ganadores N+1 y no atómico |
| 11 | 🟡 Media | Usabilidad | Sin router: el botón «atrás» del navegador saca al usuario de la app |
| 12 | 🟡 Media | A11y | `<html lang="es">` fijo aunque la UI esté en inglés |
| 13 | 🟡 Media | Mantenibilidad | ~470 líneas de **código muerto** (analytics, `useWinnerSelection`, `form/`) |
| 14–31 | 🔵 Baja | Varios | Ver detalle abajo |

---

## 1. Defectos funcionales

### 1.1 🔴 El botón «Cancelar» de Revisión bloquea el envío del voto de forma permanente

**Dónde:** `src/App.jsx:255-264`, `src/App.jsx:326-329`, `src/components/ReviewScreen.jsx:13-27`

`ReviewScreen` **no recibe** las props `userNickname`, `onNicknameChange` ni `canEditNickname`:
App las pasa (`App.jsx:539,541,548`) pero la firma del componente no las desestructura. El único
campo editable de la pantalla es `userDisplayName`.

Mientras tanto, `submitBallot` valida contra `userNickname`:

```js
// App.jsx:326
if (!userNickname.trim()) {
  setErrorMessage(t('errorEnterNickname'));
  return;
}
```

Y `handleReturnToHome` —el handler del botón «Cancelar» de `ReviewScreen`— lo vacía:

```js
// App.jsx:259
setUserNickname('');       // ← ya no hay forma de volver a rellenarlo
setUserDisplayName('');
```

**Reproducción:** entrar → votar → Revisión → «Cancelar» → «Continuar» (la sesión de Firebase
sigue viva, `handleLogin` no repuebla el apodo porque `onAuthStateChanged` no vuelve a dispararse)
→ votar todo → Enviar → **«Introduce un apodo» para siempre**, sin ningún campo que lo corrija.
Solo se recupera recargando la página.

El mismo bloqueo ocurre con cuentas de Google sin `displayName`.

**Arreglo:** decidir una sola fuente de verdad para el nombre. Lo más limpio es validar
`userDisplayName` en `submitBallot` y eliminar `userNickname` del flujo de UI (guardándolo
en el ballot directamente desde `currentUser.displayName`), o bien repoblar ambos en
`handleReturnToHome` desde `auth.currentUser`.

### 1.2 🟠 `optionId` duplicados al editar nominados

**Dónde:** `src/components/CategoryManager.jsx:114-118`

```js
const options = validOptions.map((opt, idx) => {
  const value = opt.value.trim();
  return { id: opt.id || `${docId}_option_${idx}`, name: value };
});
```

Las opciones existentes conservan su `id`, pero las nuevas lo derivan del **índice actual**.
Secuencia que rompe los datos:

1. Categoría con `[A(id …_option_0), B(id …_option_1)]`.
2. El admin borra A y añade una opción C.
3. `validOptions = [B, C]` → B conserva `…_option_1`; C recibe `idx = 1` → **`…_option_1`**.

Dos opciones con el mismo `optionId`: `getOptionById` devuelve siempre la primera, el voto a C
se contabiliza como voto a B y el scoring queda corrupto.

**Arreglo:** generar los ids nuevos con un sufijo único, no posicional
(`crypto.randomUUID()`, o `${docId}_option_${Date.now()}_${idx}`), y/o verificar unicidad antes
de guardar.

### 1.3 🟡 `JSON.parse` sin protección deja la app colgada

**Dónde:** `src/App.jsx:116-121`

```js
const savedProgress = localStorage.getItem('votingProgress');
if (savedProgress) {
  const progress = JSON.parse(savedProgress);   // ← puede lanzar
  ...
}
setIsLoadingAuth(false);                         // ← línea 123, nunca se alcanza
```

Si el valor está corrupto (extensión, escritura parcial, cambio de formato), la excepción se
produce **dentro del callback de `onAuthStateChanged`**, antes del `setIsLoadingAuth(false)`.
Resultado: pantalla de «Cargando aplicación» infinita. El `ErrorBoundary` no lo captura (no es
un error de render) y el usuario no tiene forma de salir salvo limpiar el almacenamiento.

**Arreglo:** `try/catch` alrededor del parseo, con `localStorage.removeItem('votingProgress')`
en el `catch`, y mover `setIsLoadingAuth(false)` a un `finally`.

### 1.4 🔵 Progreso de voto compartido entre usuarios del mismo navegador

**Dónde:** `src/App.jsx:116`

`votingProgress` no se asocia al `uid`. Si el usuario A vota a medias y cierra la pestaña sin
cerrar sesión, y luego el usuario B entra en el mismo navegador, B recupera los votos de A.

**Arreglo:** guardar la clave como `votingProgress:${uid}` o incluir el `uid` en el objeto y
descartarlo si no coincide.

### 1.5 🔵 Empates mal resueltos en la clasificación

**Dónde:** `src/utils/scoring.js:49`

```js
.map((entry, index) => ({ rank: index + 1, ...entry }));
```

Dos usuarios con los mismos puntos reciben posiciones distintas (1.º y 2.º) de forma arbitraria
según el orden de llegada de los documentos. En una porra con premio esto importa.

**Arreglo:** asignar el mismo `rank` a puntuaciones iguales (ranking competitivo estándar).

### 1.6 🔵 Props muertas que prometen funcionalidad inexistente

- `VoteScreen` recibe `onSkip` (`App.jsx:522`) pero no lo desestructura → `skipCategory`
  (`App.jsx:318`) es código inalcanzable.
- `SuccessScreen` recibe `onLogout`, `onReturnHome` y `successMessage` (`App.jsx:562-563`)
  y no usa ninguno → tras votar no hay salida en pantalla (hay que recargar).
- `WinnersPanel` recibe `onClose` (`AdminPanel.jsx:401,406`) y no lo declara → no hay botón
  «volver» en las pestañas de Ganadores/Ranking.

### 1.7 🔵 «Siguiente» deshabilitado en la última categoría

**Dónde:** `src/components/VoteScreen.jsx:277`

El botón se desactiva en `currentStep === totalSteps - 1`, pero el autoavance al seleccionar
sí lleva a Revisión. Quien quiera saltar la última categoría sin votarla debe adivinar que el
camino es «Finalizar». Incoherente.

---

## 2. Seguridad

### 2.1 🔴 El plazo de votación no se valida en servidor

**Dónde:** `firestore.rules:48`, `src/App.jsx:69-70`

```
allow create: if isOwner(userId) && isValidBallot(userId);
```

Las reglas **no consultan `config/voting`**. El cierre (`isOpen=false` o `closesAt` vencido) se
evalúa solo en `App.jsx` y controla qué pantalla se pinta. Cualquiera con la consola del
navegador —o simplemente con el reloj del sistema atrasado, porque `Date.now()` es local—
puede ejecutar el `setDoc` y registrar un voto fuera de plazo.

Se agrava con el **fail-open** de `useVotingConfig` (`src/hooks/useVotingConfig.js:25-30,47`):
si el documento no existe o la lectura falla, el estado por defecto es `isOpen: true`.

**Arreglo:**

```
function votingIsOpen() {
  let cfg = get(/databases/$(database)/documents/config/voting).data;
  return cfg.isOpen == true &&
         (cfg.closesAt == null || request.time < timestamp.value(cfg.closesAt));
}
allow create: if isOwner(userId) && isValidBallot(userId) && votingIsOpen();
```

(Requiere guardar `closesAt` como `timestamp` en Firestore, no como string ISO — ver 2.3.)

### 2.2 🟠 Validación de esquema del ballot incompleta

**Dónde:** `firestore.rules:27-39`

`isValidBallot` no comprueba:

- **`season`** — no se valida ni el tipo. Un usuario puede escribir `season: 1999` y quedar
  fuera de cualquier archivo o recuento.
- **`userEmail`** — solo `is string`. Se puede **suplantar el correo de otra persona**; el
  AdminPanel lo muestra tal cual (`AdminPanel.jsx:369`). Debe ser `== request.auth.token.email`.
- **`userDisplayName`** — no se valida el tipo.
- **Tamaño de `selections`** — es un `map` libre. Se puede escribir un mapa de miles de entradas
  con claves inventadas (coste de lectura para el admin, ruido en las estadísticas).
- **Longitud de los strings** — el recorte a 50 caracteres es solo cliente (`App.jsx:360`).

**Arreglo:**

```
function isValidBallot(userId) {
  let d = request.resource.data;
  return d.keys().hasOnly([...]) &&
         d.userId == userId &&
         d.userEmail == request.auth.token.email &&
         d.userNickname is string && d.userNickname.size() <= 50 &&
         d.userDisplayName is string && d.userDisplayName.size() <= 50 &&
         d.selections is map && d.selections.size() <= 40 &&
         d.season is int &&
         d.submittedAt is string &&
         d.isActive == true;
}
```

### 2.3 🔵 `closesAt` en hora local del administrador

**Dónde:** `src/services/seasonService.js:65`

```js
const closesAt = day ? new Date(`${day}T23:59:59`).toISOString() : null;
```

Se interpreta en el huso del navegador del admin. Si se administra desde otro huso (o alguien
compara con `Date.now()` en otro país), el cierre se desplaza hasta ±12 h. Además, guardarlo
como string impide compararlo desde las reglas de seguridad.

**Arreglo:** normalizar a `Europe/Madrid` explícitamente y persistir como `Timestamp` de Firestore.

### 2.4 🟠 Fuga de detalles de error a Analytics en producción

**Dónde:** `src/services/errorService.js:33-48`

El objeto `errorData` sí se sanea («En producción, no incluir stack traces ni contexto
sensible»)… pero tres líneas después se envía a Analytics **el mensaje crudo y el contexto
completo**, sin distinguir entorno:

```js
const errorData = { message: isDev ? errorMessage : 'Error en aplicación', ... };
...
trackError(errorType, errorMessage, context)   // ← errorMessage y context sin sanear
```

Los contextos incluyen `categoryId`, rutas de Firestore y, vía `setupGlobalErrorHandler`,
`source`/`line`/`column` de cualquier excepción no capturada. Google Analytics no debe recibir
esto, y los eventos personalizados con PII incumplen sus propios términos de uso.

**Arreglo:** enviar `errorData` (ya saneado) en lugar de `errorMessage`/`context`.

### 2.5 🔵 PII en los eventos de Analytics (código latente)

**Dónde:** `src/services/analyticsService.js:12-17, 22-26, 53-58, 101-106`

`trackLogin`, `trackLogout`, `trackBallotSubmitted` y `trackAdminAccessAttempted` envían
`user_email` / `user_nickname` a Google Analytics. Hoy **no se llaman desde ningún sitio**
(ver 6.1), pero están documentados en `ANALYTICS_SETUP.md` como si estuvieran activos: si
alguien los cablea tal cual, la app empieza a enviar correos personales a GA (problema de RGPD).

**Arreglo:** eliminar el email de los parámetros o hashearlo antes de cablear nada.

### 2.6 🔵 UIDs de Firebase expuestos públicamente en el histórico

**Dónde:** `firestore.rules:71-74`, `src/services/seasonService.js:105-114`

`results/{season}` tiene lectura pública e incluye `leaderboard` con `userId` (UID de Firebase)
y `nickname`. Los UIDs no son secretos, pero no hay razón para publicarlos: basta el nickname
y los puntos.

**Arreglo:** omitir `userId` del `leaderboard` archivado, o sustituirlo por un índice.

### 2.7 🟡 Sin cabeceras de seguridad ni CSP

**Dónde:** no existe `public/_headers`

El despliegue en CloudFlare Pages sirve la app sin `Content-Security-Policy`,
`X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` ni `Permissions-Policy`. La app es
clickjackeable (un iframe con el botón de login sobrepuesto) y no hay defensa en profundidad
frente a inyección de scripts.

**Arreglo:** añadir `public/_headers`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://*.firebaseapp.com
```

(El `'unsafe-inline'` en `script-src` es necesario mientras el script anti-FOUC de `index.html`
sea inline; se elimina moviéndolo a un archivo con hash.)

### 2.8 🟠 Vulnerabilidades en dependencias

```
26 vulnerabilidades (2 low, 13 moderate, 9 high, 2 critical)
   └─ 14 alcanzan a producción (10 moderate, 3 high, 1 critical)
```

Las de producción vienen de `firebase@10.x` → `undici` (vía `@firebase/functions` y
`@firebase/storage`, que la app **no usa**) y de `websocket-driver` (crítica).

**Arreglo:** subir a `firebase@11` (corrige la cadena de `undici`) y `npm audit fix` para el
resto. Verificar después que `signInWithPopup` y las APIs de Firestore siguen igual — la
migración 10→11 es mayormente compatible.

### 2.9 🔵 Saneado de entrada puramente cosmético

**Dónde:** `src/App.jsx:360`

```js
const sanitize = (value) => (value || '').trim().replace(/[<>]/g, '').slice(0, 50);
```

React ya escapa todo lo que renderiza, así que quitar `<` y `>` no aporta seguridad y sí
destroza nombres legítimos (`<3`, `Player>>`). La protección real es la validación en las
reglas (2.2). Mantener el `slice(0,50)`, quitar el `replace`.

---

## 3. Rendimiento y optimización

### 3.1 🟠 `AutoSizeText`: layout thrashing en cada tarjeta

**Dónde:** `src/components/AutoSizeText.jsx:23-49`

```js
while (currentSize >= minSize) {
  element.style.fontSize = `${currentSize}px`;   // escribe estilo
  if (element.scrollHeight <= ... )              // fuerza reflow síncrono
  currentSize -= stepGranularity;
}
```

Escritura de estilo + lectura de geometría en bucle es el patrón de *forced synchronous layout*
de libro. Con `maxSize: 30` / `minSize: 9` y paso de 1 px son **hasta 21 reflows por tarjeta**;
una categoría con 10 nominados en móvil son ~210 reflows sincronizados en el hilo principal, y
se repite en cada cambio de categoría y en cada resize. Es la causa más probable de los tirones
al navegar entre categorías en gama media.

**Arreglo (cualquiera de los tres):**
- Búsqueda binaria en vez de lineal: de 21 reflows a ~5.
- Mejor: sustituirlo por CSS puro con `clamp()` + unidades de contenedor
  (`font-size: clamp(0.6rem, 5cqi, 1.9rem)` con `container-type: inline-size` en la tarjeta),
  que resuelve el navegador sin JS.
- Como mínimo, memoizar el resultado por `(texto, ancho de contenedor)`.

### 3.2 🟡 Guardado de ganadores N+1 y no atómico

**Dónde:** `src/components/WinnersPanel.jsx:128-143`

Un `await updateDoc(...)` **por categoría dentro del bucle**: con 25 categorías son 25 viajes
secuenciales al servidor (varios segundos) y, si falla a mitad, quedan ganadores a medias sin
posibilidad de deshacer.

**Arreglo:** `writeBatch` — el patrón ya está en `seasonService.archiveAndResetSeason:146-164`.

### 3.3 🟡 `useFirestoreBallots` carga la colección entera sin paginar

**Dónde:** `src/hooks/useFirestoreBallots.js:39-47`

`getDocs(collection(db,'ballots'))` sin `limit()`. Con cientos de votos va bien; con miles, el
AdminPanel descarga megabytes y el coste de lectura de Firestore crece linealmente. Además se
llama **dos veces** por render del panel (`AdminPanel` y `WinnersPanel` montan cada uno su hook).

**Arreglo:** paginar con `limit()`/`startAfter()`, o precalcular agregados con una Cloud Function
y leer un único documento de resumen. A corto plazo, elevar el hook a un contexto compartido
para no duplicar la descarga.

### 3.4 🔵 Recálculos en cada render del AdminPanel

**Dónde:** `src/components/AdminPanel.jsx:91-101, 309, 367`

`getValidBallots()` se invoca tres veces por render y reconstruye un `Set` cada vez;
`getSortedBallotSelections` ordena todas las categorías **por cada fila** de la tabla.

**Arreglo:** `useMemo` para `validBallots` y para el mapa de categorías ordenadas.

### 3.5 🔵 Dos `useEffect` de viewport y dos listeners de `resize` en `VoteScreen`

**Dónde:** `src/components/VoteScreen.jsx:70-141`

`checkScroll` se engancha a `resize`, a un `ResizeObserver` y a un `setTimeout`, y aparte hay
un segundo efecto con otro listener de `resize` + `orientationchange`. Ninguno está *debounced*:
durante un giro de pantalla se disparan decenas de `setState`.

**Arreglo:** extraer un `useViewport()` compartido (también lo pide `MEJORAS-PENDIENTES.md`) con
`rAF` o debounce, y unificar los listeners.

### 3.6 🔵 Fuentes de Google bloqueantes

**Dónde:** `index.html:12`

`<link rel="stylesheet">` a Google Fonts bloquea el render. Con `display=swap` se evita el texto
invisible, pero sigue costando ~200-400 ms de LCP en 3G.

**Arreglo:** auto-hospedar las dos familias (`woff2` en `public/`) o cargar con
`media="print" onload="this.media='all'"`.

### 3.7 🔵 `drop_console: true` anula `logger.critical`

**Dónde:** `vite.config.js:24`, `src/services/loggerService.js:22-25`

`loggerService` documenta que `critical` «siempre loguea, incluso en producción», pero Terser
elimina **todas** las llamadas a `console.*` del bundle de producción. La promesa es falsa.

También `define: { __DEV__: JSON.stringify(true) }` (`vite.config.js:13`) queda fijo a `true`
en producción, con un comentario que dice justo lo contrario. La variable no se usa en ningún
sitio: eliminarla.

**Arreglo:** `drop_console: { exclude: ['error'] }` o enviar los críticos a un servicio real.

### 3.8 🔵 Chunk de React sin separar

**Dónde:** `vite.config.js:31-33`

`manualChunks` separa `firebase` pero no `react`/`react-dom`. El chunk `index` (210 kB) mezcla
librería y código de aplicación, así que cualquier cambio de la app invalida también la caché de
React.

---

## 4. Responsive y usabilidad

### 4.1 🟡 `h-screen` en lugar de unidades dinámicas

**Dónde:** `src/components/VoteScreen.jsx:146,308`, `src/components/CategoryManager.jsx:284,303`

`100vh` en iOS Safari y Chrome Android incluye la barra de direcciones: con el layout
`header / main / footer` de `VoteScreen`, la fila de botones («Anterior/Siguiente/Finalizar»)
queda **parcialmente bajo la barra del navegador** hasta que el usuario hace scroll. En
`CategoryManager`, con `overflow-hidden`, el contenido inferior es directamente inalcanzable.

**Arreglo:** `h-[100dvh]` (o `min-h-[100dvh]`), con fallback `h-screen` para navegadores viejos.

### 4.2 🟡 Sin enrutado: el botón «atrás» expulsa de la aplicación

**Dónde:** `src/App.jsx:54` (`currentStep` en estado) y `src/App.jsx:436`
(`window.location.pathname === '/admin'`)

Toda la navegación es estado de React sin `history.pushState`. En móvil, el gesto de retroceso
es el reflejo natural para «volver a la categoría anterior»: aquí abandona la app y se pierden
las selecciones no persistidas del paso actual.

Además el chequeo de ruta es una comparación exacta: `/admin/` (con barra final) o `/Admin`
no entran al panel.

**Arreglo:** `react-router-dom` con rutas `/`, `/vote/:step`, `/review`, `/admin`; o, como
mínimo, `history.pushState` en `goToNextStep`/`goToPreviousStep` + listener de `popstate`, y
normalizar el `pathname` antes de compararlo.

### 4.3 🟠 `/admin` devuelve 404 en carga directa

**Dónde:** falta `public/_redirects`

CloudFlare Pages sirve ficheros estáticos: `https://…/admin` no corresponde a ningún archivo del
`dist/` y devuelve 404 sin llegar nunca a React. El panel solo es accesible si se llega desde `/`
y se cambia la URL sin recargar — es decir, en la práctica **no es accesible**.

**Arreglo:** crear `public/_redirects` con `/* /index.html 200`.

### 4.4 🔵 Retardos artificiales acumulados al votar

**Dónde:** `src/components/VoteScreen.jsx:220-236, 349-355`

Seleccionar un nominado encadena: `setTimeout(handleNext, 100)` → dentro, otro
`setTimeout(onNext, 100)` → y un tercero de 50 ms. Son **~250 ms** de espera percibida en cada
una de las ~25 categorías. Además, ninguno de esos temporizadores se limpia al desmontar:
al salir rápido de la pantalla se disparan `setState` sobre un componente desmontado.

**Arreglo:** proteger el doble clic con una `ref` booleana (o `pointer-events-none` durante la
transición) en lugar de con retardos, y guardar los ids de los `setTimeout` para limpiarlos en
el `return` del efecto.

### 4.5 🔵 Los degradados cambian al volver atrás

**Dónde:** `src/utils/gradients.js:42-65`, `src/components/VoteScreen.jsx:43-46`

`getRandomGradients` usa `Math.random()` y se reejecuta en cada cambio de categoría, así que
volver a una categoría ya vista la repinta con otros colores. Rompe el reconocimiento visual
(«la tarjeta roja era Elden Ring»).

**Arreglo:** derivar el índice de forma determinista a partir del `optionId`
(hash simple → `% GRADIENTS.length`). De paso desaparece el bucle `do/while` que puede iterar
indefinidamente cuando quedan pocos índices libres.

### 4.6 🔵 Participación falsa en el panel

**Dónde:** `src/components/AdminPanel.jsx:316-318`

```jsx
<p className="text-sm theme-text-secondary uppercase mb-2">{t('participation')}</p>
<p className="text-4xl font-black theme-accent">100%</p>
```

Literal fijo. O se calcula (votos completos / votos totales) o se quita la tarjeta.

### 4.7 🔵 Confirmación insuficiente para una acción destructiva

**Dónde:** `src/components/AdminPanel.jsx:190-205`

`archiveAndResetSeason` **borra todos los ballots y vacía los nominados de todas las
categorías**, protegido por un único `window.confirm`. Un clic accidental destruye la edición
entera. Tampoco es transaccional: si `setVotingOpen` (línea 198) falla tras el archivado, la
temporada queda a medio migrar sin ningún mensaje que lo aclare.

**Arreglo:** exigir escribir el año a mano para confirmar, y mostrar el estado paso a paso
(«archivado ✔ / votos borrados ✔ / temporada avanzada ✖»).

### 4.8 🔵 Mensajes en español dentro del flujo bilingüe

**Dónde:** `src/App.jsx:196, 218-228, 381, 454, 458`

Incumplen la regla 2 del proyecto (nada de texto embebido en la UI):

- `'Firebase no está configurado. Verifica src/firebase.js'` — además filtra rutas internas.
- El mapa completo `errorMessages` de códigos de auth (`auth/popup-blocked`, etc.).
- `` `¡Voto registrado exitosamente, ${userNickname}!` `` — que ni siquiera se muestra
  (`SuccessScreen` ignora la prop).
- `'No hay categorías disponibles'` y `'(Admin: N categoría(s) en base de datos, pero vacías)'`
  — este último expone detalle de administración a cualquier visitante.

---

## 5. Accesibilidad

### 5.1 🟡 `lang` del documento fijo a español

**Dónde:** `index.html:2`

`<html lang="es">` no cambia al pulsar EN. Los lectores de pantalla leen el inglés con fonética
española. Es un incumplimiento directo de WCAG 3.1.1.

**Arreglo:** en el `useEffect` que ya sincroniza el tema, añadir
`document.documentElement.lang = language;`.

### 5.2 🔵 Objetivos táctiles por debajo de 44 px

**Dónde:** `src/components/ui/Header.jsx:28-47`, `src/components/layouts/ControlBar.jsx:33-51`,
`src/components/CategoryManager.jsx:399-418`

Los botones de tema/idioma (`px-3 py-2` con icono de 16 px ≈ 32 px de alto, y `landscape:py-1`
los deja en ~26 px) y las flechas ▲▼ de reordenar (`w-8 h-7` = 32×28 px) están por debajo del
mínimo de 44×44 px de WCAG 2.5.5 / las guías de iOS.

### 5.3 🔵 Errores sin anuncio para lectores de pantalla

**Dónde:** `src/components/LoginScreen.jsx:86-91`, `src/components/AdminPanel.jsx:477-481`

`ReviewScreen` sí usa `role="alert"` + `aria-live="assertive"` (bien), pero el bloque de error
del login y los mensajes de la pestaña Temporada aparecen en silencio.

### 5.4 🔵 Animaciones infinitas sin pausa

**Dónde:** `src/components/ui/iconComponents.jsx:8,13,20,27`, `src/components/VoteScreen.jsx:377`

`animate-bounce` y `animate-pulse` permanentes en los iconos de alerta y en la flecha de scroll.
El bloque `prefers-reduced-motion` de `theme-motion.css:49-56` los neutraliza (✅ ya resuelto
respecto a lo anotado en `MEJORAS-PENDIENTES.md`), pero para quien no active la preferencia son
un distractor constante junto a texto que debe leerse.

### 5.5 🔵 Contraste sin auditar

Los tokens de `theme-tokens.css` declaran ratios en los comentarios de `tailwind.config.js`,
pero hay combinaciones no verificadas: `--text-tertiary: #4b3d2e` sobre `--bg-primary: #d8cfbb`
(≈ 6,4:1, correcto) frente a texto blanco sobre los degradados de `GameCard` con `bg-black/35`
de overlay, donde el contraste depende del degradado aleatorio que toque — con
`from-lime-900/75` puede quedar por debajo de 4,5:1.

**Arreglo:** subir el overlay a `bg-black/50` en la variante `vote`, o añadir `text-shadow`.

---

## 6. Modularidad, escalabilidad y reusabilidad

### 6.1 🟡 ~470 líneas de código muerto

Verificado con búsqueda de referencias en todo `src/`:

| Archivo/símbolo | Líneas | Estado |
|---|---|---|
| `src/services/analyticsService.js` | 169 | Solo se usa `trackError`; las otras **16 funciones no se llaman desde ningún sitio** |
| `src/hooks/useWinnerSelection.js` | 168 | Exportado en `hooks/index.js`, **sin ningún consumidor** (`WinnersPanel` reimplementa la lógica) |
| `src/components/form/` (3 componentes) | 125 | `TextInput`, `Checkbox`, `FormGroup` — **ningún import** fuera de su `index.js`; `ReviewScreen` y `CategoryManager` escriben `<input>` a mano |
| `loading.html` (raíz) | 8 kB | Sin referencias en el repo |
| `LOADING_ICONS`, `setSeason`, `downloadErrorLog`, `clearErrorLog`, `withErrorHandling` | ~40 | Exportados, sin consumidores |

`ANALYTICS_SETUP.md` documenta un sistema de analítica que **no está cableado**: la app no
registra ni logins, ni votos, ni envíos. Es la brecha más grande entre documentación y realidad.

**Arreglo:** decidir por cada bloque — o se cablea (analytics: llamar a `trackLogin` en
`handleLogin`, `trackBallotSubmitted` en `submitBallot`…) o se borra. Y usar los primitivos de
`form/` en `ReviewScreen`/`CategoryManager`, que es exactamente para lo que se crearon.

### 6.2 🟡 Componentes que superan el límite de 300 líneas (regla 6)

| Archivo | Líneas | División sugerida |
|---|---|---|
| `App.jsx` | 588 | Extraer `useVotingFlow()` (pasos, progreso, persistencia) y `useBallotSubmission()`; dejar App como router de pantallas |
| `CategoryManager.jsx` | 563 | `CategoryList` + `CategoryForm` + `useCategoryOrdering()` |
| `AdminPanel.jsx` | 552 | Un componente por pestaña: `OverviewTab`, `BallotsTab`, `HistoryTab`, `SeasonTab` |
| `WinnersPanel.jsx` | 422 | Separar `WinnersSelector` y `RankingTable` (hoy conviven por un `if (mode === …)`) |

### 6.3 🟡 Escrituras a Firestore dentro de componentes

`CategoryManager` (`setDoc`, `deleteDoc`, `writeBatch`) y `WinnersPanel` (`updateDoc`) hablan
con Firestore directamente, mientras que `seasonService.js` demuestra el patrón correcto. Esto
impide testear la lógica sin renderizar, y duplica reglas de negocio (la normalización de
`optionId`, por ejemplo, está en tres sitios).

**Arreglo:** `services/categoriesService.js` (ya existe, ampliarlo con `saveCategory`,
`deleteCategory`, `reorderCategories`) y un `services/winnersService.js`.

### 6.4 🟡 Prop-drilling de `language`/`theme` por 9 pantallas

Cada pantalla recibe y reenvía `language`, `onToggleLanguage`, `theme`, `onToggleTheme`. Son
4 props × 9 componentes = 36 puntos de mantenimiento para dos valores globales, y la causa de
que `ScreenLayout`, `Header`, `ControlBar` y `NotFoundScreen` repitan el mismo par de botones
con clases copiadas.

**Arreglo:** `AppContext` (o dos contextos) + un único `<ThemeLanguageControls />` reutilizable.

### 6.5 🔵 Tres implementaciones de los mismos botones de tema/idioma

`ControlBar.jsx:33-51`, `Header.jsx:28-47`, `AdminPanel.jsx:252-265` y `NotFoundScreen.jsx:17-31`
contienen el mismo par de botones con las mismas clases copiadas a mano (y divergencias:
`NotFoundScreen` y `AdminPanel` sin `aria-label`). Es exactamente lo que `ControlBar` debía evitar.

### 6.6 🔵 `validCategories` se recalcula en cinco sitios

`App.jsx:162`, `App.jsx:433`, `ReviewScreen.jsx:29-32`, `AdminPanel.jsx:61`,
`AdminPanel.jsx:92-96` y `CategoryManager.jsx:58` repiten
`filter(cat => !cat.isPlaceholder && hasTitle(cat))`.

**Arreglo:** un único `getValidCategories(categories)` en `categoriesService`.

### 6.7 🔵 TDZ latente en `App.jsx`

`goToNextStep` (296), `finishVoting` (312), `submitBallot` (332) y `getProgressPercentage` (396)
leen `validCategories`, que se declara con `const` en la **línea 433**. Funciona porque son
closures que solo se invocan tras el render completo, pero cualquier refactor que llame a una de
esas funciones durante los returns tempranos (líneas 403-428) lanzará
`ReferenceError: Cannot access 'validCategories' before initialization`.

**Arreglo:** subir la declaración (con `useMemo`) por encima de los handlers.

### 6.8 🔵 `GameCard` con 13 props y tres componentes dentro

**Dónde:** `src/components/GameCard.jsx:12-27`

Tres variantes con `if (variant === …)` que no comparten prácticamente nada: `medal` ni siquiera
se usa (`variant="medal"` no aparece en ningún consumidor). Props como `MedalIcon`/`medalColor`
solo aplican a una variante y `compact`/`isMobilePortrait` solo a otra.

**Arreglo:** `VoteCard` y `ReviewCard` como componentes separados; borrar la variante `medal`.

### 6.9 🔵 Sin PropTypes ni TypeScript

Con 13 props sin contrato en `GameCard` y props silenciosamente ignoradas en `ReviewScreen`,
`SuccessScreen` y `WinnersPanel` (ver 1.1 y 1.6), **el sistema de tipos habría cazado el bug
crítico #1**. Es el argumento más fuerte para migrar a TS, aunque sea progresivamente
(`allowJs` + `checkJs` en los archivos nuevos).

---

## 7. Tests y tooling

### 7.1 🟡 Cobertura limitada a utilidades

43 tests en 3 archivos: `scoring.test.js`, `localize.test.js` y `hooks.test.js` (este último,
solo comprobaciones del estado inicial). **No hay ni un test de componente ni de flujo.** Nada
cubre `App.jsx`, `submitBallot`, `CategoryManager` ni los servicios — es decir, todo lo que
falla en la sección 1.

**Mínimo recomendado:**
- `App` — flujo completo: login → votar todas → revisar → enviar (habría detectado el bug 1.1).
- `categoriesService.loadAndSortCategories` — orden, duplicados, tope de seguridad.
- `CategoryManager` — unicidad de `optionId` al añadir/borrar opciones (bug 1.2).
- `seasonService.archiveAndResetSeason` — con el emulador de Firestore.

Añadir `vitest run --coverage` y un umbral (empezar en 40 %).

### 7.2 🔵 Warnings de `act()` en los tests

`hooks.test.js` emite ~8 warnings de `act()`. Son inofensivos hoy (solo se comprueba el estado
inicial), pero ensucian la salida y ocultarán warnings reales.

**Arreglo:** `await waitFor(() => expect(result.current.isLoading).toBe(false))`.

### 7.3 🔵 Sin CI

No hay workflow en `.github/workflows/`. `lint`, `test` y `build` dependen de que alguien se
acuerde de ejecutarlos.

### 7.4 🔵 `package-lock.json` en `.gitignore` pero versionado

`.gitignore:3` lo excluye y sin embargo está en el repositorio (`git ls-files` lo confirma). Está
bien versionarlo — es lo que garantiza builds reproducibles en CloudFlare —, pero la
contradicción hará que alguien lo borre algún día.

**Arreglo:** quitar la línea de `.gitignore`.

### 7.5 🔵 `firebase.json` solo declara reglas de Firestore

No hay configuración de hosting (el deploy es CloudFlare), lo cual es correcto, pero conviene
documentar que `firebase deploy --only firestore:rules` es el único comando de Firebase que se
usa — hoy hay que deducirlo de un comentario en `firestore.rules`.

---

## 8. Plan de acción sugerido

**Sprint 1 — bloqueantes ✅ APLICADO** (ver detalle al final):
1. ~~Bug del apodo tras «Cancelar» (1.1)~~
2. ~~`try/catch` en `votingProgress` (1.3)~~
3. ~~`public/_redirects` + catch-all de rutas (4.3)~~
4. ~~`optionId` únicos en `CategoryManager` (1.2)~~

**Sprint 2 — seguridad (un día):**
5. Endurecer `firestore.rules`: plazo en servidor + validación de esquema (2.1, 2.2).
6. Sanear el envío a Analytics (2.4).
7. `public/_headers` con CSP (2.7).
8. `firebase@11` + `npm audit fix` (2.8).

**Sprint 3 — experiencia (uno o dos días):**
9. `100dvh` (4.1) y quitar los retardos de 250 ms (4.4).
10. `AutoSizeText` con `clamp()` o búsqueda binaria (3.1).
11. `document.documentElement.lang` (5.1) y objetivos táctiles a 44 px (5.2).
12. Enrutado real con `react-router-dom` (4.2).

**Sprint 4 — deuda técnica (continuo):**
13. Decidir sobre el código muerto: cablear analytics o borrarlo (6.1).
14. Contexto de idioma/tema (6.4) y dividir los cuatro componentes grandes (6.2).
15. Mover las escrituras de Firestore a servicios (6.3) y testearlas (7.1).
16. CI con `lint` + `test` + `build` (7.3).

---

## Nota sobre `MEJORAS-PENDIENTES.md`

Hay solapamiento parcial. Dos entradas de aquel documento están **ya resueltas** y conviene
tacharlas:

- «`prefers-reduced-motion`» → implementado en `src/styles/theme-motion.css:49-56`.
- «`src/styles/themes.css` redundante» → el archivo ya no existe; ahora son
  `theme-tokens.css` + `theme-semantic.css` + `theme-motion.css`, sin solapamiento.

Y su sección 5 afirma «baseline de ESLint limpio», lo cual he confirmado: `npx eslint .`
devuelve 0 problemas.

---

## Sprint 1 — aplicado

Verificado con `npx eslint .` (0 problemas), `npm test` (**58** tests en verde, antes 43) y
`npm run build` (OK). **No** se ha podido arrancar la app contra Firebase: no hay `.env.local`
en el entorno, así que las cuatro correcciones están validadas por tests y build, no por una
ejecución en vivo.

### 1. Bug del apodo (hallazgo 1.1) — `src/App.jsx`

Se elimina el estado `userNickname` por completo. Ahora hay **un solo nombre en la UI**:

- `userDisplayName` es el único editable, el único que `ReviewScreen` muestra y el único que
  valida `submitBallot`. Si sale el error, el usuario tiene el campo delante para corregirlo.
- El nombre de la cuenta de Google se lee de `auth.currentUser.displayName` **en el momento del
  envío**, nunca desde estado, así que ningún handler puede vaciarlo.
- `handleReturnToHome` restaura `userDisplayName` al nombre de Google en vez de dejarlo vacío.
- Se eliminan también `canEditNickname` (estado muerto) y `successMessage` (estado muerto cuyo
  valor era la cadena en español embebida `¡Voto registrado exitosamente, …!`, que además
  `SuccessScreen` ignoraba). Con ello cae uno de los literales del hallazgo 4.8.
- `ReviewScreen` ya no recibe las tres props que ignoraba.

### 2. Progreso corrupto (hallazgo 1.3) — `src/App.jsx`

`JSON.parse(savedProgress)` va dentro de su propio `try/catch`, que descarta la clave corrupta;
y el `setIsLoadingAuth(false)` pasa a un `finally` que envuelve todo el callback de
`onAuthStateChanged`. La app ya no puede quedarse colgada en «Cargando».

### 3. Rutas (hallazgo 4.3) — nuevo `src/utils/routes.js` + `public/_redirects`

Siguiendo el patrón de GL (`_redirects` en el servidor + catch-all en cliente), **sin añadir
`react-router`**: GA tiene dos rutas y el router completo sigue siendo Sprint 3 (hallazgo 4.2,
que además resolvería el botón «atrás»).

- `public/_redirects` → `/* /index.html 200`. Sin esto CloudFlare Pages devolvía un 404
  estático en `/admin` y React no arrancaba: el panel era **inaccesible en producción**.
- `src/utils/routes.js` — tabla única de rutas (`/` y `/admin`), `normalizePathname`
  (`/Admin/` = `/admin`, que antes no entraba) y `resolveRoute`.
- `App.jsx` — cualquier ruta no declarada rebota a `/` con `history.replaceState` (sin dejar
  entrada en el historial) y pinta el flujo normal.
- `AdminPanel.jsx` — un usuario autenticado **sin el claim `admin`** se va a `/` con
  `window.location.replace`. Sin sesión sigue viendo el `LoginScreen` (es el mismo login del
  flujo público, así los administradores pueden entrar directamente por `/admin`).
- **`NotFoundScreen.jsx` eliminado** (71 líneas): era su único consumidor y ya no hay pantalla
  404. Sus claves i18n (`pageNotFound`, `pageNotExist`, `pageNotFoundDescription`, `goHome`)
  siguen en `es.js`/`en.js` sin usarse; se pueden limpiar cuando se aborde el hallazgo 6.1.

### 4. `optionId` duplicados (hallazgo 1.2) — nuevo `src/utils/options.js`

`buildStableOptions(formOptions, docId, generateId?)` sustituye al id derivado del índice.
Conserva el id de las opciones existentes (los votos emitidos siguen apuntando a ellas) y da
uno irrepetible a las nuevas **y a cualquier duplicado heredado de datos antiguos**. La lógica
sale del componente a `utils/` para poder probarla sin renderizar ni mockear Firestore.

`generateUUID` se mueve aquí desde `CategoryManager` y ahora usa `crypto.randomUUID()` cuando
está disponible.

### Tests nuevos

- `src/utils/options.test.js` — 5 tests, incluida la **regresión exacta del bug**: borrar la
  opción 0 y añadir otra ya no reutiliza el id de la superviviente.
- `src/utils/routes.test.js` — 10 tests: normalización, resolución y catch-all.

### Documentación

`CLAUDE.md` actualizado según su propio protocolo de mantenimiento: nueva sección «Rutas», la
semántica de `userNickname`/`userDisplayName` en el modelo de voto, la regla de que un
`optionId` **nunca** se deriva del índice, y la corrección de «sin el claim, el panel mostrará
404» → ahora redirige a `/`.
