# TGA Ballot — porra de The Game Awards

Aplicación de votación para The Game Awards. Los usuarios entran con Google, votan categoría
por categoría, revisan su porra y la envían. Un voto por persona, no modificable.

Hay un panel de administración en la ruta oculta `/admin` para gestionar categorías, nominados,
ganadores y el ciclo anual.

- **Stack**: React 18 · Vite 5 · Tailwind CSS 3 · Firebase 11 (Auth + Firestore + Analytics)
- **Despliegue**: CloudFlare Pages (estático, `dist/`)

> Si vas a tocar código, lee antes [`CLAUDE.md`](CLAUDE.md): es la fuente de verdad de las
> convenciones, el modelo de datos y las reglas del proyecto.

---

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

La configuración de Firebase **nunca va en el código**. Copia la plantilla y rellénala con los
valores de tu proyecto (Firebase Console → Configuración del proyecto → Tus apps):

```bash
cp .env.example .env.local
```

Son siete variables `VITE_FIREBASE_*` (api key, auth domain, project id, storage bucket,
messaging sender id, app id y measurement id). `.env.local` está en `.gitignore`.

> Sin `.env.local`, `getAuth()` lanza `auth/invalid-api-key` **en tiempo de importación** y la
> página se queda **en blanco**, antes de que React monte. Si te pasa, es esto.

### 3. Firebase Console

- **Authentication** → habilita el proveedor **Google**.
- **Authentication → Settings → Authorized domains** → añade `localhost` y tu dominio de
  producción. Sin esto el login falla con `auth/unauthorized-domain`.
- **Firestore Database** → créala si no existe.

### 4. Reglas de Firestore

Las reglas viven en [`firestore.rules`](firestore.rules) y se publican con:

```bash
firebase deploy --only firestore:rules
```

No las edites desde la consola web: se sobrescribirían en el siguiente despliegue.

### 5. Acceso de administrador

El panel `/admin` se abre solo con el **custom claim** `admin: true`, que verifica el servidor y
no se puede falsificar desde el cliente. Asígnalo una vez con el Admin SDK o la CLI:

```js
admin.auth().setCustomUserClaims(uid, { admin: true })
```

El usuario debe **volver a iniciar sesión** para que su token recoja el claim.

> Sin el claim, `/admin` redirige a `/` sin ningún aviso (para no confirmar que la ruta existe).
> Si acabas de asignarlo y sigues sin entrar, cierra sesión y vuelve a entrar.

### 6. Arrancar

```bash
npm run dev     # http://localhost:5173
```

En macOS y Windows hay lanzadores de doble clic: `TGA.command` y `TGA.bat`.

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run build` | Build de producción en `dist/` (minificado, sin `console.*`) |
| `npm run preview` | Sirve el build para comprobarlo antes de desplegar |
| `npm test` | Tests unitarios (Vitest, una pasada) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:rules` | Tests de `firestore.rules` contra el emulador (**necesita Java**) |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |

`test:rules` descarga `firebase-tools` con `npx`, así que no hace falta tenerlo instalado; sí
hace falta una JVM, que es sobre lo que corre el emulador de Firestore.

**CI**: `.github/workflows/ci.yml` ejecuta lint + tests + build y, en un trabajo aparte, los
tests de reglas, en cada push y PR a `develop` y `master`.

---

## Despliegue (CloudFlare Pages)

1. Conecta el repositorio en <https://dash.cloudflare.com> → Pages.
2. **Build command**: `npm run build` · **Output directory**: `dist`
3. Define las siete variables `VITE_FIREBASE_*` en *Settings → Environment variables*. Sin ellas
   el build sale sin configuración y la página aparece en blanco.
4. Añade el dominio de Pages a los *Authorized domains* de Firebase Auth.

### Dos archivos que no son opcionales

Viven en `public/` y Vite los copia tal cual a `dist/`:

- **`public/_redirects`** (`/* /index.html 200`) — sin él, CloudFlare devuelve un **404 estático**
  en `/admin` y React no llega a arrancar: el panel queda inaccesible en producción.
- **`public/_headers`** — CSP y cabeceras de seguridad (HSTS, `X-Frame-Options`, `nosniff`,
  COOP/CORP). La CSP autoriza el script anti-FOUC de `index.html` **por su hash sha256**: si
  tocas ese script hay que recalcularlo (el propio archivo trae el comando), y
  `src/test/csp.test.js` falla si se olvida.

Son formato de CloudFlare Pages. Si algún día se migra a otro proveedor, hay que traducirlos.

---

## Operación anual

Todo se gestiona desde `/admin`; no hace falta tocar Firestore a mano.

### Abrir una edición

1. **Categorías** → crea o edita las categorías y sus nominados del año. El título es bilingüe
   (ES/EN); los nombres de los juegos van en un solo idioma. El orden se cambia arrastrando o
   con las flechas.
2. **Temporada** → fija la **fecha de cierre** y pulsa **Abrir votación**.

> La fecha de cierre se guarda como ese día a las 23:59:59 en **Europe/Madrid** y **se valida en
> el servidor**: pasado el plazo, las reglas de Firestore rechazan cualquier voto nuevo, no solo
> la interfaz.

> Si `config/voting` todavía no existe, la aplicación considera la votación **abierta**. Es el
> estado «aún sin configurar» y no bloquea la primera edición, pero conviene configurarla
> explícitamente antes de publicar.

### Durante la votación

- **Resumen** → participación y top 3 por categoría.
- **Todas las papeletas** → una fila por voto, con el detalle de cada uno.

### Cerrar y dar resultados

1. **Temporada** → **Cerrar votación** (o deja que venza la fecha).
2. **Seleccionar Ganadores** → marca el ganador de cada categoría.
3. **Clasificación** → puntos por usuario. Cada acierto suma el `weight` de la categoría.

### Reiniciar para el año siguiente

**Temporada → Archivar y reiniciar**. En un solo paso:

1. Archiva ganadores y clasificación en `results/{año}` (el histórico, de lectura pública).
2. **Borra todos los votos**.
3. Vacía los nominados de cada categoría, conservando los documentos (título, peso y orden se
   mantienen año a año).
4. Avanza la temporada y deja la votación cerrada.

> Es **destructivo e irreversible**: borra las papeletas. Lo archivado en `results/{año}` es lo
> único que queda de la edición anterior, y se consulta en la pestaña **Histórico**.

---

## Estructura

```
src/
├── App.jsx                  # Orquestador: estado y cascada de pantallas
├── firebase.js              # Config Firebase desde import.meta.env + lazy Analytics
├── context/AppContext.jsx   # Idioma y tema
├── components/
│   ├── admin/               # Pestañas y sub-paneles de /admin
│   ├── ui/                  # Primitivos (Button, Card, Alert, LoadingSpinner…)
│   ├── form/                # Inputs de formulario
│   └── layouts/             # ScreenLayout, ControlBar
├── hooks/                   # useVotingFlow, useAuthSession, useViewport, useTheme…
├── services/                # Firestore, analítica, errores, logger
├── data/i18n/{es,en}.js     # Textos (mismas claves en ambos idiomas)
├── styles/                  # Tokens, capa semántica y animaciones del tema
└── utils/                   # Helpers puros (scoring, localize, routes, closingDate…)
```

Los datos de categorías y nominados **no están en el código**: viven en la colección
`categories` de Firestore y se editan desde `/admin`.

### Colecciones de Firestore

| Colección | Lectura | Escritura |
|---|---|---|
| `ballots/{uid}` | Solo el dueño o un admin | Solo crear, y solo el dueño |
| `categories/{id}` | Pública | Admin |
| `config/voting` | Pública | Admin |
| `results/{año}` | Pública | Admin |
| `admin/**` | Admin | Admin |

---

## Seguridad

- **Un voto por persona**: el UID de Firebase es el ID del documento, y las reglas permiten
  `create` pero **deniegan `update`**. Un voto emitido no se puede modificar, ni desde la
  consola del navegador.
- **El plazo se valida en el servidor**, no solo en la interfaz.
- **Las papeletas no son públicas**: solo las lee su dueño o un administrador.
- **El correo no se puede suplantar**: las reglas exigen que coincida con el del token.
- **Nada de PII en la analítica**: los eventos no llevan correo ni nombre.
- **`localStorage`** guarda solo el progreso a medias, nunca el voto definitivo.

---

## Problemas frecuentes

**La página sale en blanco.**
Falta `.env.local` (o las variables en CloudFlare). `getAuth()` lanza en tiempo de importación y
nada llega a renderizarse. Mira la consola: `auth/invalid-api-key`.

**El popup de Google no abre o se queda colgado.**
Revisa los *Authorized domains* de Firebase Auth. En producción, comprueba además que la CSP de
`public/_headers` no esté bloqueando `apis.google.com` o `accounts.google.com`, y que
`Cross-Origin-Opener-Policy` siga siendo `same-origin-allow-popups`: con `same-origin` a secas,
`signInWithPopup` **se cuelga sin dar error**.

**`/admin` me manda a la página principal.**
No tienes el claim `admin: true`, o tu token todavía no lo ha recogido: cierra sesión y vuelve a
entrar.

**`/admin` da 404 en producción.**
Falta `public/_redirects` en el build.

**No aparecen categorías.**
Están vacías en Firestore, o todos los documentos son placeholders. Entra en `/admin` →
Categorías. Tras el reinicio anual es lo normal: hay que cargar los nominados del año.

**«Ya has votado» y no era yo.**
Un voto va asociado al UID de Google. Si compartís dispositivo, cerrad sesión entre personas:
el bloqueo es por cuenta, no por navegador.

---

## Licencia

MIT
