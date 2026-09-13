/**
 * Guardián de la previsualización al compartir.
 *
 * Pegar el enlace en WhatsApp, Slack, X o LinkedIn debe mostrar una tarjeta con
 * título, descripción e imagen. Eso depende de cuatro cosas que se rompen con
 * facilidad y en silencio —nadie se entera hasta que alguien comparte el enlace
 * y sale pelado—:
 *
 *  1. que las etiquetas estén;
 *  2. que las URLs sean ABSOLUTAS (los scrapers no resuelven rutas relativas);
 *  3. que la imagen sea un formato que esas plataformas rastericen (JPEG/PNG,
 *     nunca SVG);
 *  4. que el archivo exista de verdad y mida lo que dicen los metadatos.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');

/** Valor de una etiqueta <meta property="..."> o <meta name="...">. */
const meta = (key) =>
  html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1] ?? null;

describe('metadatos para compartir (Open Graph / Twitter)', () => {
  it('declara las etiquetas mínimas de Open Graph', () => {
    expect(meta('og:type')).toBe('website');
    expect(meta('og:title')).toBeTruthy();
    expect(meta('og:description')).toBeTruthy();
    expect(meta('og:url')).toBeTruthy();
    expect(meta('og:image')).toBeTruthy();
  });

  it('declara la tarjeta grande de Twitter/X con su imagen', () => {
    expect(meta('twitter:card')).toBe('summary_large_image');
    expect(meta('twitter:image')).toBe(meta('og:image'));
  });

  it('usa URLs absolutas: un scraper no resuelve rutas relativas', () => {
    expect(meta('og:url')).toMatch(/^https:\/\//);
    expect(meta('og:image')).toMatch(/^https:\/\//);
    expect(meta('twitter:image')).toMatch(/^https:\/\//);
  });

  it('la imagen NO es un SVG', () => {
    // WhatsApp, X, Facebook y LinkedIn no rasterizan SVG en og:image: el enlace
    // se comparte sin imagen. Por eso `share-card.svg` es solo la fuente.
    expect(meta('og:image')).not.toMatch(/\.svg$/i);
    expect(meta('og:image:type')).toBe('image/jpeg');
  });

  it('la imagen existe en public/ y no está vacía', () => {
    const file = `public/${meta('og:image').split('/').pop()}`;
    expect(existsSync(file), `Falta ${file}. Regenérala con: npm run share-card`).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(1024);
  });

  it('declara el tamaño 1200x630 que piden las plataformas', () => {
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
  });

  it('describe la imagen para quien no puede verla', () => {
    expect(meta('og:image:alt')).toBeTruthy();
    expect(meta('twitter:image:alt')).toBeTruthy();
  });
});
