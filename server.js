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

// Hardcoded system prompt — not configurable by client
const EXPLANATION_SYSTEM_PROMPT =
  'You are a knowledgeable musician talking to a friend — not a professor writing a textbook. ' +
  'When someone shows you a chord progression, explain in 2–4 warm, conversational sentences ' +
  'why it sounds the way it does: the emotional feel, the tension and resolution, or why it\'s ' +
  'satisfying. Mention the key. Drop theory terms only if you immediately explain them in plain words.';

const VALID_NOTES = new Set(['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']);
const VALID_CHORD_RE = /^[A-G][#b]?(m|maj|dim|aug|sus[24]?|add\d{1,2})?$/;

// Per-IP rate limiter: 10 requests per hour
const _rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 10;
  const record = _rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count++;
  _rateLimitMap.set(ip, record);
  return record.count <= maxRequests;
}

// Proxy for Anthropic — server controls the system prompt
app.post('/api/explain', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // Only accept known fields; reject anything extra
  const { chords, key, userMessage } = req.body;
  const allowedKeys = new Set(['chords', 'key', 'userMessage']);
  if (Object.keys(req.body).some(k => !allowedKeys.has(k))) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Validate chords array
  if (!Array.isArray(chords) || chords.length === 0 || chords.length > 16) {
    return res.status(400).json({ error: 'Invalid chords' });
  }
  if (chords.some(c => typeof c !== 'string' || !VALID_CHORD_RE.test(c.trim()))) {
    return res.status(400).json({ error: 'Invalid chord value' });
  }

  // Validate key (optional)
  if (key !== null && key !== undefined && !VALID_NOTES.has(String(key))) {
    return res.status(400).json({ error: 'Invalid key' });
  }

  // Build user message from structured data only
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
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        system: EXPLANATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
