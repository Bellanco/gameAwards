/**
 * Contraste de color (WCAG 2.1 AA) sobre los tokens reales del tema.
 *
 * Los colores viven en `src/styles/theme-tokens.css` como variables CSS, así que
 * aquí se leen de ahí: si alguien retoca un token, este test se entera. Se
 * comprueban las combinaciones que de verdad existen en la interfaz (texto sobre
 * fondo, textos de estado, botón de acento, texto sobre las tarjetas de
 * nominados), en los DOS temas.
 *
 * Umbrales AA: 4.5:1 para texto normal, 3:1 para texto grande (>= 24px, o 19px
 * en negrita) y para elementos de interfaz.
 */

import { readFileSync } from 'node:fs';

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

/** Variables de un bloque de `theme-tokens.css`. */
const readTokens = (selector) => {
  const css = readFileSync('src/styles/theme-tokens.css', 'utf8');
  const block = css.slice(css.indexOf(`${selector} {`));
  const body = block.slice(0, block.indexOf('}'));
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  );
};

const light = readTokens(':root');
const dark = readTokens('html.dark');

const toRgb = (hex) => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

/** Mezcla `color` sobre `backdrop` con la opacidad dada (0-1). */
const blend = (color, backdrop, alpha) =>
  toRgb(color).map((c, i) => Math.round(c * alpha + toRgb(backdrop)[i] * (1 - alpha)));

const relativeLuminance = (rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Ratio de contraste WCAG entre dos colores (hex o rgb ya resuelto). */
const contrast = (a, b) => {
  const la = relativeLuminance(Array.isArray(a) ? a : toRgb(a));
  const lb = relativeLuminance(Array.isArray(b) ? b : toRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/** Redondeo a dos decimales para que el mensaje de fallo sea legible. */
const ratio = (a, b) => Math.round(contrast(a, b) * 100) / 100;

describe.each([
  ['tema claro', light],
  ['tema oscuro', dark],
])('contraste AA (%s)', (themeName, t) => {
  const fondos = [
    ['bg-primary', t['--bg-primary']],
    ['bg-secondary', t['--bg-secondary']],
    ['bg-tertiary', t['--bg-tertiary']],
  ];

  it.each(fondos)('el texto principal cumple AA sobre %s', (_, fondo) => {
    expect(ratio(t['--text-primary'], fondo)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each(fondos)('el texto secundario cumple AA sobre %s', (_, fondo) => {
    expect(ratio(t['--text-secondary'], fondo)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each(fondos)('el texto terciario cumple AA sobre %s', (_, fondo) => {
    // Es el tono más flojo de los tres y se usa en textos de ayuda: si algún
    // token se aclara de más, salta aquí.
    expect(ratio(t['--text-tertiary'], fondo)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('el placeholder de los inputs cumple AA', () => {
    expect(ratio(t['--placeholder-color'], t['--bg-secondary'])).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each([
    ['success', '--color-success'],
    ['error', '--color-error'],
    ['warning', '--color-warning'],
    ['info', '--color-info'],
    ['accent', '--color-accent'],
  ])('el color de estado %s cumple AA como texto sobre el fondo de tarjeta', (_, token) => {
    expect(ratio(t[token], t['--bg-secondary'])).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('el texto inverso cumple AA sobre el botón de acento', () => {
    // Es el botón principal (theme-accent-bg + theme-text-inverse).
    expect(ratio(t['--text-inverse'], t['--color-accent'])).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('el borde de los controles cumple 3:1 (WCAG 1.4.11)', () => {
    // `--border-secondary` es el que usa `.theme-border-control` (inputs y
    // botones, donde el borde ES el control). `--border-primary` se queda en
    // 2.5 y solo vale para separar contenedores: si alguien lo mete en un
    // input, este test no lo ve, pero la clase deja clara cuál toca.
    expect(ratio(t['--border-secondary'], t['--bg-secondary'])).toBeGreaterThanOrEqual(AA_LARGE);
    expect(ratio(t['--border-secondary'], t['--bg-primary'])).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe('contraste del nombre del nominado sobre su tarjeta', () => {
  // Las tarjetas pintan un degradado oscuro (utils/gradients.js) con un velo
  // negro encima: 40% cuando no está elegida y 10% cuando sí. El nombre va en
  // blanco y en negrita, así que el umbral aplicable es el de texto grande,
  // pero se exige AA normal por seguridad: el texto se autoajusta y puede
  // quedarse pequeño en tarjetas bajas.
  //
  // Se toma el peor caso real del catálogo de degradados: el tono más claro
  // (amber-700) con su opacidad, sobre el fondo de tarjeta del tema oscuro.
  const AMBER_700 = '#b45309';
  const fondoTarjeta = dark['--bg-secondary'];

  const conVelo = (velo) => {
    const degradado = blend(AMBER_700, fondoTarjeta, 0.75);
    return blend('#000000', `#${degradado.map((c) => c.toString(16).padStart(2, '0')).join('')}`, velo);
  };

  it('cumple AA con la tarjeta sin elegir (velo del 40%)', () => {
    expect(ratio('#ffffff', conVelo(0.4))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('cumple AA con la tarjeta elegida (velo del 10%)', () => {
    // El velo baja al 10% para que la elegida destaque; hay que comprobar que
    // no se lleve por delante la legibilidad del nombre.
    expect(ratio('#ffffff', conVelo(0.1))).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
