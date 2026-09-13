/**
 * Tests de puntuación (scoring): scoreBallot, assignDenseRanks y computeLeaderboard.
 * describe/it/expect son globales (vite.config.js -> test.globals).
 */
import { scoreBallot, computeLeaderboard, assignDenseRanks } from './scoring';

const categories = [
  {
    id: 'cat1',
    weight: 2,
    winner: 'cat1_option_0',
    options: [
      { id: 'cat1_option_0', es: 'Juego A', en: 'Game A' },
      { id: 'cat1_option_1', es: 'Juego B', en: 'Game B' },
    ],
  },
  {
    id: 'cat2',
    weight: 1,
    winner: 'cat2_option_1',
    options: [
      { id: 'cat2_option_0', es: 'Juego C', en: 'Game C' },
      { id: 'cat2_option_1', es: 'Juego D', en: 'Game D' },
    ],
  },
];

describe('scoreBallot', () => {
  it('suma el weight de cada acierto por optionId', () => {
    const ballot = { selections: { cat1: 'cat1_option_0', cat2: 'cat2_option_1' } };
    expect(scoreBallot(ballot, categories)).toBe(3); // 2 + 1
  });

  it('ignora votos incorrectos o ausentes', () => {
    const ballot = { selections: { cat1: 'cat1_option_1' } }; // fallo en cat1, sin cat2
    expect(scoreBallot(ballot, categories)).toBe(0);
  });

  it('puntúa solo los aciertos', () => {
    const ballot = { selections: { cat1: 'cat1_option_0', cat2: 'cat2_option_0' } };
    expect(scoreBallot(ballot, categories)).toBe(2); // solo cat1
  });

  it('devuelve 0 si el ballot no tiene selecciones', () => {
    expect(scoreBallot({}, categories)).toBe(0);
    expect(scoreBallot(null, categories)).toBe(0);
  });

  it('tolera datos legacy (ganador y voto por nombre)', () => {
    const legacyCats = [
      { id: 'cat1', weight: 1, winner: 'Juego A', options: ['Juego A', 'Juego B'] },
    ];
    const ballot = { selections: { cat1: 'Juego A' } };
    expect(scoreBallot(ballot, legacyCats)).toBe(1);
  });

  it('usa weight 1 por defecto si no se define', () => {
    const cats = [{ id: 'c', winner: 'c_option_0', options: [{ id: 'c_option_0', es: 'X', en: 'X' }] }];
    expect(scoreBallot({ selections: { c: 'c_option_0' } }, cats)).toBe(1);
  });
});

describe('computeLeaderboard', () => {
  const ballots = [
    { userId: 'u1', userDisplayName: 'Ana', selections: { cat1: 'cat1_option_0', cat2: 'cat2_option_1' } }, // 3
    { userId: 'u2', userNickname: 'Beto', selections: { cat1: 'cat1_option_0' } }, // 2
    { userId: 'u3', selections: {} }, // 0
  ];

  it('ordena de mayor a menor y asigna rank', () => {
    const board = computeLeaderboard(ballots, categories);
    expect(board.map((e) => e.userId)).toEqual(['u1', 'u2', 'u3']);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(board[0].points).toBe(3);
  });

  it('resuelve el nickname (displayName > nickname > Anónimo)', () => {
    const board = computeLeaderboard(ballots, categories);
    expect(board[0].nickname).toBe('Ana');
    expect(board[1].nickname).toBe('Beto');
    expect(board[2].nickname).toBe('Anónimo');
  });

  it('empata el puesto de quienes suman los mismos puntos', () => {
    const empatados = [
      { userId: 'u1', userDisplayName: 'Ana', selections: { cat1: 'cat1_option_0' } }, // 2
      { userId: 'u2', userDisplayName: 'Beto', selections: { cat1: 'cat1_option_0' } }, // 2
      { userId: 'u3', userDisplayName: 'Carla', selections: { cat2: 'cat2_option_1' } }, // 1
    ];
    expect(computeLeaderboard(empatados, categories).map((e) => e.rank)).toEqual([1, 1, 2]);
  });

  it('devuelve [] con entrada vacía', () => {
    expect(computeLeaderboard([], categories)).toEqual([]);
    expect(computeLeaderboard(null, categories)).toEqual([]);
  });
});

describe('assignDenseRanks', () => {
  it('da el MISMO puesto a quienes empatan', () => {
    const board = assignDenseRanks([
      { nickname: 'Ana', points: 5 },
      { nickname: 'Beto', points: 5 },
      { nickname: 'Carla', points: 3 },
    ]);
    expect(board.map((e) => e.rank)).toEqual([1, 1, 2]);
  });

  it('no deja huecos tras un empate: el siguiente puesto es el inmediato', () => {
    // Lo que reparte los premios del podio es el PUESTO (ver utils/awards.js):
    // con dos primeros, el tercer clasificado se lleva el título de segundo.
    const board = assignDenseRanks([
      { points: 9 },
      { points: 9 },
      { points: 9 },
      { points: 1 },
    ]);
    expect(board.map((e) => e.rank)).toEqual([1, 1, 1, 2]);
  });

  it('ordena por puntos aunque lleguen desordenados y conserva el resto', () => {
    const board = assignDenseRanks([
      { nickname: 'Ana', points: 2, uidHash: 'aaa' },
      { nickname: 'Beto', points: 7, uidHash: 'bbb' },
    ]);
    expect(board.map((e) => e.nickname)).toEqual(['Beto', 'Ana']);
    expect(board[0]).toMatchObject({ rank: 1, points: 7, uidHash: 'bbb' });
  });

  it('es idempotente sobre un archivo antiguo, donde el rank era la posición', () => {
    // Los archivos publicados antes del ranking denso guardaban 1, 2, 3 para un
    // empate. Se recalculan al leerlos, sin migrar nada.
    const archived = [
      { rank: 1, points: 4 },
      { rank: 2, points: 4 },
      { rank: 3, points: 0 },
    ];
    expect(assignDenseRanks(archived).map((e) => e.rank)).toEqual([1, 1, 2]);
    expect(assignDenseRanks(assignDenseRanks(archived)).map((e) => e.rank)).toEqual([1, 1, 2]);
  });

  it('aguanta una clasificación vacía o ausente', () => {
    expect(assignDenseRanks([])).toEqual([]);
    expect(assignDenseRanks(null)).toEqual([]);
  });
});
