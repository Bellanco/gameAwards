/**
 * Guardián de la CSP.
 *
 * `public/_headers` autoriza el script anti-FOUC que va inline en `index.html`
 * mediante su hash sha256. Si alguien toca ese script —aunque sea un espacio— y
 * no recalcula el hash, el navegador lo bloquea: la app arranca sin tema y con
 * un parpadeo de colores, y en producción no hay error visible que lo delate.
 *
 * Este test convierte ese fallo silencioso en un fallo de CI.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

const inlineScripts = (html) => [...html.matchAll(INLINE_SCRIPT)].map((m) => m[1]);

const sha256 = (content) =>
  `sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}`;

describe('Content-Security-Policy', () => {
  const html = readFileSync('index.html', 'utf8');
  const headers = readFileSync('public/_headers', 'utf8');
  const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1] ?? '';

  it('autoriza todos los scripts inline de index.html por su hash', () => {
    const scripts = inlineScripts(html);
    expect(scripts.length).toBeGreaterThan(0);

    for (const script of scripts) {
      expect(
        csp,
        `El script inline de index.html no está autorizado en la CSP.\n` +
          `Añade este hash a script-src en public/_headers:\n  '${sha256(script)}'`
      ).toContain(sha256(script));
    }
  });

  it('no recurre a unsafe-inline ni unsafe-eval en script-src', () => {
    const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('mantiene las defensas que no deben perderse en un retoque', () => {
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('X-Frame-Options: DENY');
  });

  it('permite el popup de Google (login) y Firestore', () => {
    // Cross-Origin-Opener-Policy debe ser same-origin-allow-popups: con
    // same-origin a secas, signInWithPopup se queda colgado.
    expect(headers).toContain('Cross-Origin-Opener-Policy: same-origin-allow-popups');
    expect(csp).toContain('https://apis.google.com');
    expect(csp).toContain('https://firestore.googleapis.com');
    expect(csp).toContain('https://identitytoolkit.googleapis.com');
  });
});
