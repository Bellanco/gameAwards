/**
 * ============================================
 * Vercel Serverless Function - RAWG Proxy
 * ============================================
 * 
 * Obtiene datos de juegos de RAWG.io sin CORS
 * 
 * Deploy:
 * - git push a repo con vercel.json
 * - Vercel detecta /api/games.js automáticamente
 * - URL: https://[proyecto].vercel.app/api/games?q=Elden%20Ring
 * 
 * Uso en frontend:
 * fetch('/api/games?q=' + encodeURIComponent(gameName))
 *   .then(r => r.json())
 *   .then(data => data.image_url)
 */

export default async function handler(req, res) {
  // ============ Validación ============
  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }

  // ============ CORS Headers ============
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ============ OPTIONS request (preflight) ============
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`🔍 Buscando en RAWG: ${q}`);

    // ============ Proxea a RAWG.io ============
    const rawgUrl = `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&page_size=1`;
    const rawgResponse = await fetch(rawgUrl);

    if (!rawgResponse.ok) {
      console.warn(`RAWG returned ${rawgResponse.status}`);
      return res.json({ image_url: null, error: `RAWG HTTP ${rawgResponse.status}` });
    }

    const rawgData = await rawgResponse.json();
    const game = rawgData.results?.[0];

    if (game && game.background_image) {
      console.log(`✅ Imagen encontrada: ${game.name}`);
      return res.json({
        name: game.name,
        image_url: game.background_image,
        platforms: game.platforms?.map(p => p.platform?.name) || [],
        rating: game.rating,
        genres: game.genres?.map(g => g.name) || [],
      });
    }

    console.warn(`No image found for: ${q}`);
    return res.json({ image_url: null });

  } catch (error) {
    console.error(`Serverless Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}
