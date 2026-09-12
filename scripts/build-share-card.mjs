/**
 * Rasteriza `public/share-card.svg` a `public/share-card.jpg` (1200x630).
 *
 * Ejecutar con: npm run share-card
 *
 * POR QUÉ HACE FALTA: las plataformas que muestran la previsualización de un
 * enlace (WhatsApp, X, Facebook, LinkedIn, Slack, Telegram) NO renderizan SVG en
 * `og:image`. Apuntar los metadatos al SVG equivale a no tener imagen. El SVG se
 * conserva como fuente editable; el JPEG es lo que se publica.
 *
 * Se rasteriza con el Chromium de Playwright, que ya es dependencia del proyecto
 * para los e2e: así no entra ninguna herramienta nueva y el resultado es el
 * mismo motor que verá cualquier navegador.
 *
 * Las fuentes (Cinzel y Source Sans 3) se cargan de Google Fonts si hay red; sin
 * ella, el SVG cae a sus alternativas del sistema y la tarjeta sigue saliendo
 * bien, solo con otra tipografía.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WIDTH = 1200;
const HEIGHT = 630;
const SOURCE = 'public/share-card.svg';
const TARGET = 'public/share-card.jpg';

const svg = readFileSync(SOURCE, 'utf8');

const page = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Source+Sans+3:wght@400;600&display=block" rel="stylesheet">
    <style>
      html, body { margin: 0; padding: 0; background: #0d121a; }
      svg { display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const tab = await context.newPage();
  await tab.setContent(page, { waitUntil: 'load' });

  // Sin esto, la captura puede salir con la tipografía de respaldo aunque la
  // web tipográfica haya llegado: `document.fonts.ready` espera al reflow.
  await tab.evaluate(() => document.fonts.ready);

  const jpeg = await tab.screenshot({ type: 'jpeg', quality: 90 });
  writeFileSync(TARGET, jpeg);
  console.log(`✅ ${TARGET} · ${WIDTH}x${HEIGHT} · ${(jpeg.length / 1024).toFixed(0)} KB`);
} finally {
  await browser.close();
}
