import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { drawAward, downloadCanvas } from '../utils/awardCanvas';
import { getAward } from '../utils/awards';
import logger from '../services/loggerService';
import { Button } from './ui';

/**
 * AwardCard - La lámina de un puesto del podio con el nombre de su ganador.
 *
 * Se dibuja en un `<canvas>` a resolución nativa (2000 px) y se escala por CSS:
 * lo que se ve en pantalla y lo que se descarga son el mismo píxel, así que el
 * archivo sirve para compartir o imprimir. Ver utils/awardCanvas.js.
 *
 * El canvas tiene `role="img"` y su `aria-label` describe el premio: para un
 * lector de pantalla un canvas es una caja vacía, y el nombre dibujado dentro no
 * existe en el DOM.
 *
 * @param {Object} props
 * @param {number} props.rank - puesto (denso) al que corresponde la lámina
 * @param {string} props.name - nombre que se escribe en la zona negra
 * @param {string} [props.seasonName] - nombre de la edición, para el archivo
 */
export default function AwardCard({ rank, name, seasonName = '' }) {
  const { language } = useAppContext();
  const t = useTranslation(language);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    // `cancelled` evita pintar una lámina cuyo diálogo ya se cerró (o cuyo
    // puesto cambió mientras la imagen estaba de camino).
    let cancelled = false;

    const paint = async () => {
      setStatus('loading');
      try {
        await drawAward(canvasRef.current, { rank, name });
        if (!cancelled) setStatus('ready');
      } catch (error) {
        logger.error('No se pudo dibujar el premio:', error);
        if (!cancelled) setStatus('error');
      }
    };

    paint();
    return () => {
      cancelled = true;
    };
  }, [rank, name]);

  const handleDownload = async () => {
    // El nombre del archivo se queda en ASCII: los acentos y emojis de un
    // `download` acaban destrozados según el sistema que reciba la descarga.
    const slug = (text) =>
      String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const parts = [slug(seasonName) || 'premio', rank, slug(name)].filter(Boolean);
    await downloadCanvas(canvasRef.current, `${parts.join('-')}.jpg`);
  };

  const award = getAward(rank);
  if (!award) return null;

  const title = t(`awardTitle${rank}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${title} — ${name}`}
          className="w-full h-auto rounded-lg theme-border-primary border bg-black"
        />
        {status !== 'ready' && (
          <p
            className="absolute inset-0 flex items-center justify-center text-center p-4 theme-text-secondary"
            role="status"
          >
            {status === 'error' ? t('awardError') : t('awardLoading')}
          </p>
        )}
      </div>

      <Button
        variant="primary"
        onClick={handleDownload}
        disabled={status !== 'ready'}
        className="min-h-[44px] self-center"
      >
        {t('awardDownload')}
      </Button>
    </div>
  );
}
