import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoryTab from './HistoryTab';

// El detalle escribe en Firestore al renombrar: se mockea el servicio para
// probar la pantalla sin tocar la red.
const renameSeasonResult = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/seasonService', () => ({
  renameSeasonResult: (...args) => renameSeasonResult(...args),
}));

const EDICIONES = [
  {
    id: '2026-verano',
    season: 2026,
    name: 'Porra de verano',
    totalBallots: 4,
    closedAt: { seconds: 1 },
    categoriesSnapshot: [
      {
        id: 'goty',
        title: { es: 'Juego del año', en: 'Game of the year' },
        winner: 'goty_option_1',
        options: [
          { id: 'goty_option_0', name: 'Juego A' },
          { id: 'goty_option_1', name: 'Juego B' },
        ],
      },
    ],
    leaderboard: [
      { rank: 1, userId: 'u1', nickname: 'Ana', points: 5 },
      { rank: 2, userId: 'u2', nickname: 'Bruno', points: 2 },
    ],
  },
  {
    id: '2025',
    season: 2025,
    totalBallots: 9,
    categoriesSnapshot: [],
    leaderboard: [],
  },
];

describe('HistoryTab', () => {
  it('lista las ediciones por su nombre, y por su año si no tienen', () => {
    // Las ediciones archivadas antes de que existieran los nombres solo tienen
    // el año: deben seguir viéndose.
    render(<HistoryTab seasonResults={EDICIONES} resultsLoading={false} />);

    expect(screen.getByText('Porra de verano')).toBeInTheDocument();
    // La de 2025 se lista por su año, que aparece como nombre y como subtítulo.
    expect(screen.getAllByText('2025').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /2025/ })).toBeInTheDocument();
  });

  it('no distingue ediciones «en curso»: el histórico solo lleva publicadas', () => {
    // Antes el archivo de la edición viva existía desde que el admin guardaba el
    // calendario, y había que marcarlo. Desde que publicar es cerrar la edición,
    // `results` solo contiene ediciones publicadas —por eso el público puede
    // leerlo— y no hay nada que marcar.
    render(<HistoryTab seasonResults={EDICIONES} resultsLoading={false} />);

    expect(screen.queryByText(/en curso/i)).not.toBeInTheDocument();
  });

  it('al entrar en una edición muestra sus resultados completos', () => {
    render(<HistoryTab seasonResults={EDICIONES} resultsLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /porra de verano/i }));

    expect(screen.getByText(/resultados de la edición: porra de verano/i)).toBeInTheDocument();
    expect(screen.getByText('Juego B')).toBeInTheDocument(); // ganador por optionId
    // El nombre va junto a la medalla en el mismo span, de ahí el matcher laxo.
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText('5 pts')).toBeInTheDocument();
  });

  it('permite renombrar una edición y refresca el histórico', async () => {
    const onRefresh = vi.fn();
    render(<HistoryTab seasonResults={EDICIONES} resultsLoading={false} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button', { name: /porra de verano/i }));
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Porra estival' } });
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      expect(renameSeasonResult).toHaveBeenCalledWith('2026-verano', 'Porra estival');
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('una recarga en segundo plano no cierra el detalle abierto', () => {
    // `onRefresh` vuelve a poner `resultsLoading` en true un instante: si eso
    // pintara el spinner, el detalle se desmontaría y el usuario perdería lo que
    // estaba viendo (y el mensaje de "renombrada").
    const { rerender } = render(
      <HistoryTab seasonResults={EDICIONES} resultsLoading={false} />
    );
    fireEvent.click(screen.getByRole('button', { name: /porra de verano/i }));

    rerender(<HistoryTab seasonResults={EDICIONES} resultsLoading />);

    expect(screen.getByText(/resultados de la edición: porra de verano/i)).toBeInTheDocument();
  });

  it('se puede volver a la lista desde el detalle', () => {
    render(<HistoryTab seasonResults={EDICIONES} resultsLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /porra de verano/i }));
    fireEvent.click(screen.getByRole('button', { name: /volver al histórico/i }));

    expect(screen.getByRole('heading', { name: /^histórico$/i })).toBeInTheDocument();
  });
});
