import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Trust App Engine's load balancer so req.ip reflects the real client IP
app.set('trust proxy', 1);
app.use(express.json());

// ── Hardcoded system prompt — not configurable by client ─────────────────────
const EXPLANATION_SYSTEM_PROMPT =
  'You are a knowledgeable musician talking to a friend — not a professor writing a textbook. ' +
  'When someone shows you a chord progression, explain in 2–4 warm, conversational sentences ' +
  'why it sounds the way it does: the emotional feel, the tension and resolution, or why it\'s ' +
  'satisfying. Mention the key. Drop theory terms only if you immediately explain them in plain words.';

const VALID_NOTES = new Set(['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']);
const VALID_CHORD_RE = /^[A-G][#b]?(m|maj|dim|aug|sus[24]?|add\d{1,2})?$/;

// ── Named-bucket rate limiter ─────────────────────────────────────────────────
// bucket='explain' → 10/hr, bucket='spotify_search' → 30/hr, etc.
const _rateLimitMap = new Map();
function checkRateLimit(ip, bucket = 'default', max = 10) {
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const record = _rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count++;
  _rateLimitMap.set(key, record);
  return record.count <= max;
}

// ── Spotify token cache ───────────────────────────────────────────────────────
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyToken && now < spotifyTokenExpiry - 60000) {
    return spotifyToken;
  }

  const clientId = process.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = now + (data.expires_in * 1000);
  return spotifyToken;
}

// ── Spotify pitch class → note name ──────────────────────────────────────────
const PITCH_CLASS_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function spotifyKeyToNote(key, mode) {
  if (key === -1) return null;
  const note = PITCH_CLASS_TO_NOTE[key];
  return mode === 0 ? `${note}m` : note;
}

// ── /api/explain ─────────────────────────────────────────────────────────────
app.post('/api/explain', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(ip, 'explain', 10)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { chords, key, userMessage } = req.body;
  const allowedKeys = new Set(['chords', 'key', 'userMessage']);
  if (Object.keys(req.body).some(k => !allowedKeys.has(k))) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!Array.isArray(chords) || chords.length === 0 || chords.length > 16) {
    return res.status(400).json({ error: 'Invalid chords' });
  }
  if (chords.some(c => typeof c !== 'string' || !VALID_CHORD_RE.test(c.trim()))) {
    return res.status(400).json({ error: 'Invalid chord value' });
  }

  if (key !== null && key !== undefined && !VALID_NOTES.has(String(key))) {
    return res.status(400).json({ error: 'Invalid key' });
  }

  const chordList = chords.join(' → ');
  const keyLabel  = key ? ` | Key: ${key}` : '';
  const extra     = userMessage && typeof userMessage === 'string' && userMessage.length < 400
    ? `\n\n${userMessage.slice(0, 400)}`
    : '';
  const userContent = `Chord progression: ${chordList}${keyLabel}${extra}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        system: EXPLANATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── /api/spotify/search ───────────────────────────────────────────────────────
app.get('/api/spotify/search', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip, 'spotify_search', 30)) {
      return res.status(429).json({ error: 'Too many searches. Try again later.' });
    }

    const q = req.query.q?.trim();
    if (!q || q.length < 1 || q.length > 100) {
      return res.status(400).json({ error: 'Search query required (max 100 chars)' });
    }

    const safeQuery = q.replace(/[^a-zA-Z0-9\s\-']/g, '');

    const token = await getSpotifyToken();

    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', safeQuery);
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('limit', '5');
    searchUrl.searchParams.set('market', 'US');

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!searchRes.ok) {
      throw new Error(`Spotify search failed: ${searchRes.status}`);
    }

    const data = await searchRes.json();

    const tracks = data.tracks?.items?.map(track => ({
      spotifyId:  track.id,
      title:      track.name,
      artist:     track.artists?.[0]?.name || 'Unknown',
      album:      track.album?.name || '',
      albumArt:   track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || null,
      previewUrl: track.preview_url || null,
      popularity: track.popularity || 0,
    })) || [];

    res.json({ tracks });
  } catch (err) {
    console.error('Spotify search error:', err.message);
    res.status(500).json({ error: 'Search unavailable. Try again.' });
  }
});

// ── /api/spotify/features/:trackId ───────────────────────────────────────────
app.get('/api/spotify/features/:trackId', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRateLimit(ip, 'spotify_features', 30)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const { trackId } = req.params;
    if (!/^[a-zA-Z0-9]{22}$/.test(trackId)) {
      return res.status(400).json({ error: 'Invalid track ID' });
    }

    const token = await getSpotifyToken();

    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      { headers: { 'Authorization': `Bearer ${token}` } },
    );

    if (!featuresRes.ok) {
      // Features aren't available for all tracks — return null gracefully
      return res.json({ features: null });
    }

    const f = await featuresRes.json();

    res.json({
      features: {
        key:           spotifyKeyToNote(f.key, f.mode),
        bpm:           Math.round(f.tempo),
        timeSignature: f.time_signature,
        durationMs:    f.duration_ms,
        energy:        Math.round(f.energy * 100),
        valence:       Math.round(f.valence * 100),
      },
    });
  } catch (err) {
    console.error('Spotify features error:', err.message);
    res.status(500).json({ error: 'Could not fetch song details.' });
  }
});

// ── Static files & SPA catch-all ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
