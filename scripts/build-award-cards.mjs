/**
 * Optimiza `templates/*.jpg` a `public/awards/rank-N.jpg`.
 *
 * Ejecutar con: npm run award-cards
 *
 * POR QUÉ HACE FALTA: los originales son de 4416x2485 y pesan entre 1 y 1,4 MB
 * cada uno (5,8 MB los cinco). Son el arte de origen, no un asset web: a esa
 * resolución nadie los va a mirar y descargarlos en la pantalla de resultados
 * costaría más que toda la app. Aquí se reescalan a 2000 px de ancho —de sobra
 * para verlos a pantalla completa y para guardarlos— y se recomprimen.
 *
 * `templates/` queda como FUENTE EDITABLE (igual que `share-card.svg`); lo que
 * se publica es `public/awards/`. Si retocas un template, regenera.
 *
 * Se rasteriza con el Chromium de Playwright, que ya es dependencia del
 * proyecto para los e2e: ninguna herramienta nueva y el mismo motor que dibuja
 * el premio en el navegador del usuario (ver utils/awardCanvas.js), así que lo
 * que sale aquí es exactamente lo que se ve allí.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const TARGET_WIDTH = 2000;
const QUALITY = 0.82;
const OUT_DIR = 'public/awards';

// El orden ES el puesto: el índice 0 es el primero. Los nombres de archivo de
// salida van por número y no por ordinal en español, porque los lee código.
const TEMPLATES = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto'];

const toDataUri = (file) =>
  `data:image/jpeg;base64,${readFileSync(file).toString('base64')}`;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');

  for (const [index, name] of TEMPLATES.entries()) {
    const source = `templates/${name}.jpg`;
    const target = `${OUT_DIR}/rank-${index + 1}.jpg`;

    const { base64, width, height } = await page.evaluate(
      async ({ src, targetWidth, quality }) => {
        const image = new Image();
        image.src = src;
        await image.decode();

        // Se conserva la proporción del original: los cinco templates no miden
        // exactamente lo mismo y recortarlos movería el encuadre del arte.
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = Math.round((image.naturalHeight / image.naturalWidth) * targetWidth);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        return {
          base64: canvas.toDataURL('image/jpeg', quality).split(',')[1],
          width: canvas.width,
          height: canvas.height,
        };
      },
      { src: toDataUri(source), targetWidth: TARGET_WIDTH, quality: QUALITY }
    );

    const bytes = Buffer.from(base64, 'base64');
    writeFileSync(target, bytes);
    console.log(`✅ ${target} · ${width}x${height} · ${(bytes.length / 1024).toFixed(0)} KB`);
  }
} finally {
  await browser.close();
}
