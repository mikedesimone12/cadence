import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

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
  if (key === null || key === undefined || key === -1) return null;
  const note = PITCH_CLASS_TO_NOTE[key];
  if (!note) return null;
  return mode === 0 ? `${note}m` : note;
}

function extractFeatures(f) {
  if (!f) return null;
  const key = spotifyKeyToNote(f.key, f.mode);
  const bpm = f.tempo > 0 ? Math.round(f.tempo) : null;
  if (!key && !bpm) return null;
  return {
    key,
    bpm,
    timeSignature: f.time_signature || null,
    durationMs:    f.duration_ms    || null,
    energy:        f.energy   != null ? Math.round(f.energy   * 100) : null,
    valence:       f.valence  != null ? Math.round(f.valence  * 100) : null,
  };
}

// ── /api/explain ─────────────────────────────────────────────────────────────
app.post('/api/explain', async (req, res) => {
  const ip = req.ip;
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
        model: 'claude-sonnet-4-6',
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
    const ip = req.ip;
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
// Tries audio-features first; falls back to audio-analysis if features are
// unavailable (deprecated for newer apps) or return no key/BPM.
app.get('/api/spotify/features/:trackId', async (req, res) => {
  try {
    const ip = req.ip;
    if (!checkRateLimit(ip, 'spotify_features', 30)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const { trackId } = req.params;
    if (!/^[a-zA-Z0-9]{22}$/.test(trackId)) {
      return res.status(400).json({ error: 'Invalid track ID' });
    }

    const token = await getSpotifyToken();
    const authHeader = { 'Authorization': `Bearer ${token}` };

    // ── 1. Try audio-features ────────────────────────────────────────────────
    // Note: deprecated by Spotify for apps registered after Nov 2023 (returns 403).
    let features = null;
    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      { headers: authHeader },
    );
    if (featuresRes.ok) {
      features = extractFeatures(await featuresRes.json());
    }

    // ── 2. Fallback: audio-analysis ──────────────────────────────────────────
    // Same deprecation as audio-features — kept for legacy app compatibility.
    if (!features) {
      const analysisRes = await fetch(
        `https://api.spotify.com/v1/audio-analysis/${trackId}`,
        { headers: authHeader },
      );
      if (analysisRes.ok) {
        const a = await analysisRes.json();
        features = extractFeatures(a?.track);
      }
    }

    res.json({ features });
  } catch (err) {
    console.error('Spotify features error:', err.message);
    res.status(500).json({ error: 'Could not fetch song details.' });
  }
});

// ── /api/getsongbpm ──────────────────────────────────────────────────────────
// Requires GETSONGBPM_API_KEY in env (free at getsongbpm.com/api, 100 req/day).
// Returns { bpm, key, keyType } — silently returns nulls if key not configured.
app.get('/api/getsongbpm', async (req, res) => {
  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) return res.json({ bpm: null, key: null, keyType: null });

  try {
    const ip = req.ip;
    if (!checkRateLimit(ip, 'getsongbpm', 30)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const title  = req.query.title?.trim().replace(/[^a-zA-Z0-9\s\-'.,&]/g, '').slice(0, 200);
    const artist = req.query.artist?.trim().replace(/[^a-zA-Z0-9\s\-'.,&]/g, '').slice(0, 200);
    if (!title) return res.status(400).json({ error: 'title required' });

    const lookup = [artist, title].filter(Boolean).join(' ');
    const url = `https://api.getsongbpm.com/search/?api_key=${apiKey}&type=both&lookup=${encodeURIComponent(lookup)}`;

    const r = await fetch(url);
    if (!r.ok) return res.json({ bpm: null, key: null, keyType: null });

    const data = await r.json();
    const result = data.search?.[0];
    if (!result) return res.json({ bpm: null, key: null, keyType: null });

    res.json({
      bpm:     result.tempo ? parseInt(result.tempo, 10) : null,
      key:     result.key   || null,
      keyType: result.mode  || 'major',
    });
  } catch (err) {
    console.error('GetSongBPM error:', err.message);
    res.json({ bpm: null, key: null, keyType: null });
  }
});

// ── /api/musicbrainz ─────────────────────────────────────────────────────────
// Proxy for MusicBrainz → AcousticBrainz key/BPM lookup.
// Runs server-side to set a valid User-Agent (MB requires it) and avoid CORS.
app.get('/api/musicbrainz', async (req, res) => {
  try {
    const ip = req.ip;
    if (!checkRateLimit(ip, 'musicbrainz', 20)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const title  = req.query.title?.trim().replace(/[^a-zA-Z0-9\s\-'.,&]/g, '').slice(0, 200);
    const artist = req.query.artist?.trim().replace(/[^a-zA-Z0-9\s\-'.,&]/g, '').slice(0, 200);
    if (!title) return res.status(400).json({ error: 'title required' });

    const UA = 'Cadence/1.0 (music practice app; cadence-491202.uc.r.appspot.com)';

    // 1. Search MusicBrainz for the recording
    const mbQuery = encodeURIComponent(
      artist ? `recording:"${title}" AND artist:"${artist}"` : `recording:"${title}"`
    );
    const mbRes = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${mbQuery}&limit=1&fmt=json`,
      { headers: { 'User-Agent': UA } }
    );
    if (!mbRes.ok) return res.json({ key: null, keyType: null, bpm: null });

    const mbData = await mbRes.json();
    const mbid   = mbData.recordings?.[0]?.id;
    if (!mbid)   return res.json({ key: null, keyType: null, bpm: null });

    // 2. AcousticBrainz low-level data (archived; returns null gracefully if unavailable)
    const abRes = await fetch(
      `https://acousticbrainz.org/${mbid}/low-level`,
      { headers: { 'User-Agent': UA } }
    );
    if (!abRes.ok) return res.json({ key: null, keyType: null, bpm: null });

    const abData = await abRes.json();
    const bpm     = abData?.rhythm?.bpm     ? Math.round(abData.rhythm.bpm) : null;
    const key     = abData?.tonal?.key_key  || null;
    const keyType = abData?.tonal?.key_scale || 'major';

    res.json({ key, keyType, bpm });
  } catch (err) {
    console.error('MusicBrainz error:', err.message);
    res.json({ key: null, keyType: null, bpm: null });
  }
});

// ── /api/suggest-songs ───────────────────────────────────────────────────────
const SUGGEST_SONGS_SYSTEM =
  'You are an experienced gigging musician and setlist curator with deep knowledge of cover songs ' +
  'across all genres. You understand how songs flow together in a live set — key relationships, ' +
  'tempo pacing, crowd energy arcs, and what works for different venue types. ' +
  'Always respond with valid JSON only. No markdown, no explanation outside the JSON.';

app.post('/api/suggest-songs', async (req, res) => {
  const ip = req.ip;
  if (!checkRateLimit(ip, 'suggest-songs', 5)) {
    return res.status(429).json({ error: "You've made a lot of requests. Try again in an hour." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server' });

  const { existingSongs, venueType, crowdVibe, genres, setLength, additionalContext } = req.body;

  if (!venueType || typeof venueType !== 'string' || venueType.length > 100)
    return res.status(400).json({ error: 'Invalid venueType' });
  if (!crowdVibe || typeof crowdVibe !== 'string' || crowdVibe.length > 100)
    return res.status(400).json({ error: 'Invalid crowdVibe' });
  if (!Array.isArray(genres) || genres.length === 0 || genres.length > 10)
    return res.status(400).json({ error: 'Invalid genres' });
  if (!Number.isInteger(setLength) || setLength < 15 || setLength > 120)
    return res.status(400).json({ error: 'Invalid setLength' });

  const safeVenue   = String(venueType).replace(/[<>]/g, '').slice(0, 60);
  const safeVibe    = String(crowdVibe).replace(/[<>]/g, '').slice(0, 60);
  const safeGenres  = genres.map(g => String(g).replace(/[<>]/g, '').slice(0, 30)).join(', ');
  const safeContext = additionalContext ? String(additionalContext).replace(/[<>]/g, '').slice(0, 300) : '';
  const existingList = Array.isArray(existingSongs)
    ? existingSongs.slice(0, 50).map(s => {
        const t = String(s.title  || '').slice(0, 100);
        const a = String(s.artist || 'Unknown').slice(0, 100);
        const k = s.key  ? ` (${String(s.key).slice(0, 10)}` : '';
        const b = s.bpm  ? `, ${parseInt(s.bpm)}bpm)` : (k ? ')' : '');
        return `- ${t} by ${a}${k}${b}`;
      }).join('\n')
    : '(none yet)';

  const userContent =
    `I'm building a setlist for a ${safeVenue} with a ${safeVibe} crowd vibe.\n` +
    `Genre focus: ${safeGenres}.\n` +
    `Set length: approximately ${setLength} minutes.\n` +
    (safeContext ? `Additional context: ${safeContext}\n` : '') +
    `\nSongs already in my setlist:\n${existingList}\n\n` +
    `Suggest 8-10 cover songs that would work well for this context. ` +
    `Consider key relationships, tempo pacing, and crowd energy arc. ` +
    `Avoid songs already in the setlist.\n\n` +
    `Return this exact JSON:\n` +
    `{"suggestions":[{"title":"string","artist":"string","key":"string","bpm":0,"genre":"string","reason":"string"}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, system: SUGGEST_SONGS_SYSTEM,
        messages: [{ role: 'user', content: userContent }] }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '(unreadable)');
      console.error('suggest-songs Anthropic error:', { status: response.status, body: errBody.slice(0, 500) });
      return res.status(502).json({ error: 'AI service error', detail: `Anthropic ${response.status}` });
    }
    const data    = await response.json();
    const rawText = data.content?.[0]?.text ?? '';
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
    } catch {
      console.error('suggest-songs parse error:', rawText.slice(0, 200));
      return res.status(500).json({ error: 'Failed to parse AI response. Try again.' });
    }
    if (!Array.isArray(parsed.suggestions))
      return res.status(500).json({ error: 'Unexpected AI response format.' });
    res.json({ suggestions: parsed.suggestions });
  } catch (err) {
    console.error('suggest-songs error:', {
      message: err.message,
      stack: err.stack,
      response: err.response?.data,
    });
    res.status(500).json({ error: err.message });
  }
});

// ── Chord simplification (triad extractor) ────────────────────────────────────
function simplifyToTriad(chord) {
  const match = chord.match(/^([A-G][#b]?)(m(?!aj)|dim|aug)?/);
  if (!match) return null;
  const root    = match[1];
  const quality = match[2] === 'aug' ? '' : (match[2] || '');
  return root + quality;
}

function simplifyProgression(chords) {
  if (!Array.isArray(chords)) return [];
  return chords
    .map(simplifyToTriad)
    .filter(Boolean)
    .filter((ch, i, arr) => ch !== arr[i - 1]);
}

// ── /api/sound-like ──────────────────────────────────────────────────────────
const SOUND_LIKE_SYSTEM =
  'You are a music theory expert and songwriter who can translate emotional and stylistic ' +
  'descriptions into chord progressions. You understand how chord choices create specific ' +
  'moods and sounds across genres. ' +
  'Always respond with valid JSON only. No markdown, no explanation outside the JSON.';

app.post('/api/sound-like', async (req, res) => {
  const ip = req.ip;
  if (!checkRateLimit(ip, 'sound-like', 10)) {
    return res.status(429).json({ error: "You've made a lot of requests. Try again in an hour." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server' });

  const { prompt, currentKey } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length === 0 || prompt.length > 200)
    return res.status(400).json({ error: 'Prompt required (max 200 chars)' });

  const safePrompt = String(prompt).replace(/[<>]/g, '').slice(0, 200);
  const safeKey    = currentKey && VALID_NOTES.has(String(currentKey)) ? String(currentKey) : null;

  const userContent =
    `A musician wants a chord progression that sounds like: '${safePrompt}'\n` +
    (safeKey ? `They are working in the key of ${safeKey}.\n` : '') +
    `\nSuggest 1-2 chord progressions that capture this feel. ` +
    `For each, explain in 2-3 plain English sentences why these chords create that sound. ` +
    `Be conversational and specific — mention the emotional quality, any famous songs that use it, ` +
    `and what makes it work.\n\n` +
    `Return this exact JSON:\n` +
    `{"progressions":[{"title":"string","key":"string","keyType":"major","chords":["string"],"nns":["string"],"explanation":"string"}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: SOUND_LIKE_SYSTEM,
        messages: [{ role: 'user', content: userContent }] }),
    });

    if (!response.ok) return res.status(502).json({ error: 'AI service error' });
    const data    = await response.json();
    const rawText = data.content?.[0]?.text ?? '';
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
    } catch {
      console.error('sound-like parse error:', rawText.slice(0, 200));
      return res.status(500).json({ error: 'Failed to parse AI response. Try again.' });
    }
    if (!Array.isArray(parsed.progressions))
      return res.status(500).json({ error: 'Unexpected AI response format.' });
    const safeProgressions = parsed.progressions.map(prog => ({
      ...prog,
      chords: Array.isArray(prog.chords) ? simplifyProgression(prog.chords) : [],
    }));
    res.json({ progressions: safeProgressions });
  } catch (err) {
    console.error('sound-like error:', err.message);
    res.status(500).json({ error: err.message });
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
