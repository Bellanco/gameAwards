# Revisión de seguridad y protección de datos — TGA Ballot

**Fecha:** 12 de septiembre de 2026 · **Rama:** `develop` (`a9370ef`) · **Alcance:** aplicación web,
reglas de Firestore, cabeceras de despliegue, functions de CloudFlare, dependencias e historial de git.

Complementa a `AUDITORIA-2026-09.md` (auditoría general, sprints 1–4 aplicados). Aquí solo hay
seguridad y privacidad, y solo lo que **sigue abierto**.

---

## Resumen

> **Estado: todo aplicado y verificado, salvo dos cosas que no dependen del código.**
> Los 262 tests unitarios, los **50** de reglas contra el emulador (eran 37) y los 40 e2e están en
> verde. Queda pendiente **rotar la clave de RAWG** (S-3, hay que hacerlo en rawg.io) y decidir
> sobre App Check (S-10, se hace en la consola de Firebase).
>
> **Las reglas hay que desplegarlas**: `firebase deploy --only firestore:rules`. Hasta entonces,
> S-1, S-2, S-5 y S-8 siguen abiertos en producción aunque el código ya esté listo.

| # | Severidad | Estado | Ámbito | Hallazgo |
|---|---|---|---|---|
| S-1 | 🔴 Crítica | ✅ Resuelto | Confidencialidad | ~~Los **ganadores y la clasificación se leen sin sesión antes de `resultsAt`**~~ |
| S-2 | 🟠 Alta | ✅ Resuelto | Privacidad (RGPD) | ~~Nombre real + UID de **todos los participantes** en un documento de lectura anónima~~ |
| S-3 | 🟠 Alta | ⚠️ **Acción tuya** | Secretos | **Clave de la API de RAWG viva en el historial de git** → rotarla |
| S-4 | 🟠 Alta | ✅ Resuelto | Superficie de ataque | ~~`functions/games.js` publica un **endpoint abierto que nadie usa**~~ |
| S-5 | 🟡 Media | ✅ Resuelto | Integridad de datos | ~~Los **valores** de `selections` no se validan en las reglas~~ |
| S-6 | 🟡 Media | ✅ Resuelto | Higiene | ~~El panel lee `ballots` **antes de comprobar si eres admin**~~ |
| S-7 | 🟡 Media | ✅ Resuelto | Fuga de detalles | ~~`AdminPanel` enseña el **mensaje crudo de Firebase** al fallar el login~~ |
| S-8 | 🔵 Baja | ✅ Resuelto | Reglas | ~~`config/{document=**}` es público **por comodín**~~ |
| S-9 | 🔵 Baja | ✅ Resuelto | Cadena de suministro | ~~`package-lock.json` en `.gitignore`~~ |
| S-10 | 🔵 Baja | ⚠️ **Decisión tuya** | Abuso | Sin **App Check** ni restricción de la API key por dominio |

**Lo que está bien** (y conviene no romper): las reglas de `ballots` son sólidas —propiedad,
esquema, correo contra el token, plazo en servidor y contador de ediciones que avanza de uno en
uno—; el claim `admin` lo verifica el servidor; la CSP es restrictiva y sin `unsafe-eval`; no hay
`dangerouslySetInnerHTML` ni `eval` en todo el código; `npm audit` da **0 vulnerabilidades**; y
`.env.local` nunca se ha versionado. 243 tests en verde.

---

## S-1 🔴 Los ganadores y la clasificación son públicos antes de la fecha de publicación

**Dónde:** `firestore.rules:153-156` (`categories`), `firestore.rules:165-167` (`results`),
`src/App.jsx` (`areResultsPublished`), `src/hooks/useSeasonControls.js:144,164`,
`src/components/WinnersPanel.jsx:137`.

`resultsAt` decide *cuándo* se enseñan los resultados **solo en el navegador**. En Firestore, los
dos sitios donde vive esa información tienen `allow read: if true`:

- `categories/{id}.winner` — se escribe en cuanto el admin pulsa «Guardar ganadores».
- `results/{seasonId}` — el snapshot completo (ganadores + clasificación) se reescribe **cada vez
  que el admin guarda ganadores o el calendario**, es decir, mucho antes de la fecha de publicación.

Es exactamente el mismo fallo que ya se corrigió para el plazo de votación (hallazgo 2.1: «el plazo
se valida en servidor, no solo en el navegador»), pero no se aplicó a la publicación de resultados.

**Verificado contra el emulador** con `resultsAt` a un año vista:

```
>>> LEADERBOARD LEÍDO SIN AUTH: [{"rank":1,"userId":"uid-real-de-firebase",
                                 "nickname":"Nombre Apellido","points":12}]
>>> COLECCIÓN results ENUMERABLE SIN AUTH: 1 documentos
>>> GANADOR LEÍDO SIN AUTH (antes de resultsAt): cat1_option_0
```

**Impacto.** Cualquiera con la URL del proyecto (la apiKey va en el bundle, como debe ser) puede
leer los ganadores y el ranking completo con una petición REST, sin iniciar sesión. Si el admin
marca ganadores mientras la votación sigue abierta —o los prepara antes de la gala—, **un
participante puede consultarlos y acertar la porra entera**. Para una aplicación cuyo único
propósito es una competición de predicciones, esto anula el producto.

**Arreglo propuesto.** Dos piezas, ambas necesarias:

1. Puerta de fecha en las reglas para `results`, simétrica a `votingIsOpen()`:

   ```js
   function resultsArePublished() {
     let cfg = get(votingConfigRef()).data;
     return cfg.get('resultsAtMillis', null) != null &&
            request.time.toMillis() >= cfg.get('resultsAtMillis', null);
   }

   match /results/{season} {
     allow read: if resultsArePublished() || isAdmin();
     allow write, delete: if isAdmin();
   }
   ```
   (Ojo: el histórico de ediciones cerradas también dejaría de ser público mientras la edición en
   curso no esté publicada. Si se quiere el histórico siempre visible, condicionar por
   `season != cfg.season` o marcar los archivos cerrados con `closedAt` y permitir esos.)

2. Sacar `winner` de `categories`, que es y debe seguir siendo de lectura pública. Las reglas de
   Firestore no ocultan campos sueltos: mientras el ganador viva en un documento público, es
   público. Llevarlo a `admin/winners/{categoryId}` (ya hay `match /admin/**` cerrado) y que el
   snapshot de `results` sea el único canal de salida.

Actualizar `src/test/firestore.rules.test.js` con ambos casos.

---

## S-2 🟠 Nombre real y UID de todos los participantes, legibles sin sesión

**Dónde:** `src/utils/scoring.js:44-45`, `src/services/seasonService.js` (`buildSeasonSnapshot`),
`firestore.rules:165-167`.

`computeLeaderboard` archiva por participante `{ rank, userId, nickname, points }`, donde
`nickname` es el nombre de la cuenta de Google (`userDisplayName` / `userNickname`) y `userId` el
UID de Firebase. Todo eso acaba en `results/{seasonId}`, que hoy se lee **sin autenticar** y además
se puede **enumerar entera** (`getDocs(collection(db,'results'))` funciona para un anónimo, ver
S-1): una sola petición devuelve la lista nominal de todos los que han jugado, en todas las
ediciones.

Es el hallazgo 2.6 de la auditoría anterior (marcado 🔵 «los UIDs no son secretos»), pero la
valoración se queda corta: lo relevante no es el UID, es que se publica **una lista de nombres de
personas identificables a internet abierto**, sin que nadie haya consentido esa difusión. Si los
participantes son compañeros de trabajo, es un tratamiento de datos personales difundido más allá
de su finalidad.

**Arreglo propuesto:**
- Quitar `userId` del leaderboard archivado y resaltar la fila propia por otra vía (p. ej. un hash
  corto del UID, o marcar el ranking del usuario en el cliente cruzando con su propio ballot).
- Cerrar la lectura de `results` con S-1. **Aplicado**: además de exigir que la edición esté
  publicada, las reglas piden sesión (`request.auth != null`), así que la lista de nombres pasa de
  «internet abierto» a «quien entra con su cuenta», el mismo requisito que para votar.
- Decisión de producto pendiente: ¿el ranking debe llevar nombres o basta con apodos elegidos por
  cada uno? Hoy el nombre lo pone Google sin que el usuario lo decida.

---

## S-3 🟠 La clave de la API de RAWG sigue en el historial de git

**Dónde:** commit `f31c4a2` («feat: update app»), archivo `.env.production` (ya eliminado del árbol).

```
RAWG_API_KEY=4b90ea55…   (recuperable con: git show f31c4a2:.env.production)
```

Que el archivo ya no exista no borra nada: sigue en el historial y viaja con cada clon, fork o
espejo del repositorio.

**Arreglo propuesto:**
1. **Rotar la clave en rawg.io.** Es lo único que la neutraliza, y es lo primero.
2. Después, si el repositorio se comparte, reescribir el historial (`git filter-repo --invert-paths
   --path .env.production`) y forzar el push. Requiere coordinar con quien tenga clones.
3. Si `functions/` se elimina (ver S-4), la clave deja de hacer falta en ningún sitio.

---

## S-4 🟠 `functions/games.js` publica un endpoint abierto que la aplicación no usa

**Dónde:** `functions/games.js`.

CloudFlare Pages despliega automáticamente todo lo que hay en `functions/`, así que ese archivo
expone una ruta pública en el dominio de producción. **Nadie la llama**: no hay un solo `fetch` a
`/games` ni a `/api/` en `src/` (verificado). Es código muerto, pero desplegado y accesible.

Lo que ofrece a quien lo encuentre:
- Un **proxy abierto a la API de RAWG con tu clave** (`functions/games.js:118`): cualquiera consume
  tu cuota gratuita hasta agotarla.
- El **rate limit no limita nada** (`functions/games.js:13-31`): `rateLimitStore` es un objeto en
  memoria del isolate, y en Workers cada petición puede caer en un isolate distinto, que además se
  recicla. El propio archivo ya avisa de que la caché en memoria no persiste entre requests, pero
  el limitador se escribió igualmente sobre ese supuesto.
- El parámetro `q` no tiene **límite de longitud**: se reenvía a RAWG tras `encodeURIComponent`.
- Los `Access-Control-Allow-Origin` restrictivos no protegen: CORS lo aplica el navegador, no
  detiene un `curl`.

**Arreglo propuesto:** borrar `functions/` — es la opción correcta para código que nadie invoca, y
resuelve S-3 de paso. Si algún día se recupera la búsqueda de carátulas: acotar `q` (p. ej. 100
caracteres), y hacer el rate limiting con KV o Durable Objects, que sí tienen estado compartido.

---

## S-5 🟡 Los valores de `selections` no se validan

**Dónde:** `firestore.rules:103-104`.

```js
d.selections is map &&
d.selections.size() > 0 && d.selections.size() <= maxSelections() &&
```

Se comprueba que es un mapa y cuántas entradas trae, pero no **qué** trae. Un votante autenticado
puede escribir, con el SDK y desde la consola del navegador, 60 claves inventadas con cadenas de
decenas de KB cada una, hasta el límite de 1 MiB por documento de Firestore.

El impacto está acotado —solo puede hacerlo sobre *su propio* documento, React escapa todo lo que
el panel renderiza y `resolveOptionId` descarta lo que no casa con una categoría real—, pero
ensucia la colección, infla el snapshot público y encarece las lecturas del panel.

**Arreglo propuesto.** Rules no sabe iterar los valores de un mapa, así que la vía practicable es
validar las **claves** contra una lista cerrada: guardar los ids de categoría activos en
`config/voting.categoryIds` (lo escribe el admin junto al resto del calendario) y exigir

```js
d.selections.keys().hasOnly(get(votingConfigRef()).data.get('categoryIds', d.selections.keys()))
```

Con las claves acotadas, el tamaño máximo del documento queda acotado de hecho. Es una mejora de
robustez, no urgente.

---

## S-6 🟡 El panel lee `ballots` antes de saber si eres admin

**Dónde:** `src/components/AdminPanel.jsx:33`.

`useFirestoreBallots()` se monta incondicionalmente, antes de que `useAdminCheck()` (línea 31) haya
resuelto el claim. Cualquier usuario autenticado que abra `/admin` dispara un
`getDocs(collection(db,'ballots'))` sobre la colección entera.

**No hay fuga**: las reglas rechazan la lectura y el usuario acaba redirigido a `/`. Pero se paga
una petición fallida por visita, se llena la consola de `permission-denied`, y el día que alguien
relaje esa regla el panel ya estaría pidiendo los datos. Es defensa en profundidad.

**Arreglo propuesto:** dar a los hooks de datos un parámetro `enabled` y pasarles `isAdmin`, igual
que ya hace `useSeasonResult(season, resultsArePublic)`.

---

## S-7 🟡 `AdminPanel` enseña el mensaje crudo de Firebase

**Dónde:** `src/components/AdminPanel.jsx:156`.

```js
setErrorMessage(error.message || 'Error al iniciar sesión');
```

`useAuthSession` ya aprendió esta lección: mapea el código de error a una clave de i18n y nunca
muestra el texto de Firebase, «que puede incluir detalles internos». El panel se quedó fuera del
cambio, y además el literal de respaldo está en español dentro de una aplicación bilingüe.

**Arreglo propuesto:** reutilizar el mapa `AUTH_ERROR_KEYS` de `useAuthSession` (extraerlo a
`utils/` o exportarlo) y traducir con `t()`.

---

## S-8 🔵 `config/{document=**}` es público por comodín

**Dónde:** `firestore.rules:159-161`.

Hoy solo existe `config/voting` y es correcto que se lea sin sesión. Pero el comodín `{document=**}`
hace pública **cualquier** ruta futura bajo `config/`, incluidas subcolecciones que nadie recuerde
que caen ahí.

**Arreglo propuesto:** `match /config/voting { allow read: if true; allow write: if isAdmin(); }` y,
si hace falta, `match /config/{document=**} { allow read, write: if isAdmin(); }` como red por
debajo.

---

## S-9 🔵 `package-lock.json` ignorado y versionado a la vez

**Dónde:** `.gitignore:3`.

El lockfile **sí está en el repositorio** (bien: es lo que hace reproducible el build de
CloudFlare), pero `.gitignore` lo excluye. La contradicción invita a que alguien lo borre algún día
«para arreglar el gitignore», y sin lockfile cada build resuelve los rangos `^` de nuevo: basta con
que una dependencia transitiva publique una versión comprometida para que entre en producción sin
cambiar una línea de código. Es la vía de entrada clásica de la cadena de suministro.

**Arreglo propuesto:** borrar la línea 3 de `.gitignore`. Ya estaba como 7.4 en la auditoría
anterior, sin aplicar.

---

## S-10 🔵 Sin App Check y sin restringir la API key por dominio

Que `VITE_FIREBASE_API_KEY` viaje en el bundle es **correcto**: en Firebase esa clave identifica el
proyecto, no autoriza nada, y la seguridad la dan las reglas. Dicho eso, quedan dos apoyos sin
poner:

- **Restricción por referrer HTTP** de la clave en Google Cloud Console, y lista mínima de dominios
  autorizados en Firebase Auth. No impide un cliente REST decidido, pero corta el uso casual de tu
  proyecto desde otra web.
- **App Check** (reCAPTCHA v3 / Enterprise). Sin él, nada distingue a tu aplicación de un script:
  las cuentas de Google son gratuitas e ilimitadas, así que un participante motivado puede crear
  varias y emitir varios votos. El modelo «un voto por UID» es sólido frente al re-voto, no frente
  a la multicuenta.

Coste de implantación bajo (una línea en `firebase.js` y activar el proveedor), y sube el listón
para quien quiera manipular la porra.

---

## Lo que se aplicó

**S-1 · Los ganadores dejan de ser públicos, y el snapshot espera a su fecha.**
Los ganadores se mudaron de `categories/{id}.winner` —colección que *tiene* que ser pública para
poder votar— a **`admin/winners`**, un documento que solo lee un administrador. Las reglas ganaron
`resultsArePublished()`, gemela de `votingIsOpen()`: `results/{seasonId}` no se lee hasta que llega
`resultsAt`, con dos excepciones, el admin y las ediciones ya archivadas (`closedAt`), para que el
palmarés de años anteriores siga siendo público. Las colecciones legacy `winners`/`surveyWinners`
también se cerraron: por su nombre, cualquier dato que quedara dentro sería un ganador filtrado.

`winnersService.saveWinners()` **migra sola**: escribe el documento nuevo y borra el campo `winner`
de las categorías que aún lo tengan, así que el primer guardado desde el panel limpia lo que hoy
está publicado en producción. `fetchWinners()` lee el formato antiguo mientras tanto, de modo que
no hay ventana en la que el panel se quede sin ganadores.

**S-2 · La clasificación publicada ya no lleva identificadores reales.**
`buildSeasonSnapshot` quita `userId` de cada entrada y deja `uidHash`, una huella de 64 bits
(`src/utils/pseudonym.js`). La pantalla sigue resaltando la fila propia con `isOwnEntry()`, que
compara huellas y tolera los archivos antiguos —los que sí guardaban el UID— sin migrarlos.

**S-4 · `functions/` eliminado.** Era código muerto que CloudFlare Pages desplegaba igualmente.

**S-5 · Tope al contenido de `selections`, no solo al número de entradas.**
`selections.values().join('').size() <= 3600` en las reglas. Se eligió esta vía sobre validar las
claves contra una lista de categorías precisamente para no poder desincronizarse: una lista
desactualizada habría rechazado votos legítimos.

**S-6, S-7, S-8, S-9** · `useFirestoreBallots(enabled)` y `useSeasonResults(enabled)` esperan al
claim; la tabla de errores de Firebase Auth se extrajo a `src/utils/authErrors.js` y ahora la usan
los dos logins; `config/voting` es el único documento público de `config/`; y el lockfile salió del
`.gitignore`.

**Cobertura nueva:** 13 casos de reglas (publicación por fecha, histórico archivado,
`admin/winners`, `config` sin comodín, legacy cerrado, tamaño de `selections`), los tests de
`pseudonym` y `winnersService` reescritos, y el e2e del panel ahora **afirma que `categories.winner`
no existe** y que el leaderboard publicado no trae `userId`.

---

## Lo que queda por hacer

1. **Desplegar las reglas** — nada de S-1, S-2, S-5 ni S-8 protege producción hasta entonces:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. **Rotar la clave de RAWG** (S-3) en rawg.io. Sigue siendo recuperable del historial con
   `git show f31c4a2:.env.production`, y rotarla es lo único que la neutraliza. Ya no hace falta en
   ningún sitio: `functions/` está eliminado. Si además quieres limpiarla del historial:
   `git filter-repo --invert-paths --path .env.production` (reescribe el historial; coordínalo con
   cualquier clon).
3. **Entrar una vez en el panel → Ganadores → Guardar**, aunque no cambies nada: es lo que dispara
   la migración y borra el `winner` que hoy está publicado en las categorías de producción.
4. **Decidir sobre S-10**: restringir la API key por referrer en Google Cloud Console es gratis y
   rápido; App Check ya es una decisión de producto.
