/**
 * Tests de firestore.rules contra el emulador.
 *
 * Ejecutar con: npm run test:rules
 * (levanta el emulador de Firestore y corre esta suite dentro)
 *
 * Cubre lo que endurece el Sprint 2 de la auditoría:
 *  - el plazo de votación se cumple en SERVIDOR, no solo en el navegador;
 *  - el esquema del ballot (tipos, tamaños y correo == token);
 *  - el límite de ediciones del propio voto (contador que avanza en servidor);
 *  - y que sigue en pie lo que ya funcionaba (un voto por persona, privacidad
 *    de los ballots, escritura de categorías/config solo para admin).
 */

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'tga-ballot-rules-test';
const UID = 'user-123';
const EMAIL = 'votante@example.com';
const OTHER_UID = 'user-456';
/** Fecha del envío inicial: fija, porque una edición no puede cambiarla. */
const SUBMITTED_AT = '2026-06-01T10:00:00.000Z';

let testEnv;

/** Ballot válido; se le pueden sobreescribir campos para probar rechazos. */
const validBallot = (overrides = {}) => ({
  userId: UID,
  userEmail: EMAIL,
  userNickname: 'Votante',
  userDisplayName: 'Votante',
  selections: { cat1: 'cat1_option_0', cat2: 'cat2_option_1' },
  season: 2026,
  submittedAt: SUBMITTED_AT,
  updatedAt: SUBMITTED_AT,
  editCount: 0,
  isActive: true,
  ...overrides,
});

/** Deja un voto ya emitido en Firestore, saltándose las reglas. */
const seedBallot = async (overrides = {}) => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'ballots', UID), validBallot(overrides));
  });
};

/** Contexto de un usuario normal autenticado con Google (token con email). */
const asVoter = (uid = UID, email = EMAIL) =>
  testEnv.authenticatedContext(uid, { email, email_verified: true }).firestore();

/** Contexto de un administrador (custom claim admin:true). */
const asAdmin = () =>
  testEnv
    .authenticatedContext('admin-1', { email: 'admin@example.com', admin: true })
    .firestore();

/** Escribe config/voting saltándose las reglas. */
const setVotingConfig = async (data) => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'config', 'voting'), data);
  });
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('firestore.rules', () => {
  describe('plazo de votación (se cumple en servidor)', () => {
    it('permite votar si no hay config/voting todavía', async () => {
      // Estado "el admin aún no ha configurado nada": no debe bloquear.
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot())
      );
    });

    it('permite votar con la votación abierta y sin fecha de cierre', async () => {
      await setVotingConfig({ isOpen: true, season: 2026, closesAtMillis: null });
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot())
      );
    });

    it('RECHAZA votar con la votación cerrada por el admin', async () => {
      await setVotingConfig({ isOpen: false, season: 2026 });
      await assertFails(setDoc(doc(asVoter(), 'ballots', UID), validBallot()));
    });

    it('RECHAZA votar después de la fecha de cierre', async () => {
      await setVotingConfig({
        isOpen: true,
        season: 2026,
        closesAtMillis: Date.now() - 60_000, // cerró hace un minuto
      });
      await assertFails(setDoc(doc(asVoter(), 'ballots', UID), validBallot()));
    });

    it('permite votar si config/voting existe pero no declara isOpen', async () => {
      // Documento a medio configurar: no debe bloquear (mismo criterio que el
      // cliente, que trata la ausencia del campo como "abierta").
      await setVotingConfig({ season: 2026 });
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot())
      );
    });

    it('permite votar antes de la fecha de cierre', async () => {
      await setVotingConfig({
        isOpen: true,
        season: 2026,
        closesAtMillis: Date.now() + 3_600_000, // cierra dentro de una hora
      });
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot())
      );
    });

    it('RECHAZA votar antes de la fecha de apertura', async () => {
      // La edición está programada: el calendario manda aunque isOpen sea true.
      await setVotingConfig({
        isOpen: true,
        season: 2026,
        opensAtMillis: Date.now() + 3_600_000, // abre dentro de una hora
        closesAtMillis: Date.now() + 7_200_000,
      });
      await assertFails(setDoc(doc(asVoter(), 'ballots', UID), validBallot()));
    });

    it('permite votar dentro de la ventana apertura-cierre', async () => {
      await setVotingConfig({
        isOpen: true,
        season: 2026,
        opensAtMillis: Date.now() - 60_000, // abrió hace un minuto
        closesAtMillis: Date.now() + 3_600_000,
      });
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot())
      );
    });

    it('RECHAZA votar dentro de la ventana si el admin fuerza el cierre', async () => {
      // `isOpen: false` es un cierre anticipado: nunca abre, pero sí cierra.
      await setVotingConfig({
        isOpen: false,
        season: 2026,
        opensAtMillis: Date.now() - 60_000,
        closesAtMillis: Date.now() + 3_600_000,
      });
      await assertFails(setDoc(doc(asVoter(), 'ballots', UID), validBallot()));
    });
  });

  describe('esquema del ballot', () => {
    it('RECHAZA un correo que no es el del token (suplantación)', async () => {
      await assertFails(
        setDoc(
          doc(asVoter(), 'ballots', UID),
          validBallot({ userEmail: 'otra-persona@example.com' })
        )
      );
    });

    it('RECHAZA una temporada que no es un entero', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ season: '2026' }))
      );
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ season: 2026.5 }))
      );
    });

    it('RECHAZA un mapa de selecciones desmesurado', async () => {
      const selections = {};
      for (let i = 0; i < 200; i += 1) selections[`cat${i}`] = `opt${i}`;
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ selections }))
      );
    });

    it('RECHAZA un ballot sin selecciones', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ selections: {} }))
      );
    });

    it('RECHAZA nombres vacíos o demasiado largos', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ userDisplayName: '' }))
      );
      await assertFails(
        setDoc(
          doc(asVoter(), 'ballots', UID),
          validBallot({ userDisplayName: 'x'.repeat(51) })
        )
      );
    });

    it('RECHAZA campos de más', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ isAdmin: true }))
      );
    });

    it('RECHAZA campos que faltan', async () => {
      const { season, ...sinSeason } = validBallot();
      expect(season).toBe(2026);
      await assertFails(setDoc(doc(asVoter(), 'ballots', UID), sinSeason));
    });

    it('RECHAZA isActive: false', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ isActive: false }))
      );
    });
  });

  describe('propiedad y un voto por persona', () => {
    it('RECHAZA escribir en el ballot de otra persona', async () => {
      await assertFails(
        setDoc(
          doc(asVoter(), 'ballots', OTHER_UID),
          validBallot({ userId: OTHER_UID })
        )
      );
    });

    it('RECHAZA votar sin autenticar', async () => {
      await assertFails(
        setDoc(
          doc(testEnv.unauthenticatedContext().firestore(), 'ballots', UID),
          validBallot()
        )
      );
    });

    it('RECHAZA crear un voto con el contador de ediciones ya avanzado', async () => {
      // Empezar en 3 sería colarse tres correcciones de regalo... al revés:
      // dejaría el cupo tocado sin haber editado. El primer envío es siempre 0.
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 3 }))
      );
    });
  });

  describe('edición del propio voto (máximo 5)', () => {
    it('permite corregir el voto dentro de plazo', async () => {
      await seedBallot();
      await assertSucceeds(
        setDoc(
          doc(asVoter(), 'ballots', UID),
          validBallot({ userDisplayName: 'Cambiado', editCount: 1 })
        )
      );
    });

    it('RECHAZA una edición que no incrementa el contador', async () => {
      // Si valiera con "no pasar de 5", el cliente reenviaría siempre 1 y
      // editaría sin fin: el contador debe avanzar de uno en uno.
      await seedBallot({ editCount: 2 });
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 2 }))
      );
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 1 }))
      );
    });

    it('RECHAZA saltarse ediciones en el contador', async () => {
      await seedBallot({ editCount: 1 });
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 5 }))
      );
    });

    it('permite la quinta edición y RECHAZA la sexta', async () => {
      await seedBallot({ editCount: 4 });
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 5 }))
      );
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 6 }))
      );
    });

    it('RECHAZA editar fuera de plazo', async () => {
      await setVotingConfig({
        isOpen: true,
        season: 2026,
        closesAtMillis: Date.now() - 60_000,
      });
      await seedBallot();
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 1 }))
      );
    });

    it('RECHAZA cambiar la fecha del envío inicial o la temporada al editar', async () => {
      await seedBallot();
      await assertFails(
        setDoc(
          doc(asVoter(), 'ballots', UID),
          validBallot({ editCount: 1, submittedAt: new Date().toISOString() })
        )
      );
      await assertFails(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 1, season: 2027 }))
      );
    });

    it('RECHAZA editar el voto de otra persona', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'ballots', OTHER_UID),
          validBallot({ userId: OTHER_UID, userEmail: 'otro@example.com' })
        );
      });
      await assertFails(
        setDoc(
          doc(asVoter(), 'ballots', OTHER_UID),
          validBallot({ userId: OTHER_UID, userEmail: EMAIL, editCount: 1 })
        )
      );
    });

    it('permite corregir un voto antiguo, escrito antes del contador', async () => {
      // Compatibilidad: los ballots emitidos antes de esta feature no tienen
      // `editCount`; deben poder corregirse partiendo de cero.
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const { editCount, updatedAt, ...legacy } = validBallot();
        expect(editCount).toBe(0);
        expect(updatedAt).toBe(SUBMITTED_AT);
        await setDoc(doc(ctx.firestore(), 'ballots', UID), legacy);
      });
      await assertSucceeds(
        setDoc(doc(asVoter(), 'ballots', UID), validBallot({ editCount: 1 }))
      );
    });
  });

  describe('privacidad de los ballots', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'ballots', UID), validBallot());
      });
    });

    it('el dueño puede leer su voto', async () => {
      await assertSucceeds(getDoc(doc(asVoter(), 'ballots', UID)));
    });

    it('RECHAZA leer el voto de otra persona', async () => {
      await assertFails(getDoc(doc(asVoter(OTHER_UID, 'otro@example.com'), 'ballots', UID)));
    });

    it('el admin puede leer cualquier voto', async () => {
      await assertSucceeds(getDoc(doc(asAdmin(), 'ballots', UID)));
    });

    it('solo el admin puede borrar votos (reinicio anual)', async () => {
      await assertFails(deleteDoc(doc(asVoter(), 'ballots', UID)));
      await assertSucceeds(deleteDoc(doc(asAdmin(), 'ballots', UID)));
    });
  });

  describe('categorías y configuración', () => {
    it('la lectura de categorías es pública', async () => {
      await assertSucceeds(
        getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'categories', 'cat1'))
      );
    });

    it('RECHAZA que un votante escriba categorías', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'categories', 'cat1'), { title: { es: 'Pirata' } })
      );
    });

    it('el admin sí puede escribir categorías', async () => {
      await assertSucceeds(
        setDoc(doc(asAdmin(), 'categories', 'cat1'), { title: { es: 'GOTY' } })
      );
    });

    it('RECHAZA que un votante abra la votación', async () => {
      await assertFails(
        setDoc(doc(asVoter(), 'config', 'voting'), { isOpen: true })
      );
    });

    it('RECHAZA que un votante lea la colección admin', async () => {
      await assertFails(getDoc(doc(asVoter(), 'admin', 'secretos')));
    });
  });
});
