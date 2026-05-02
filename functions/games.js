/**
 * Cloudflare Pages Function: Game Image Lookup
 * Endpoint: /api/games?q=game_name
 * 
 * Usa RAWG.io API para obtener metadata de juegos
 * Nota: El cache en memoria NO persiste entre requests en Cloudflare
 * Por eso dependemos de localStorage del cliente
 */

// ============ Rate Limiting (Simple en-memory) ============
const rateLimitStore = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 10; // 10 solicitudes por minuto

function checkRateLimit(ip) {
  const now = Date.now();
  
  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (now > rateLimitStore[ip].resetTime) {
    rateLimitStore[ip] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  rateLimitStore[ip].count++;
  
  return rateLimitStore[ip].count <= RATE_LIMIT_MAX;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // ============ Security Headers ============
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'private, no-store, must-revalidate'
  };

  // ============ CORS Headers (Restrictivos) ============
  const appUrl = env.VITE_APP_URL || 'https://tga-ballot.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': appUrl,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...securityHeaders
  };

  // ============ Handle OPTIONS (preflight) ============
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ============ Check Rate Limit ============
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        ...corsHeaders,
      },
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
      console.error('[ERROR] RAWG_API_KEY not configured in CloudFlare Environment Variables');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // ============ Call RAWG.io API ============
    // Log minimizado: solo registrar solicitud en desarrollo
    if (env.DEBUG) console.log('[INFO] Searching RAWG API');

    const rawgUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(trimmedName)}&page_size=1&ordering=-rating`;

    const response = await fetch(rawgUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cf: { mirage: false }, // Cloudflare specific
    });

    if (!response.ok) {
      console.error(`[ERROR] RAWG API returned status ${response.status}`);
      return new Response(JSON.stringify({ error: 'External API error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      // No es un error, solo que no hay resultados
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

    // Log minimizado: solo en debug
    if (env.DEBUG) console.log('[INFO] Game found successfully');

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
    console.error('[ERROR] CloudFlare Function exception:', error.message);
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
