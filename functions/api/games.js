/**
 * Cloudflare Pages Function: Game Image Lookup
 * Endpoint: /api/games?q=game_name
 * 
 * Usa RAWG.io API para obtener metadata de juegos
 * Nota: El cache en memoria NO persiste entre requests en Cloudflare
 * Por eso dependemos de localStorage del cliente
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // ============ CORS Headers ============
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ============ Handle OPTIONS (preflight) ============
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ============ Only allow GET ============
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  // ============ Extract query parameter ============
  const gameName = url.searchParams.get('q');

  if (!gameName || gameName.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Missing or invalid query parameter: q' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  const trimmedName = gameName.trim();

  try {
    const apiKey = env.RAWG_API_KEY;

    if (!apiKey) {
      console.error('RAWG_API_KEY not configured in env');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // ============ Call RAWG.io API ============
    console.log(`🔍 Searching RAWG for: ${trimmedName}`);

    const rawgUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(trimmedName)}&page_size=1&ordering=-rating`;

    const response = await fetch(rawgUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cf: { mirage: false }, // Cloudflare specific
    });

    if (!response.ok) {
      console.error(`RAWG API error: ${response.status}`);
      return new Response(JSON.stringify({ error: `RAWG API returned ${response.status}` }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`No results for: ${trimmedName}`);
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
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

    console.log(`✅ Found game: ${trimmedName}`);

    // ============ Cache headers (1 hour) ============
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Cloudflare Function error:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
