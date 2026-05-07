# Security Notes

## Known Issues

### esbuild moderate CVE (GHSA-67mh-4wv8-2f99)
- **Affects:** Development server only (`vite dev`)
- **Production impact:** None — esbuild is a dev dependency used only for bundling/HMR
- **Details:** esbuild ≤0.24.2 allows any website to send requests to the dev server and read responses
- **Fix available:** `npm audit fix --force` would upgrade to Vite 8 (breaking change — not yet done)
- **Workaround:** Never expose the dev server to a public network; always run `vite dev` on localhost only
- **Status:** Will resolve when Vite publishes a non-breaking esbuild update

## Resolved Issues (this session)

- **FIX 1** — DOMPurify now applied to all user text fields before Supabase writes (Gig.vue, Explore.vue, Play.vue)
- **FIX 2** — BPM, chord chart, title, and artist validated server-side before any DB write
- **FIX 3** — CSP and security headers added to app.yaml (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, Content-Security-Policy)
- **FIX 4** — Bundle split into logical chunks (vue-vendor, vuetify, supabase, audio, utils) via rollupOptions.manualChunks
- **FIX 5** — Husky pre-commit hook configured to block accidental API key commits and run lint
- **FIX 6** — /api/explain system prompt hardcoded server-side; client can no longer inject arbitrary system prompts; rate limit tightened to 10 req/hour/IP; only known fields accepted
- **FIX 7** — Session refresh on tab visibility change; SIGNED_OUT event clears cached auth state in App.vue

## Supabase RLS Reminder

Ensure Row Level Security is enabled on all tables (`songs`, `setlists`, `setlist_songs`, `practice_sessions`) with policies that restrict reads/writes to `auth.uid() = user_id`.
