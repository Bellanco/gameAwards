import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import AwardCard from './AwardCard';
import { CloseIcon } from './Icons';

/**
 * AwardDialog - Diálogo modal con el título premiado de un puesto.
 *
 * Es un `<dialog>` NATIVO a propósito: el navegador se encarga solo del foco
 * atrapado dentro, del cierre con Escape y de marcar como inerte lo que queda
 * detrás. Reimplementarlo a mano con un div y `role="dialog"` es justo donde se
 * pierden esas tres cosas.
 *
 * Se monta solo mientras hay un premio abierto (ver ResultsScreen), así que
 * `showModal()` en el montaje basta y no hace falta sincronizar «abierto» con
 * el DOM en cada render.
 *
 * @param {Object} props
 * @param {number} props.rank - puesto (denso) del premio
 * @param {string} props.name - nombre premiado
 * @param {string} [props.seasonName] - nombre de la edición
 * @param {Function} props.onClose
 */
export default function AwardDialog({ rank, name, seasonName = '', onClose }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const dialogRef = useRef(null);

  useEffect(() => {
    // jsdom y los navegadores muy viejos no traen showModal; sin él el diálogo
    // se muestra igual (el atributo `open`), solo que sin modalidad.
    const dialog = dialogRef.current;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute('open', '');
  }, []);

  const title = t(`awardTitle${rank}`);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="award-dialog-title"
      // `m-auto` no es decorativo: el reset de Tailwind pone `margin: 0` en todo
      // y eso le quita a <dialog> el centrado que el navegador le da gratis.
      className="m-auto w-[min(92vw,900px)] max-h-[90dvh] overflow-y-auto p-4 md:p-6 rounded-2xl theme-card theme-text-primary theme-border-primary border backdrop:bg-black/70"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2
            id="award-dialog-title"
            className="text-xl md:text-2xl font-black theme-display uppercase theme-accent"
          >
            {title}
          </h2>
          <p className="theme-text-secondary truncate">{name}</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t('close')}
          className="shrink-0 min-h-[44px] min-w-[44px] rounded-lg border theme-border-control theme-text-primary flex items-center justify-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent)"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <AwardCard rank={rank} name={name} seasonName={seasonName} />
    </dialog>
  );
}
