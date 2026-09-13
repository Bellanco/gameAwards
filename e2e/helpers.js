/**
 * Utilidades para las pruebas e2e: sembrar Firestore, vaciar los emuladores y
 * pasar por el login de Google.
 *
 * Todo va contra los emuladores por su API REST. La de Firestore acepta el
 * token `owner`, que se salta las reglas: sembrar categorías o dejar un voto ya
 * emitido no debe depender de tener permisos de admin en la app.
 */

const PROJECT_ID = 'tga-ballot-e2e';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

/** JS -> formato de valores de la API REST de Firestore. */
const toValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: toFields(value) } };
};

const toFields = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));

/** Escribe (o reemplaza) un documento saltándose las reglas. */
export async function seedDoc(collection, id, data) {
  const response = await fetch(`${FIRESTORE}/${collection}?documentId=${id}`, {
    method: 'POST',
    headers: OWNER,
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`seedDoc ${collection}/${id}: ${response.status} ${await response.text()}`);
  }
  if (response.status === 409) {
    // Ya existía: se sobrescribe con PATCH.
    const patch = await fetch(`${FIRESTORE}/${collection}/${id}`, {
      method: 'PATCH',
      headers: OWNER,
      body: JSON.stringify({ fields: toFields(data) }),
    });
    if (!patch.ok) throw new Error(`seedDoc PATCH ${collection}/${id}: ${patch.status}`);
  }
}

/** Lee un documento tal cual lo guardó la app (para comprobar lo que se votó). */
export async function readDoc(collection, id) {
  const response = await fetch(`${FIRESTORE}/${collection}/${id}`, { headers: OWNER });
  if (response.status === 404) return null;
  const body = await response.json();
  const fromValue = (v) => {
    if ('nullValue' in v) return null;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('stringValue' in v) return v.stringValue;
    // `serverTimestamp()` llega por REST como timestampValue. Sin esta rama,
    // campos como `closedAt` se leían como undefined y un test podía dar por
    // bueno un documento al que le faltaba justo lo que comprobaba.
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
    if ('mapValue' in v) {
      return Object.fromEntries(
        Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fromValue(val)])
      );
    }
    return undefined;
  };
  return Object.fromEntries(
    Object.entries(body.fields || {}).map(([k, v]) => [k, fromValue(v)])
  );
}

/** Deja los dos emuladores como recién arrancados. */
export async function resetEmulators() {
  await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE', headers: OWNER }
  );
  await fetch(`${AUTH}/accounts`, { method: 'DELETE', headers: OWNER });
}

/** Categoría con nominados, en el formato real ({ id, name } + optionIds). */
export function buildCategory(id, titleEs, nombres, extra = {}) {
  const options = nombres.map((name, index) => ({ id: `${id}_option_${index}`, name }));
  return {
    id,
    data: {
      title: { es: titleEs, en: titleEs },
      options,
      optionIds: options.map((o) => o.id),
      weight: 1,
      orderIndex: extra.orderIndex ?? 0,
      isActive: true,
    },
  };
}

/**
 * Edición abierta: una sola fecha, la de cierre, y nada publicado todavía.
 *
 * `lastPublishedId` vacío es lo que mantiene oculta la pantalla pública de
 * resultados; se rellena al publicar la edición (ver `seasonPublished`).
 */
export const votingOpen = (overrides = {}) => ({
  isOpen: true,
  season: 2026,
  seasonId: 'porra-2026',
  seasonName: 'Porra 2026',
  closesAt: new Date(Date.now() + 86_400_000).toISOString(),
  closesAtMillis: Date.now() + 86_400_000,
  opensAt: null,
  opensAtMillis: null,
  resultsAt: null,
  resultsAtMillis: null,
  lastPublishedId: '',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Edición ya publicada: sin fecha de cierre (no hay edición en marcha) y con el
 * archivo publicado al que apunta la pantalla pública.
 */
export const seasonPublished = (publishedId, overrides = {}) =>
  votingOpen({
    isOpen: false,
    seasonId: '',
    seasonName: '',
    closesAt: null,
    closesAtMillis: null,
    lastPublishedId: publishedId,
    ...overrides,
  });

/**
 * Entra con Google a través del emulador de Auth.
 *
 * El emulador sustituye el popup de Google por una pantalla propia: hay que
 * crear la cuenta la primera vez y elegirla las siguientes. Se automatiza tal
 * cual lo haría una persona, así que la prueba recorre el mismo camino que la
 * app en producción (signInWithPopup incluido).
 */
export async function signInWithGoogle(page, { email, name }) {
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: /google/i }).click(),
  ]);

  await popup.waitForLoadState('domcontentloaded');

  const existing = popup.getByText(email, { exact: false }).first();
  if (await existing.isVisible().catch(() => false)) {
    await existing.click();
  } else {
    await popup.getByRole('button', { name: /add new account/i }).click();
    await popup.locator('#email-input').fill(email);
    await popup.locator('#display-name-input').fill(name);
    await popup.getByRole('button', { name: /sign in with google/i }).click();
  }

  await popup.waitForEvent('close', { timeout: 15_000 }).catch(() => {});
}

/** Identity Toolkit del emulador (la API de administración de cuentas). */
const IDENTITY = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`;

/** Cuentas que hay ahora mismo en el emulador de Auth. */
async function listAccounts() {
  const response = await fetch(`${IDENTITY}/accounts:query`, {
    method: 'POST',
    headers: OWNER,
    body: '{}',
  });
  const body = await response.json();
  return body.userInfo || [];
}

/**
 * Cuenta del emulador para un correo, esperando a que exista.
 *
 * La acaba de crear el popup del login, así que se espera a verla en vez de
 * confiar en un `waitForTimeout` a ojo.
 */
async function findAccount(email) {
  for (let intento = 0; intento < 20; intento += 1) {
    const account = (await listAccounts()).find((u) => u.email === email);
    if (account) return account;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const emails = (await listAccounts()).map((u) => u.email);
  throw new Error(`No existe la cuenta ${email} en el emulador. Hay: ${emails.join(', ') || '(ninguna)'}`);
}

/**
 * UID de una cuenta ya creada: el mismo `auth.currentUser.uid` que ve la app.
 *
 * Hace falta para sembrar datos que dependen de QUIÉN es el usuario —la huella
 * de la clasificación publicada, por ejemplo (ver src/utils/pseudonym.js)—, que
 * no se pueden escribir antes de que la cuenta exista.
 */
export async function getUid(email) {
  return (await findAccount(email)).localId;
}

/**
 * Convierte una cuenta ya existente en administradora.
 *
 * El acceso de admin depende de un custom claim que verifica el servidor
 * (`admin: true`), no de nada del cliente: lo comprueban `useAdminCheck` y las
 * propias reglas de Firestore. Aquí se pone por la API del emulador, que es el
 * equivalente local de `admin.auth().setCustomUserClaims()`.
 */
export async function grantAdminClaim(email) {
  const account = await findAccount(email);

  const response = await fetch(`${IDENTITY}/accounts:update`, {
    method: 'POST',
    headers: OWNER,
    body: JSON.stringify({
      localId: account.localId,
      customAttributes: JSON.stringify({ admin: true }),
    }),
  });
  if (!response.ok) {
    throw new Error(`grantAdminClaim: ${response.status} ${await response.text()}`);
  }
  return account.localId;
}

/** Olvida la sesión en el navegador (no en el emulador). */
export async function forgetSession(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('firebaseLocalStorageDb');
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });
  await page.context().clearCookies();
}

/**
 * Entra en /admin como administrador.
 *
 * Hacen falta dos pasadas por el login y no es rodeo: el claim solo se puede
 * poner sobre una cuenta que ya exista, y el token emitido en el primer login
 * todavía no lo lleva. Al volver a entrar, el emulador emite un token nuevo que
 * sí lo incluye, que es exactamente lo que pasa en producción cuando a alguien
 * se le da el claim: tiene que volver a iniciar sesión.
 */
export async function signInAsAdmin(page, user) {
  // El primer login va por la portada y no por /admin: allí, al no tener aún el
  // claim, el panel redirige a `/` en cuanto se autentica y esa navegación se
  // cruza con el cierre del popup.
  await page.goto('/');
  await signInWithGoogle(page, user);

  await grantAdminClaim(user.email);

  await forgetSession(page);
  await page.goto('/admin');
  await signInWithGoogle(page, user);
}
