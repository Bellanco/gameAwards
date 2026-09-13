import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import { hashUid } from '../utils/pseudonym';

/** Snapshot tal y como lo escribe seasonService.publishAndArchiveSeason. */
const result = {
  season: 2026,
  categoriesSnapshot: [
    {
      id: 'goty',
      title: { es: 'Juego del año', en: 'Game of the year' },
      winner: 'goty_option_1',
      weight: 3,
      options: [
        { id: 'goty_option_0', name: 'Juego A' },
        { id: 'goty_option_1', name: 'Juego B' },
      ],
    },
    {
      id: 'art',
      title: { es: 'Dirección artística', en: 'Art direction' },
      winner: null,
      weight: 1,
      options: [{ id: 'art_option_0', name: 'Juego C' }],
    },
  ],
  leaderboard: [
    { rank: 1, userId: 'u1', nickname: 'Ana', points: 5 },
    { rank: 2, userId: 'u2', nickname: 'Bruno', points: 2 },
  ],
  totalBallots: 2,
};

describe('ResultsScreen', () => {
  it('muestra el ganador por su nombre, no por su optionId', () => {
    // Los votos y ganadores se guardan por optionId; el nombre se resuelve al
    // mostrar con el snapshot de la categoría.
    render(<ResultsScreen result={result} />);
    expect(screen.getByText('Juego B')).toBeInTheDocument();
    expect(screen.queryByText('goty_option_1')).not.toBeInTheDocument();
  });

  it('omite las categorías sin ganador publicado', () => {
    render(<ResultsScreen result={result} />);
    expect(screen.queryByText('Dirección artística')).not.toBeInTheDocument();
  });

  it('lista la clasificación con sus puntos', () => {
    render(<ResultsScreen result={result} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('5 pts')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
  });

  it('aguanta un snapshot todavía sin ganadores ni participantes', () => {
    // Es el estado normal entre "guardar calendario" y "marcar ganadores".
    render(<ResultsScreen result={{ season: 2026, categoriesSnapshot: [], leaderboard: [] }} />);
    expect(screen.getByText(/no hay ganadores publicados/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay participantes/i)).toBeInTheDocument();
  });
});

describe('ResultsScreen · premios del podio', () => {
  /**
   * Clasificación con empate al primer puesto: Ana y Beto comparten el 1.
   * Los `rank` guardados son los del modelo ANTIGUO (1, 2, 3 para un empate),
   * justo lo que trae un archivo publicado antes de esta feature.
   */
  const conEmpate = {
    ...result,
    name: 'Porra TGA 2026',
    leaderboard: [
      { rank: 1, uidHash: hashUid('u-ana'), nickname: 'Ana', points: 9 },
      { rank: 2, uidHash: hashUid('u-beto'), nickname: 'Beto', points: 9 },
      { rank: 3, uidHash: hashUid('u-carla'), nickname: 'Carla', points: 4 },
    ],
  };

  it('ofrece el premio a los cinco primeros puestos, no a los cinco primeros de la lista', () => {
    // Seis participantes, pero solo cinco PUESTOS distintos por el empate: los
    // seis tienen premio.
    render(
      <ResultsScreen
        result={{
          ...result,
          leaderboard: [9, 9, 7, 5, 3, 1, 0].map((points, i) => ({
            uidHash: `u${i}`,
            nickname: `P${i}`,
            points,
          })),
        }}
      />
    );
    // 7 participantes, 6 puestos: el último (0 puntos) es el sexto y se queda fuera.
    expect(screen.getAllByRole('button', { name: /ver el premio de/i })).toHaveLength(6);
  });

  it('reparte el puesto empatado a todos los empatados y no salta el siguiente', () => {
    render(<ResultsScreen result={conEmpate} />);
    // Ana y Beto son los dos primeros; Carla es SEGUNDA, no tercera.
    // El puesto se lee del texto accesible, no de la medalla (que es un SVG
    // decorativo).
    expect(screen.getAllByText(/posición 1/i)).toHaveLength(2);
    expect(screen.getByText(/posición 2/i)).toBeInTheDocument();
    expect(screen.queryByText(/posición 3/i)).not.toBeInTheDocument();
  });

  it('recalcula el puesto de un archivo antiguo en vez de fiarse del guardado', () => {
    // Los archivos publicados antes de esta feature guardaban el rank como
    // posición en la lista (1, 2, 3 para un empate). No se migran: se recalcula.
    render(<ResultsScreen result={conEmpate} />);
    expect(screen.getByRole('button', { name: /ver el premio de beto/i })).toBeInTheDocument();
    expect(screen.getAllByText(/posición 1/i)).toHaveLength(2);
  });

  it('despliega el premio propio, sin tener que pulsar nada', () => {
    // Si te ha tocado, es lo primero que has venido a ver.
    render(<ResultsScreen result={conEmpate} currentUserId="u-ana" />);
    expect(screen.getByRole('heading', { name: /tu premio/i })).toBeInTheDocument();
    expect(screen.getByText(/primer puesto/i)).toBeInTheDocument();
  });

  it('no anuncia premio propio a quien no está en el podio', () => {
    render(<ResultsScreen result={conEmpate} currentUserId="u-de-nadie" />);
    expect(screen.queryByRole('heading', { name: /tu premio/i })).not.toBeInTheDocument();
  });

  it('abre el premio de otro participante en un diálogo', () => {
    render(<ResultsScreen result={conEmpate} />);
    fireEvent.click(screen.getByRole('button', { name: /ver el premio de carla/i }));
    // El diálogo titula el PUESTO, que con el empate de arriba es el segundo.
    expect(screen.getByRole('heading', { name: /segundo puesto/i })).toBeInTheDocument();
  });

  it('no ofrece premio a quien queda fuera del podio', () => {
    render(
      <ResultsScreen
        result={{
          ...result,
          leaderboard: [10, 8, 6, 4, 2, 1].map((points, i) => ({
            uidHash: `u${i}`,
            nickname: `P${i}`,
            points,
          })),
        }}
      />
    );
    expect(screen.queryByRole('button', { name: /ver el premio de p5/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver el premio de p4/i })).toBeInTheDocument();
  });
});
