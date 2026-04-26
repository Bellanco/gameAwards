# 🚀 Deploying to Vercel - Complete Guide

## Architecture

```
Frontend (React + Vite)
    ↓ (en dev: usa metadata)
    ↓ (en prod: intenta serverless)
    ↓
Vercel Serverless (/api/games.js)
    ↓
RAWG.io API (sin CORS)
```

## Step 1: Prepare Repository

```bash
# Asegurate que está en git
git add .
git commit -m "Add Vercel serverless for game images"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Fastest)

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: GitHub Integration (Recommended)

1. Push a GitHub: https://github.com/yourusername/tga-ballot
2. Go to https://vercel.com/new
3. Import repository
4. Vercel auto-detects Vite + /api folder
5. Click "Deploy"
6. Done! 🎉

## Step 3: Get Production URL

After deploy, Vercel will show:
```
✓ Deployment complete!
🔗 https://tga-ballot.vercel.app
```

## Step 4: Update gameImageService.js

```javascript
// CHANGE THIS:
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:3000'
  : 'https://tga-ballot.vercel.app';  // ← Put YOUR URL here

// TO THIS:
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:3000'
  : 'https://your-actual-url.vercel.app';  // ← YOUR URL
```

## Step 5: Test

### Local Dev (with metadata only)
```bash
npm run dev
# http://localhost:5173
# Should show styled metadata cards (emojis + colors)
```

### Production (with real images)
```
https://your-url.vercel.app
# Should show real game images from RAWG!
```

## How It Works

### Development Mode
```
VoteScreen requests: getGameImage('Elden Ring')
  ↓
gameImageService.js checks: import.meta.env.DEV = true
  ↓
Returns metadata directly (instant, no API call)
  ↓
Console: "📦 Usando metadata estilizada: Elden Ring"
```

### Production Mode (Vercel)
```
VoteScreen requests: getGameImage('Elden Ring')
  ↓
gameImageService.js checks: import.meta.env.DEV = false
  ↓
Calls: /api/games?q=Elden%20Ring (from vercel.app)
  ↓
Serverless function proxies to RAWG.io
  ↓
Returns real image URL
  ↓
Console: "✅ Imagen encontrada en serverless: Elden Ring"
```

## Troubleshooting

### "Cannot find module 'fetch'"
- Vercel uses Node 18+ which has fetch built-in ✓

### "RAWG API returning 401"
- Our serverless doesn't need authentication (public search endpoint)
- If it fails, falls back to metadata ✓

### "Images still not loading in production"
1. Check browser console: `Vercel Error 404`?
   - Make sure `vercel.json` and `/api/games.js` are committed

2. Check deployment logs:
   - Go to https://vercel.com/dashboard
   - Click your project → Deployments
   - Click latest → View Logs

3. Test serverless directly:
   - Visit: `https://your-url.vercel.app/api/games?q=Elden%20Ring`
   - Should return JSON with `image_url`

### "Still showing only metadata in production"
- Check `API_BASE` URL in gameImageService.js matches your Vercel URL
- Clear browser cache (Ctrl+Shift+Del)
- Hard refresh (Ctrl+F5)

## Files Created/Modified

| File | Purpose | Status |
|---|---|---|
| `/api/games.js` | ✨ NEW - Vercel serverless function | ✅ Ready |
| `vercel.json` | ✨ NEW - Vercel config | ✅ Ready |
| `src/services/gameImageService.js` | Updated to use serverless | ✅ Ready |
| `vite.config.js` | Simplified (no proxy needed) | ✅ Ready |

## Next Steps

1. ✅ Files prepared (done!)
2. ⬜ Push to GitHub
3. ⬜ Deploy to Vercel
4. ⬜ Update API_BASE URL
5. ⬜ Test in production

---

**Questions?**
- Vercel Docs: https://vercel.com/docs
- RAWG API Docs: https://api.rawg.io/docs/
- React Vite Guide: https://vitejs.dev/guide/
