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

// Simple in-memory rate limiter: 20 requests per IP per minute
const _rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const WINDOW_MS = 60_000;
  const MAX_REQUESTS = 20;
  let entry = _rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + WINDOW_MS };
  }
  entry.count++;
  _rateLimitMap.set(ip, entry);
  return entry.count > MAX_REQUESTS;
}

// Proxy for Anthropic
app.post('/api/explain', async (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  const { messages, system } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

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
        system,
        messages
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
