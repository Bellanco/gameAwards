/**
 * Vercel Serverless Function: Game Image Lookup
 * Endpoint: /api/games?q=game_name
 * 
 * Usa RAWG.io API para obtener metadata de juegos
 * Cachea resultados en memoria del serverless
 */

// Cache en memoria del serverless (persiste entre requests en la misma instancia)
const gameCache = new Map();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid query parameter: q' });
  }

  const gameName = q.trim();

  // ============ 1. Verifica cache del serverless ============
  if (gameCache.has(gameName)) {
    console.log(`✅ Serverless cache hit: ${gameName}`);
    return res.status(200).json(gameCache.get(gameName));
  }

  try {
    const apiKey = process.env.RAWG_API_KEY;

    if (!apiKey) {
      console.error('RAWG_API_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // ============ 2. Llama a RAWG.io API ============
    console.log(`🔍 Buscando en RAWG: ${gameName}`);

    const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(gameName)}&page_size=1&ordering=-rating`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.error(`RAWG API error: ${response.status}`);
      return res.status(500).json({ error: `RAWG API returned ${response.status}` });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`No results for: ${gameName}`);
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = data.results[0];

    const result = {
      name: game.name,
      image_url: game.background_image || null,
      rating: game.rating || 0,
      released: game.released || null,
      platforms: game.platforms?.map(p => p.platform.name) || [],
      genres: game.genres?.map(g => g.name) || [],
      metacritic: game.metacritic || null,
      description_raw: game.description_raw?.substring(0, 200) || null
    };

    // ============ 3. Cachea resultado en memoria del serverless ============
    gameCache.set(gameName, result);
    console.log(`✅ Guardado en cache: ${gameName}`);

    // Headers para caché del navegador (1 hora)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(result);

  } catch (error) {
    console.error('Serverless error:', error);
    
    if (error.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    return res.status(500).json({ error: error.message });
  }
}
