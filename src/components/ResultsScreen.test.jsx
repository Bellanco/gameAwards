import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';

/** Snapshot público tal y como lo escribe seasonService.publishSeasonResults. */
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
