import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AlreadyVotedScreen from './AlreadyVotedScreen';

describe('AlreadyVotedScreen', () => {
  it('ofrece modificar el voto cuando quedan cambios y la votación sigue abierta', () => {
    const onEdit = vi.fn();
    render(
      <AlreadyVotedScreen userNickname="Ana" canEdit remainingEdits={3} onEdit={onEdit} />
    );

    fireEvent.click(screen.getByRole('button', { name: /modificar mi voto/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/quedan 3 de 5 modificaciones/i)).toBeInTheDocument();
  });

  it('avisa en la última modificación disponible', () => {
    render(<AlreadyVotedScreen userNickname="Ana" canEdit remainingEdits={1} onEdit={vi.fn()} />);

    expect(screen.getByText(/última modificación/i)).toBeInTheDocument();
  });

  it('no ofrece modificar cuando no se puede (cupo agotado o votación cerrada)', () => {
    // `canEdit` ya viene resuelto desde App con las dos condiciones; la pantalla
    // no debe enseñar un botón que las reglas van a rechazar.
    render(<AlreadyVotedScreen userNickname="Ana" canEdit={false} remainingEdits={0} onEdit={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /modificar mi voto/i })).not.toBeInTheDocument();
  });
});
