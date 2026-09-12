/**
 * Tests de firestore.rules contra el emulador.
 *
 * Ejecutar con: npm run test:rules
 * (levanta el emulador de Firestore y corre esta suite dentro)
 *
 * Cubre lo que endurece el Sprint 2 de la auditoría:
 *  - el plazo de votación se cumple en SERVIDOR, no solo en el navegador;
 *  - el esquema del ballot (tipos, tamaños y correo == token);
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

let testEnv;

/** Ballot válido; se le pueden sobreescribir campos para probar rechazos. */
const validBallot = (overrides = {}) => ({
  userId: UID,
  userEmail: EMAIL,
  userNickname: 'Votante',
  userDisplayName: 'Votante',
  selections: { cat1: 'cat1_option_0', cat2: 'cat2_option_1' },
  season: 2026,
  submittedAt: new Date().toISOString(),
  isActive: true,
  ...overrides,
});

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

    it('RECHAZA sobrescribir un voto ya emitido', async () => {
      await assertSucceeds(setDoc(doc(asVoter(), 'ballots', UID), validBallot()));
      await assertFails(
        setDoc(
          doc(asVoter(), 'ballots', UID),
          validBallot({ userDisplayName: 'Cambiado' })
        )
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
