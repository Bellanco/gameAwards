/**
 * Dibujo del título premiado: la lámina del puesto con el nombre encima.
 *
 * TODO OCURRE EN EL NAVEGADOR, sobre un `<canvas>`. No hay servicio que
 * componga la imagen ni nada que guardar en Firestore: el premio se deriva
 * entero del archivo publicado (puesto + nombre), así que generarlo al vuelo es
 * más barato que almacenar cinco imágenes por edición.
 *
 * El canvas se dibuja a la RESOLUCIÓN NATIVA de la lámina (2000 px de ancho) y
 * se muestra escalado por CSS: así lo que el usuario descarga sirve para
 * imprimir o compartir, aunque en pantalla lo esté viendo a 600 px.
 *
 * Ojo con la CSP: la lámina se sirve desde el propio origen (`img-src 'self'`),
 * de modo que el canvas NO queda contaminado y `toBlob` funciona. Una imagen de
 * otro dominio dejaría la descarga muerta sin decir por qué.
 */

import { getAward } from './awards';

/** Tipografía display del tema (ver styles/theme-tokens.css). */
const FONT_STACK = "'Cinzel', 'Times New Roman', serif";
/** Interlineado relativo al cuerpo, cuando el nombre no cabe en una línea. */
const LINE_HEIGHT = 1.18;
/** Más de dos líneas deja de leerse como un título y pasa a ser un párrafo. */
const MAX_LINES = 2;

/**
 * Parte un texto en líneas que quepan en `maxWidth`.
 *
 * Corta por palabras y, solo si una palabra suelta no cabe entera, por
 * caracteres: un nombre de 50 caracteres sin espacios es legítimo y sin este
 * respaldo se saldría de la lámina.
 *
 * @param {(text:string)=>number} measure - ancho en px del texto con la fuente actual
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
export const wrapText = (measure, text, maxWidth) => {
  const lines = [];
  let current = '';

  const flush = () => {
    if (current) lines.push(current);
    current = '';
  };

  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    flush();
    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }

    // La palabra no cabe ni sola en una línea: se trocea por caracteres.
    let chunk = '';
    for (const char of word) {
      if (chunk && measure(chunk + char) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  }

  flush();
  return lines;
};

/**
 * Mayor cuerpo de letra con el que el nombre cabe dentro de la caja.
 *
 * Se prueba de grande a pequeño porque lo que manda es llenar el hueco: la
 * lámina tiene una zona negra concreta y un nombre corto debe verse GRANDE, no
 * al mismo tamaño que uno largo.
 *
 * La medición se inyecta (`measureAt`) para poder probar esto sin un canvas
 * real: en jsdom `measureText` devuelve siempre 0 y cualquier cálculo daría
 * falsos verdes.
 *
 * @param {(text:string, fontSize:number)=>number} measureAt
 * @param {string} name
 * @param {{width:number, height:number}} box - caja en píxeles
 * @returns {{fontSize:number, lines:string[]}}
 */
export const layoutAwardName = (measureAt, name, box) => {
  const text = String(name || '').trim();
  // El techo es el alto de la caja; el suelo, el cuerpo por debajo del cual el
  // nombre ya no se lee en la lámina impresa.
  const maxFontSize = Math.floor(box.height);
  const minFontSize = Math.max(12, Math.floor(box.height * 0.18));

  for (let fontSize = maxFontSize; fontSize > minFontSize; fontSize -= 1) {
    const lines = wrapText((chunk) => measureAt(chunk, fontSize), text, box.width);
    if (lines.length <= MAX_LINES && lines.length * fontSize * LINE_HEIGHT <= box.height) {
      return { fontSize, lines };
    }
  }

  // Suelo: mejor un nombre pequeño y recortado a dos líneas que ninguno.
  const lines = wrapText((chunk) => measureAt(chunk, minFontSize), text, box.width).slice(0, MAX_LINES);
  return { fontSize: minFontSize, lines };
};

/** Caché de láminas ya descargadas: la pantalla de resultados abre varias. */
const imageCache = new Map();

/**
 * Carga (y memoiza) la lámina de un puesto.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (src) => {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`No se pudo cargar la lámina ${src}`));
        image.src = src;
      }).catch((error) => {
        // Un fallo no puede quedar cacheado: el siguiente intento debe reintentar.
        imageCache.delete(src);
        throw error;
      })
    );
  }
  return imageCache.get(src);
};

/**
 * Espera a que la tipografía display esté disponible.
 *
 * Sin esto el primer premio se dibuja con la fuente de respaldo: el canvas no
 * se repinta solo cuando la web font termina de llegar, así que el nombre se
 * queda en Times para siempre. Si el navegador no expone `document.fonts`, se
 * sigue adelante con el respaldo.
 */
const waitForFont = async () => {
  if (!document.fonts?.load) return;
  try {
    await document.fonts.load(`bold 100px ${FONT_STACK}`);
    await document.fonts.ready;
  } catch {
    // Sin la web font la lámina sale igual, solo con otra tipografía.
  }
};

/**
 * Pinta la lámina del puesto con el nombre encima.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{rank:number, name:string}} params
 * @returns {Promise<void>}
 */
export const drawAward = async (canvas, { rank, name }) => {
  const award = getAward(rank);
  if (!canvas || !award) return;

  const [image] = await Promise.all([loadImage(award.image), waitForFont()]);

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const box = {
    x: award.box.x * canvas.width,
    y: award.box.y * canvas.height,
    width: award.box.w * canvas.width,
    height: award.box.h * canvas.height,
  };

  const measureAt = (text, fontSize) => {
    ctx.font = `bold ${fontSize}px ${FONT_STACK}`;
    return ctx.measureText(text).width;
  };
  const { fontSize, lines } = layoutAwardName(measureAt, name, box);

  ctx.font = `bold ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = award.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Un halo del propio color: sobre negro puro el texto queda plano y este
  // resplandor lo asienta como si estuviera grabado en la lámina.
  ctx.shadowColor = award.color;
  ctx.shadowBlur = fontSize * 0.22;

  const lineHeight = fontSize * LINE_HEIGHT;
  const blockHeight = lines.length * lineHeight;
  const centerX = box.x + box.width / 2;
  const firstBaseline = box.y + (box.height - blockHeight) / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, firstBaseline + index * lineHeight);
  });

  ctx.shadowBlur = 0;
};

/**
 * Descarga el contenido del canvas como JPEG.
 *
 * Se usa un blob y no un `data:` URI: el data URI de una lámina de 2000 px son
 * cientos de miles de caracteres en el atributo `href` y Safari se atraganta.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const downloadCanvas = (canvas, filename) =>
  new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Liberar de inmediato cancelaría la descarga en Firefox.
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        resolve();
      },
      'image/jpeg',
      0.92
    );
  });
